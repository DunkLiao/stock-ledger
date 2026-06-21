import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM config").all() as {
    key: string;
    value: string;
  }[];
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const stmt = db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)");

  for (const [key, value] of Object.entries(body)) {
    stmt.run(key, String(value));
  }

  return NextResponse.json({ success: true });
}
