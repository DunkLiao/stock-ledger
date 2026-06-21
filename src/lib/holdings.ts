interface Trade {
  stock_code: string;
  stock_name: string;
  type: "buy" | "sell";
  quantity: number;
  total_amount: number;
}

export interface HoldingResult {
  quantity: number;
  total_cost: number;
  avg_cost: number;
}

export function calcMovingAverage(trades: Trade[]): HoldingResult | null {
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
