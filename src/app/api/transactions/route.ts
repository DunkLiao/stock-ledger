import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = request.nextUrl;
  const month = searchParams.get("month");

  let sql = "SELECT * FROM transactions";
  const params: unknown[] = [];

  if (month) {
    sql += " WHERE strftime('%Y-%m', date) = ?";
    params.push(month);
  }

  sql += " ORDER BY date DESC, id DESC";

  const stmt = db.prepare(sql);
  const transactions = stmt.all(...params);
  return NextResponse.json(transactions);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { date, stock_code, stock_name, type, quantity, price, fee, tax, total_amount, note } = body;

  if (!date || !stock_code || !type || !quantity || !price) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO transactions (date, stock_code, stock_name, type, quantity, price, fee, tax, total_amount, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    date,
    stock_code,
    stock_name || "",
    type,
    quantity,
    price,
    fee || 0,
    tax || 0,
    total_amount || 0,
    note || ""
  );

  return NextResponse.json({ id: result.lastInsertRowid });
}
