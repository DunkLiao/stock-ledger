import { getDb } from "@/lib/db";
import { calcMovingAverage } from "@/lib/holdings";
import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";

function csvResponse(csv: string, filename: string) {
  const body = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from(csv, "utf-8"),
  ]);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

const TX_FIELDS = ["id", "date", "stock_code", "stock_name", "type", "quantity", "price", "fee", "tax", "total_amount", "note"];
const HOLDING_FIELDS = ["stock_code", "stock_name", "quantity", "avg_cost", "total_cost", "total_dividend"];
const DIV_FIELDS = ["stock_code", "total_dividend"];
const CONFIG_FIELDS = ["key", "value"];

export async function GET(request: NextRequest) {
  const db = getDb();
  const type = request.nextUrl.searchParams.get("type") || "";

  switch (type) {
    case "transactions": {
      const rows = db.prepare("SELECT * FROM transactions ORDER BY date ASC, id ASC").all();
      const csv = Papa.unparse({ fields: TX_FIELDS, data: rows as Record<string, unknown>[] });
      return csvResponse(csv, "transactions.csv");
    }

    case "holdings": {
      const allTrades = db
        .prepare("SELECT stock_code, stock_name, type, quantity, total_amount FROM transactions ORDER BY date ASC, id ASC")
        .all() as { stock_code: string; stock_name: string; type: "buy" | "sell"; quantity: number; total_amount: number }[];

      const tradesByStock = new Map<string, typeof allTrades>();
      for (const t of allTrades) {
        const list = tradesByStock.get(t.stock_code) || [];
        list.push(t);
        tradesByStock.set(t.stock_code, list);
      }

      const dividends = db.prepare("SELECT stock_code, total_dividend FROM stock_dividends").all() as {
        stock_code: string; total_dividend: number;
      }[];
      const dividendMap = new Map(dividends.map((d) => [d.stock_code, d.total_dividend]));

      const holdings: Record<string, unknown>[] = [];
      for (const [code, trades] of tradesByStock) {
        const h = calcMovingAverage(trades);
        if (h) {
          holdings.push({
            stock_code: code,
            stock_name: trades[0].stock_name,
            quantity: h.quantity,
            avg_cost: h.avg_cost,
            total_cost: h.total_cost,
            total_dividend: dividendMap.get(code) ?? 0,
          });
        }
      }

      const csv = Papa.unparse({ fields: HOLDING_FIELDS, data: holdings });
      return csvResponse(csv, "holdings.csv");
    }

    case "dividends": {
      const rows = db.prepare("SELECT * FROM stock_dividends ORDER BY stock_code ASC").all();
      const csv = Papa.unparse({ fields: DIV_FIELDS, data: rows as Record<string, unknown>[] });
      return csvResponse(csv, "dividends.csv");
    }

    case "config": {
      const rows = db.prepare("SELECT * FROM config ORDER BY key ASC").all();
      const csv = Papa.unparse({ fields: CONFIG_FIELDS, data: rows as Record<string, unknown>[] });
      return csvResponse(csv, "config.csv");
    }

    default:
      return NextResponse.json({ error: "Invalid type. Use: transactions, holdings, dividends, config" }, { status: 400 });
  }
}
