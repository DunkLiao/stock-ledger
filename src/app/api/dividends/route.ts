import { getDb } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { stock_code, total_dividend } = body;

  if (!stock_code || typeof total_dividend !== "number") {
    return Response.json({ error: "Missing stock_code or total_dividend" }, { status: 400 });
  }

  db.prepare(
    `INSERT OR REPLACE INTO stock_dividends (stock_code, total_dividend) VALUES (?, ?)`
  ).run(stock_code, total_dividend);

  return Response.json({ success: true });
}
