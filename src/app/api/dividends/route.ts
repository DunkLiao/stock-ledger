import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = request.nextUrl;
  const month = searchParams.get("month");

  let sql = "SELECT * FROM dividend_records";
  const params: unknown[] = [];

  if (month) {
    sql += " WHERE strftime('%Y-%m', date) = ?";
    params.push(month);
  }

  sql += " ORDER BY date DESC, id DESC";

  const stmt = db.prepare(sql);
  const records = stmt.all(...params);
  return NextResponse.json(records);
}

function updateStockDividends(db: ReturnType<typeof getDb>, stockCode: string) {
  const row = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM dividend_records WHERE stock_code = ?")
    .get(stockCode) as { total: number };
  db.prepare("INSERT OR REPLACE INTO stock_dividends (stock_code, total_dividend) VALUES (?, ?)").run(
    stockCode,
    row.total
  );
}

function adjustSettlementBalance(db: ReturnType<typeof getDb>, amount: number) {
  db.prepare(
    "UPDATE config SET value = CAST(CAST(value AS REAL) + ? AS TEXT) WHERE key = 'settlement_balance'"
  ).run(amount);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { date, stock_code, stock_name, amount, note } = body;

  if (!date || !stock_code || typeof amount !== "number") {
    return NextResponse.json({ error: "Missing required fields: date, stock_code, amount" }, { status: 400 });
  }

  const result = db
    .prepare("INSERT INTO dividend_records (date, stock_code, stock_name, amount, note) VALUES (?, ?, ?, ?, ?)")
    .run(date, stock_code, stock_name || "", amount, note || "");

  adjustSettlementBalance(db, amount);
  updateStockDividends(db, stock_code);

  return NextResponse.json({ id: result.lastInsertRowid });
}
