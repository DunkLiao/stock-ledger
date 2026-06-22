"use client";

import { useEffect, useState, useCallback } from "react";

interface Holding {
  stock_code: string;
  stock_name: string;
  quantity: number;
  avg_cost: number;
  total_cost: number;
  cached_price: number | null;
  previous_close: number | null;
  change_percent: number | null;
  price_updated_at: string | null;
  is_etf: boolean;
  total_dividend: number;
}

interface DashboardData {
  holdings: Holding[];
  settlement_balance: number;
  fee_discount: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshedPrices, setRefreshedPrices] = useState<Record<string, number>>({});
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editSettings, setEditSettings] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");

  const fetchData = useCallback(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d: DashboardData) => {
        setData(d);
        setBalanceInput(String(d.settlement_balance));
        setDiscountInput(String(d.fee_discount));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshPrices = async () => {
    if (!data?.holdings.length) return;
    setRefreshing(true);
    try {
      const codes = data.holdings.map((h) => h.stock_code).join(",");
      const res = await fetch(`/api/stock-price?codes=${codes}`);
      const json = await res.json();
      if (json.prices) {
        setRefreshedPrices((prev) => {
          const next = { ...prev };
          for (const p of json.prices) {
            if (p.current_price != null) {
              next[p.stock_code] = p.current_price;
            }
          }
          return next;
        });
        setManualPrices({});
      }
    } finally {
      setRefreshing(false);
      fetchData();
    }
  };

  const saveSettings = async () => {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settlement_balance: balanceInput, fee_discount: discountInput }),
    });
    setEditSettings(false);
    fetchData();
  };

  const updatePrice = (code: string, price: number) => {
    setManualPrices((prev) => ({ ...prev, [code]: price }));
  };

  if (loading) {
    return <div className="text-center py-12 text-zinc-500">載入中...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-red-500">載入失敗</div>;
  }

  const holdings = data.holdings || [];
  const holdingRows = holdings.map((h) => {
    const manualPrice = manualPrices[h.stock_code];
    const refreshedPrice = refreshedPrices[h.stock_code];
    const cp = manualPrice ?? refreshedPrice ?? h.cached_price ?? 0;
    const marketValue = cp * h.quantity;
    const sellFeeRate = 0.001425 * data.fee_discount;
    const sellFee = marketValue * sellFeeRate;
    const sellTaxRate = h.is_etf ? 0.001 : 0.003;
    const sellTax = marketValue * sellTaxRate;
    const estimatedRevenue = marketValue - sellFee - sellTax;
    const estimatedPL = estimatedRevenue + h.total_dividend - h.total_cost;
    const isManual = manualPrice != null;
    const changePct = h.change_percent;

    return {
      h,
      cp,
      marketValue,
      estimatedRevenue,
      estimatedPL,
      isManual,
      changePct,
    };
  });
  const totalMarketValue = holdingRows.reduce((sum, row) => sum + row.marketValue, 0);
  const totalEstRevenue = holdingRows.reduce((sum, row) => sum + row.estimatedRevenue, 0);
  const totalEstPL = holdingRows.reduce((sum, row) => sum + row.estimatedPL, 0);
  const totalAssets = data.settlement_balance + totalMarketValue;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">儀表板</h1>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">帳戶總覽</h2>
          <button
            onClick={() => {
              setEditSettings(!editSettings);
              setBalanceInput(String(data.settlement_balance));
              setDiscountInput(String(data.fee_discount));
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            設定
          </button>
        </div>
        {editSettings && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-zinc-700 w-24">交割戶餘額：</label>
              <input
                type="number"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="px-3 py-1.5 border border-zinc-300 rounded text-sm w-40"
              />
              <span className="text-xs text-zinc-500">(登打銀行實際餘額)</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-zinc-700 w-24">手續費折扣：</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="px-3 py-1.5 border border-zinc-300 rounded text-sm w-40"
              />
              <span className="text-xs text-zinc-500">
                (例: 3.5折 = 0.35)
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={saveSettings}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                儲存
              </button>
              <button
                onClick={() => setEditSettings(false)}
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                取消
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-zinc-500">交割戶餘額</span>
            <p className="text-xl font-bold">
              ${data.settlement_balance.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-sm text-zinc-500">總資產</span>
            <p className="text-xl font-bold text-blue-600">
              ${Math.round(totalAssets).toLocaleString()}
            </p>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-3">
          總資產 = 交割戶餘額 + 持股市值(${Math.round(totalMarketValue).toLocaleString()})
        </p>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">目前股票庫存及損益</h2>
          {holdings.length > 0 && (
            <button
              onClick={refreshPrices}
              disabled={refreshing}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? "更新中..." : "更新股價"}
            </button>
          )}
        </div>
        {holdings.length === 0 ? (
          <p className="text-zinc-500">尚無庫存</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="pb-2 pr-2">代碼</th>
                  <th className="pb-2 pr-2">名稱</th>
                  <th className="pb-2 pr-2 text-right">股數</th>
                  <th className="pb-2 pr-2 text-right">平均成本</th>
                  <th className="pb-2 pr-2 text-right">投入金額</th>
                  <th className="pb-2 pr-2 text-right">現價</th>
                  <th className="pb-2 pr-2 text-right">漲跌</th>
                  <th className="pb-2 pr-2 text-right">已領取股息</th>
                  <th className="pb-2 pr-2 text-right">預估收入</th>
                  <th className="pb-2 pr-2 text-right">預估損益</th>
                </tr>
              </thead>
              <tbody>
                {holdingRows.map(({ h, cp, estimatedRevenue, estimatedPL, isManual, changePct }) => {
                  return (
                    <tr key={h.stock_code} className="border-b border-zinc-100">
                      <td className="py-2 pr-2 font-mono">{h.stock_code}</td>
                      <td className="py-2 pr-2">
                        {h.stock_name}
                        {h.is_etf && (
                          <span className="ml-1 text-xs text-blue-500 font-medium">ETF</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right">{h.quantity.toLocaleString()}</td>
                      <td className="py-2 pr-2 text-right">${h.avg_cost.toFixed(2)}</td>
                      <td className="py-2 pr-2 text-right">${h.total_cost.toLocaleString()}</td>
                      <td className="py-2 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={cp || ""}
                            placeholder="輸入現價"
                            className="w-24 px-2 py-1 border border-zinc-300 rounded text-right text-sm"
                            onChange={(e) => updatePrice(h.stock_code, parseFloat(e.target.value) || 0)}
                          />
                          {!isManual && h.price_updated_at && (
                            <span
                              className="text-xs text-zinc-400 cursor-help"
                              title={`更新時間: ${h.price_updated_at}`}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`py-2 pr-2 text-right ${
                          changePct != null
                            ? changePct > 0
                              ? "text-red-600"
                              : changePct < 0
                              ? "text-green-600"
                              : "text-zinc-500"
                            : "text-zinc-400"
                        }`}
                      >
                        {changePct != null
                          ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%`
                          : "-"}
                      </td>
                      <td className="py-2 pr-2 text-right text-zinc-500">
                        ${Math.round(h.total_dividend).toLocaleString()}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        ${Math.round(estimatedRevenue).toLocaleString()}
                      </td>
                      <td
                        className={`py-2 pr-2 text-right font-medium ${
                          estimatedPL >= 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {estimatedPL >= 0 ? "+" : ""}${Math.round(Math.abs(estimatedPL)).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={8} className="pt-3 text-right">
                    合計：
                  </td>
                  <td className="pt-3 text-right">
                    ${Math.round(totalEstRevenue).toLocaleString()}
                  </td>
                  <td
                    className={`pt-3 text-right ${
                      totalEstPL >= 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {totalEstPL >= 0 ? "+" : ""}${Math.round(Math.abs(totalEstPL)).toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <p className="text-xs text-zinc-400 mt-3">
              預估收入 = 市價 − 賣出手續費({(0.1425 * data.fee_discount).toFixed(4)}%) − 證交稅({data.fee_discount === 0.35 ? "股票0.3% / ETF0.1%" : "股票0.3%"})　｜　預估損益 = 預估收入 + 已領取股息 − 投資成本
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
