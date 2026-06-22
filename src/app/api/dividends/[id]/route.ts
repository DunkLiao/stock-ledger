import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();
  const { date, stock_code, stock_name, amount, note } = body;

  const oldRecord = db.prepare("SELECT * FROM dividend_records WHERE id = ?").get(id) as {
    id: number;
    date: string;
    stock_code: string;
    stock_name: string;
    amount: number;
    note: string;
  } | undefined;

  if (!oldRecord) {
    return NextResponse.json({ error: "Dividend record not found" }, { status: 404 });
  }

  const stmt = db.prepare(
    "UPDATE dividend_records SET date = ?, stock_code = ?, stock_name = ?, amount = ?, note = ? WHERE id = ?"
  );
  const result = stmt.run(date, stock_code, stock_name || "", amount, note || "", id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Dividend record not found" }, { status: 404 });
  }

  const amountDiff = amount - oldRecord.amount;
  if (amountDiff !== 0) {
    adjustSettlementBalance(db, amountDiff);
  }

  updateStockDividends(db, oldRecord.stock_code);
  if (oldRecord.stock_code !== stock_code) {
    updateStockDividends(db, stock_code);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const record = db.prepare("SELECT * FROM dividend_records WHERE id = ?").get(id) as {
    id: number;
    stock_code: string;
    amount: number;
  } | undefined;

  if (!record) {
    return NextResponse.json({ error: "Dividend record not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM dividend_records WHERE id = ?").run(id);

  adjustSettlementBalance(db, -record.amount);
  updateStockDividends(db, record.stock_code);

  return NextResponse.json({ success: true });
}
