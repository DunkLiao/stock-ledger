import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();
  const { date, stock_code, stock_name, type, quantity, price, fee, tax, total_amount, note } = body;

  const stmt = db.prepare(`
    UPDATE transactions SET
      date = ?, stock_code = ?, stock_name = ?, type = ?,
      quantity = ?, price = ?, fee = ?, tax = ?, total_amount = ?, note = ?
    WHERE id = ?
  `);

  const result = stmt.run(
    date, stock_code, stock_name || "", type,
    quantity, price, fee || 0, tax || 0, total_amount || 0, note || "",
    id
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const stmt = db.prepare("DELETE FROM transactions WHERE id = ?");
  const result = stmt.run(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
