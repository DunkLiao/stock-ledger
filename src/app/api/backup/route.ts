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

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function removeWalShm() {
  for (const suffix of ["-wal", "-shm"]) {
    const p = DB_PATH + suffix;
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    } catch {
      // Best-effort: skip if file is still locked
    }
  }
}

export async function GET() {
  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json({ error: "Database file not found" }, { status: 404 });
  }

  // Flush WAL to main database file before reading
  const db = getDb();
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch {}

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
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "無法讀取上傳檔案，可能檔案過大或格式錯誤" },
      { status: 400 },
    );
  }

  const file = formData.get("file") as File | null;

  if (!file || !file.name.endsWith(".db")) {
    return NextResponse.json({ error: "請上傳有效的 .db 資料庫檔案" }, { status: 400 });
  }

  try {
    const timestamp = getTimestamp();
    const backupDir = path.dirname(DB_PATH);
    const backupPath = path.join(backupDir, `stock_booking_backup_auto_${timestamp}.db`);

    ensureDir(DB_PATH);
    closeDb();
    removeWalShm();

    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupPath);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(DB_PATH, buffer);

    // Verify file was written
    const written = fs.statSync(DB_PATH);
    if (written.size === 0) {
      throw new Error("寫入的資料庫檔案大小為 0，可能上傳不完整");
    }

    getDb();

    return NextResponse.json({
      success: true,
      backupPath: path.basename(backupPath),
      fileSize: written.size,
    });
  } catch (e) {
    // Try to reopen DB on error
    try { getDb(); } catch {}

    const message = e instanceof Error ? e.message : "未知錯誤";
    return NextResponse.json({ error: `還原失敗: ${message}` }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const backupDir = path.dirname(DB_PATH);
    const timestamp = getTimestamp();
    const backupPath = path.join(backupDir, `stock_booking_backup_auto_${timestamp}.db`);

    ensureDir(DB_PATH);

    // Backup current database before clearing
    const db = getDb();
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {}
    closeDb();
    removeWalShm();

    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupPath);
    }

    // Reopen and clear all data via SQL (avoids file lock issues on Windows)
    const freshDb = getDb();
    freshDb.exec(`
      DELETE FROM transactions;
      DELETE FROM price_cache;
      DELETE FROM dividend_records;
      DELETE FROM stock_dividends;
      DELETE FROM config;
      INSERT INTO config (key, value) VALUES ('settlement_balance', '0');
      INSERT INTO config (key, value) VALUES ('fee_discount', '0.35');
    `);

    return NextResponse.json({
      success: true,
      backupPath: path.basename(backupPath),
    });
  } catch (e) {
    try { getDb(); } catch {}
    const message = e instanceof Error ? e.message : "未知錯誤";
    return NextResponse.json({ error: `重置失敗: ${message}` }, { status: 500 });
  }
}
