import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  const db = getDb();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const { data, errors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    return NextResponse.json({ error: "CSV parse error", details: errors }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO transactions (date, stock_code, stock_name, type, quantity, price, fee, tax, total_amount, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows: Record<string, string>[]) => {
    let count = 0;
    for (const row of rows) {
      const date = row["日期"] || row["date"] || "";
      const stock_code = row["股票代碼"] || row["stock_code"] || "";
      const stock_name = row["股票名稱"] || row["stock_name"] || "";
      const typeRaw = (row["類型"] || row["type"] || "").toLowerCase();
      const type = typeRaw === "賣出" || typeRaw === "sell" ? "sell" : "buy";
      const quantity = parseInt(row["股數"] || row["quantity"] || "0", 10);
      const price = parseFloat(row["單價"] || row["price"] || "0");
      const fee = parseFloat(row["手續費"] || row["fee"] || "0");
      const tax = parseFloat(row["交易稅"] || row["tax"] || "0");
      const total_amount = parseFloat(row["總金額"] || row["total_amount"] || "0");
      const note = row["備註"] || row["note"] || "";

      if (!date || !stock_code || !quantity || !price) continue;

      stmt.run(date, stock_code, stock_name, type, quantity, price, fee, tax, total_amount, note);
      count++;
    }
    return count;
  });

  const count = insertMany(data as Record<string, string>[]);
  return NextResponse.json({ imported: count });
}
