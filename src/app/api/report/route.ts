import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Trade {
  stock_code: string;
  stock_name: string;
  type: "buy" | "sell";
  quantity: number;
  total_amount: number;
}

function calcMovingAverage(trades: Trade[]) {
  let qty = 0;
  let costBasis = 0;

  for (const t of trades) {
    if (t.type === "buy") {
      costBasis += t.total_amount;
      qty += t.quantity;
    } else {
      if (qty > 0) {
        const avgCost = costBasis / qty;
        costBasis -= t.quantity * avgCost;
        qty -= t.quantity;
      }
    }
  }

  if (qty <= 0) return null;

  return {
    quantity: qty,
    total_cost: Math.round(costBasis * 100) / 100,
    avg_cost: Math.round((costBasis / qty) * 100) / 100,
  };
}

export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = request.nextUrl;
  const month = searchParams.get("month");

  const allTrades = db
    .prepare(
      `SELECT stock_code, stock_name, type, quantity, total_amount
       FROM transactions
       ORDER BY date ASC, id ASC`
    )
    .all() as Trade[];

  const tradesByStock = new Map<string, Trade[]>();
  for (const t of allTrades) {
    const list = tradesByStock.get(t.stock_code) || [];
    list.push(t);
    tradesByStock.set(t.stock_code, list);
  }

  const holdingsMap = new Map<
    string,
    { stock_code: string; stock_name: string; quantity: number; total_cost: number; avg_cost: number }
  >();
  for (const [code, trades] of tradesByStock) {
    const h = calcMovingAverage(trades);
    if (h) {
      holdingsMap.set(code, {
        stock_code: code,
        stock_name: trades[0].stock_name,
        ...h,
      });
    }
  }

  const balanceRow = db.prepare("SELECT value FROM config WHERE key = 'settlement_balance'").get() as {
    value: string;
  };
  const settlementBalance = parseFloat(balanceRow?.value || "0");

  const feeDiscountRow = db.prepare("SELECT value FROM config WHERE key = 'fee_discount'").get() as {
    value: string;
  } | undefined;
  const feeDiscount = parseFloat(feeDiscountRow?.value || "0.35");

  const prices = db.prepare("SELECT * FROM price_cache").all() as {
    stock_code: string;
    current_price: number;
    previous_close: number | null;
    change_percent: number | null;
    updated_at: string;
  }[];
  const priceMap = new Map(prices.map((p) => [p.stock_code, p]));

  const dividends = db.prepare("SELECT stock_code, COALESCE(SUM(amount), 0) AS total_dividend FROM dividend_records GROUP BY stock_code").all() as {
    stock_code: string;
    total_dividend: number;
  }[];
  const dividendMap = new Map(dividends.map((d) => [d.stock_code, d.total_dividend]));

  function isETF(code: string): boolean {
    return code.startsWith("00");
  }

  const result = [...holdingsMap.values()].map((h) => {
    const cached = priceMap.get(h.stock_code);
    return {
      stock_code: h.stock_code,
      stock_name: h.stock_name,
      quantity: h.quantity,
      avg_cost: h.avg_cost,
      total_cost: h.total_cost,
      cached_price: cached?.current_price ?? null,
      previous_close: cached?.previous_close ?? null,
      change_percent: cached?.change_percent ?? null,
      price_updated_at: cached?.updated_at ?? null,
      is_etf: isETF(h.stock_code),
      total_dividend: dividendMap.get(h.stock_code) ?? 0,
    };
  });

  let dateFilter = "";
  const params: unknown[] = [];
  if (month) {
    dateFilter = "WHERE strftime('%Y-%m', date) = ?";
    params.push(month);
  }

  const monthlySummary = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'buy' THEN total_amount ELSE 0 END), 0) AS total_buy,
        COALESCE(SUM(CASE WHEN type = 'sell' THEN total_amount ELSE 0 END), 0) AS total_sell,
        COALESCE(SUM(fee), 0) AS total_fee,
        COALESCE(SUM(tax), 0) AS total_tax
      FROM transactions
      ${dateFilter}`
    )
    .get(...params) as {
    total_buy: number;
    total_sell: number;
    total_fee: number;
    total_tax: number;
  };

  return NextResponse.json({
    month: month || "all",
    generated_at: new Date().toISOString(),
    holdings: result,
    settlement_balance: settlementBalance,
    fee_discount: feeDiscount,
    monthly: {
      total_buy: Math.round(monthlySummary.total_buy * 100) / 100,
      total_sell: Math.round(monthlySummary.total_sell * 100) / 100,
      total_fee: Math.round(monthlySummary.total_fee * 100) / 100,
      total_tax: Math.round(monthlySummary.total_tax * 100) / 100,
    },
  });
}
