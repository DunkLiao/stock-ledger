export interface Transaction {
  id: number;
  date: string;
  stock_code: string;
  stock_name: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  tax: number;
  total_amount: number;
  note: string;
}

export interface Holding {
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_cost: number;
  total_cost: number;
}

export interface PriceCache {
  stock_code: string;
  current_price: number;
  previous_close: number | null;
  change_percent: number | null;
  updated_at: string;
}

export interface HoldingWithPrice extends Holding {
  cached_price: number | null;
  previous_close: number | null;
  change_percent: number | null;
  price_updated_at: string | null;
  is_etf: boolean;
  total_dividend: number;
}

export interface DashboardData {
  holdings: HoldingWithPrice[];
  settlement_balance: number;
  fee_discount: number;
}

export interface DividendRecord {
  id: number;
  date: string;
  stock_code: string;
  stock_name: string;
  amount: number;
  note: string;
}

export interface MonthlySummary {
  total_buy: number;
  total_sell: number;
  total_fee: number;
  total_tax: number;
  net_amount: number;
}
