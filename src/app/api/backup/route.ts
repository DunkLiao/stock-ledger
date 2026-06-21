import { getDb, closeDb, getDbPath } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_PATH = getDbPath();

function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function cleanupWalShm() {
  const walPath = DB_PATH + "-wal";
  const shmPath = DB_PATH + "-shm";
  try { if (fs.existsSync(walPath)) fs.unlinkSync(walPath); } catch {}
  try { if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath); } catch {}
}

export async function GET() {
  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json({ error: "Database file not found" }, { status: 404 });
  }

  const stats = fs.statSync(DB_PATH);
  const fileBuffer = fs.readFileSync(DB_PATH);
  const timestamp = getTimestamp();

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="stock_booking_backup_${timestamp}.db"`,
      "Content-Length": String(stats.size),
    },
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || !file.name.endsWith(".db")) {
    return NextResponse.json({ error: "請上傳有效的 .db 資料庫檔案" }, { status: 400 });
  }

  try {
    const timestamp = getTimestamp();
    const backupPath = path.join(process.cwd(), `stock_booking_backup_auto_${timestamp}.db`);

    closeDb();
    cleanupWalShm();

    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupPath);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(DB_PATH, buffer);

    getDb();

    return NextResponse.json({ success: true, backupPath: path.basename(backupPath) });
  } catch (e) {
    getDb();
    return NextResponse.json({ error: "還原失敗: " + (e as Error).message }, { status: 500 });
  }
}
