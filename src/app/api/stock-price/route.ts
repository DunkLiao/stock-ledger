import { getDb } from "@/lib/db";
import { NextRequest } from "next/server";

const TWSE_API = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const codes = searchParams.get("codes");

  if (!codes) {
    return Response.json({ error: "Missing codes parameter" }, { status: 400 });
  }

  const codeList = [...new Set(codes.split(",").map((c) => c.trim()).filter(Boolean))];

  if (codeList.length === 0) {
    return Response.json({ error: "No valid codes" }, { status: 400 });
  }

  const queries = codeList.flatMap((c) => [`tse_${c}.tw`, `otc_${c}.tw`]).join("|");
  const url = `${TWSE_API}?ex_ch=${queries}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`TWSE API returned ${res.status}`);
    }

    const data = await res.json();
    const db = getDb();

    const priceMap = new Map<string, { price: number; prevClose: number | null; change: number | null }>();

    if (data.msgArray) {
      for (const item of data.msgArray) {
        const code = item.c;
        if (!code || !codeList.includes(code)) continue;

        const rawPrice = item.z;
        const price = parseFloat(rawPrice);
        const prevCloseRaw = item.y;
        const prevClose = prevCloseRaw ? parseFloat(prevCloseRaw) : null;

        if (isNaN(price)) continue;

        const change =
          prevClose && prevClose !== 0
            ? Math.round(((price - prevClose) / prevClose) * 10000) / 100
            : null;

        priceMap.set(code, { price, prevClose, change });

        db.prepare(
          `INSERT OR REPLACE INTO price_cache (stock_code, current_price, previous_close, change_percent, updated_at)
           VALUES (?, ?, ?, ?, datetime('now', 'localtime'))`
        ).run(code, price, prevClose, change);
      }
    }

    const results = codeList.map((code) => {
      const live = priceMap.get(code);
      if (live) {
        return {
          stock_code: code,
          current_price: live.price,
          previous_close: live.prevClose,
          change_percent: live.change,
          source: "live",
        };
      }
      const cached = db
        .prepare("SELECT * FROM price_cache WHERE stock_code = ?")
        .get(code) as {
        current_price: number;
        previous_close: number | null;
        change_percent: number | null;
        updated_at: string;
      } | undefined;
      if (cached) {
        return {
          stock_code: code,
          current_price: cached.current_price,
          previous_close: cached.previous_close,
          change_percent: cached.change_percent,
          source: "cache",
        };
      }
      return {
        stock_code: code,
        current_price: null,
        previous_close: null,
        change_percent: null,
        source: "not_found",
      };
    });

    return Response.json({ prices: results });
  } catch {
    const db = getDb();
    const results = codeList.map((code) => {
      const cached = db
        .prepare("SELECT * FROM price_cache WHERE stock_code = ?")
        .get(code) as {
        current_price: number;
        previous_close: number | null;
        change_percent: number | null;
        updated_at: string;
      } | undefined;
      if (cached) {
        return {
          stock_code: code,
          current_price: cached.current_price,
          previous_close: cached.previous_close,
          change_percent: cached.change_percent,
          source: "cache",
        };
      }
      return {
        stock_code: code,
        current_price: null,
        previous_close: null,
        change_percent: null,
        source: "not_found",
      };
    });

    return Response.json({
      prices: results,
      warning: "無法連線證交所，顯示快取資料",
    });
  }
}
