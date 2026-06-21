"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PrintPreviewModal from "@/components/PrintPreviewModal";

interface ReportData {
  month: string;
  generated_at: string;
  holdings: Holding[];
  settlement_balance: number;
  fee_discount: number;
  monthly: MonthlyData;
}

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

interface MonthlyData {
  total_buy: number;
  total_sell: number;
  total_fee: number;
  total_tax: number;
}

interface PrecomputedRow {
  cp: number;
  marketValue: number;
  sellFee: number;
  sellTax: number;
  estimatedRevenue: number;
  estimatedPL: number;
}

interface ReportTotals {
  totalMarketValue: number;
  totalEstRevenue: number;
  totalEstPL: number;
  totalAssets: number;
}

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

function ReportContent({
  data,
  precomputed,
  totals,
  variant,
  genDateStr,
}: {
  data: ReportData;
  precomputed: PrecomputedRow[];
  totals: ReportTotals;
  variant: "screen" | "print";
  genDateStr: string;
}) {
  const isScreen = variant === "screen";

  return (
    <div>
      {!isScreen && (
        <div className="report-header" style={{ width: "100%", textAlign: "center", display: "block" }}>
          <h2 style={{ width: "100%", textAlign: "center", display: "block", margin: "0 auto" }}>
            股票交易月報表
          </h2>
          <p className="text-sm mt-1" style={{ width: "100%", textAlign: "center", display: "block" }}>
            {data.month} &nbsp;|&nbsp; 產生日期：{genDateStr}
          </p>
        </div>
      )}

      {/* Section 0: Asset Overview */}
      <div className={isScreen ? "mb-6" : "mb-10"}>
        <h3 className="text-lg font-semibold mb-3">一、帳戶總覽</h3>
        <div
          className={`grid grid-cols-2 gap-4 ${isScreen ? "max-w-sm" : "max-w-sm"}`}
        >
          <div>
            <span
              className={`text-sm ${isScreen ? "text-zinc-500" : "text-zinc-500 print:text-black"}`}
            >
              交割戶餘額
            </span>
            <p className="text-xl font-bold print:text-lg">
              {fmt(data.settlement_balance)}
            </p>
          </div>
          <div>
            <span
              className={`text-sm ${isScreen ? "text-zinc-500" : "text-zinc-500 print:text-black"}`}
            >
              總資產
            </span>
            <p
              className={`text-xl font-bold ${isScreen ? "text-blue-600" : "text-blue-600 print:text-blue-900"}`}
            >
              {fmt(Math.round(totals.totalAssets))}
            </p>
          </div>
        </div>
        <p
          className={`text-xs mt-3 ${isScreen ? "text-zinc-400" : "text-zinc-400 print:text-black"}`}
        >
          總資產 = 交割戶餘額 + 持股市值(
          {fmt(Math.round(totals.totalMarketValue))})
        </p>
      </div>

      {/* Section 1: Holdings with P&L */}
      <div className={isScreen ? "mb-6" : "mb-10"}>
        <h3 className="text-lg font-semibold mb-3">
          二、目前股票庫存及損益
        </h3>
        {data.holdings.length === 0 ? (
          <p className="text-zinc-500">尚無庫存</p>
        ) : (
          <div className={isScreen ? "overflow-x-auto" : ""}>
            <table className="w-full text-sm border-collapse print:text-[9pt]">
              <thead>
                <tr className="border-b-2 border-zinc-900 print:border-black text-left text-zinc-600 print:text-black">
                  <th className="py-2 pr-1">代碼</th>
                  <th className="py-2 pr-1">名稱</th>
                  <th className="py-2 pr-1 text-right tabular-nums">股數</th>
                  <th className="py-2 pr-1 text-right tabular-nums">平均成本</th>
                  <th className="py-2 pr-1 text-right tabular-nums">投入金額</th>
                  <th className="py-2 pr-1 text-right tabular-nums">現價</th>
                  <th className="py-2 pr-1 text-right tabular-nums">漲跌</th>
                  <th className="py-2 pr-1 text-right tabular-nums">利息</th>
                  <th className="py-2 pr-1 text-right tabular-nums">預估收入</th>
                  <th className="py-2 text-right tabular-nums">預估損益</th>
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h, i) => {
                  const p = precomputed[i];
                  return (
                    <tr
                      key={h.stock_code}
                      className="border-b border-zinc-200 print:border-black"
                    >
                      <td className="py-2 pr-1 font-mono tabular-nums">
                        {h.stock_code}
                      </td>
                      <td className="py-2 pr-1">
                        {h.stock_name}
                        {h.is_etf && (
                          <span className="ml-1 text-xs text-blue-500 font-medium">
                            ETF
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-1 text-right tabular-nums">
                        {h.quantity.toLocaleString()}
                      </td>
                      <td className="py-2 pr-1 text-right tabular-nums">
                        {fmt(h.avg_cost)}
                      </td>
                      <td className="py-2 pr-1 text-right tabular-nums">
                        {fmt(h.total_cost)}
                      </td>
                      <td className="py-2 pr-1 text-right tabular-nums">
                        {h.cached_price != null ? fmt(h.cached_price) : "—"}
                      </td>
                      <td
                        className={`py-2 pr-1 text-right tabular-nums ${
                          h.change_percent != null
                            ? h.change_percent > 0
                              ? "text-red-600 print:text-red-800"
                              : h.change_percent < 0
                              ? "text-green-600 print:text-green-800"
                              : "text-zinc-500 print:text-black"
                            : "text-zinc-400 print:text-black"
                        }`}
                      >
                        {h.change_percent != null
                          ? `${h.change_percent > 0 ? "+" : ""}${h.change_percent.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td className="py-2 pr-1 text-right tabular-nums">
                        {fmt(h.total_dividend)}
                      </td>
                      <td className="py-2 pr-1 text-right tabular-nums">
                        {fmt(Math.round(p.estimatedRevenue))}
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums font-medium ${
                          p.estimatedPL >= 0
                            ? "text-red-600 print:text-red-800"
                            : "text-green-600 print:text-green-800"
                        }`}
                      >
                        {p.estimatedPL >= 0 ? "+" : ""}
                        {fmt(Math.round(Math.abs(p.estimatedPL)))}
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
                  <td className="pt-3 text-right tabular-nums">
                    {fmt(Math.round(totals.totalEstRevenue))}
                  </td>
                  <td
                    className={`pt-3 text-right tabular-nums ${
                      totals.totalEstPL >= 0
                        ? "text-red-600 print:text-red-800"
                        : "text-green-600 print:text-green-800"
                    }`}
                  >
                    {totals.totalEstPL >= 0 ? "+" : ""}
                    {fmt(Math.round(Math.abs(totals.totalEstPL)))}
                  </td>
                </tr>
              </tfoot>
            </table>
            <p
              className={`text-xs ${isScreen ? "text-zinc-400 mt-3" : "text-zinc-400 print:text-black mt-4 mb-2"}`}
            >
              預估收入 = 市價 − 賣出手續費({(0.1425 * data.fee_discount).toFixed(4)}
              %) − 證交稅(股票0.3% / ETF0.1%)　｜　預估損益 = 預估收入 + 利息 −
              投資成本
            </p>
          </div>
        )}
      </div>

      {/* Section 2: Monthly Balance */}
      <div className={isScreen ? "mb-6" : "mb-10"}>
        <h3 className="text-lg font-semibold mb-3">
          三、本月股票交割帳戶餘額
        </h3>
        <table className="w-full max-w-xs text-sm border-collapse print:text-[9pt]">
          <tbody>
            <tr>
              <td className="py-1 pr-6 text-zinc-600 print:text-black">
                交割帳戶餘額
              </td>
              <td className="py-1 text-right tabular-nums font-medium">
                {fmt(data.settlement_balance)}
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="py-1">
                <hr className="border-zinc-300 print:border-black" />
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-6 text-zinc-600 print:text-black">
                本月買進金額
              </td>
              <td className="py-1 text-right tabular-nums">
                {fmt(data.monthly.total_buy)}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-6 text-zinc-600 print:text-black">
                本月賣出金額
              </td>
              <td className="py-1 text-right tabular-nums">
                {fmt(data.monthly.total_sell)}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-6 text-zinc-600 print:text-black">
                本月手續費
              </td>
              <td className="py-1 text-right tabular-nums">
                {fmt(data.monthly.total_fee)}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-6 text-zinc-600 print:text-black">
                本月交易稅
              </td>
              <td className="py-1 text-right tabular-nums">
                {fmt(data.monthly.total_tax)}
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="py-1">
                <hr className="border-zinc-300 print:border-black" />
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-6 font-semibold text-zinc-800 print:text-black">
                本月淨收付
              </td>
              <td className="py-1 text-right tabular-nums font-semibold">
                {fmt(
                  data.monthly.total_sell -
                    data.monthly.total_buy -
                    data.monthly.total_fee -
                    data.monthly.total_tax
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {!isScreen && (
        <div className="text-center text-xs text-zinc-500 mt-12 pt-4 pb-8 border-t border-zinc-300 print:border-black">
          產生時間：{genDateStr} — 股票記帳軟體
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const fetchReport = async () => {
    setLoading(true);
    const res = await fetch(`/api/report?month=${month}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  const genDateStr = data
    ? new Date(data.generated_at).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
      })
    : "";

  const holdings = data?.holdings || [];
  const precomputed: PrecomputedRow[] = holdings.map((h) => {
    const cp = h.cached_price || 0;
    const marketValue = cp * h.quantity;
    const sellFeeRate = 0.001425 * (data?.fee_discount || 0.35);
    const sellFee = marketValue * sellFeeRate;
    const sellTaxRate = h.is_etf ? 0.001 : 0.003;
    const sellTax = marketValue * sellTaxRate;
    const estimatedRevenue = marketValue - sellFee - sellTax;
    const estimatedPL = estimatedRevenue + h.total_dividend - h.total_cost;
    return { cp, marketValue, sellFee, sellTax, estimatedRevenue, estimatedPL };
  });

  const totals: ReportTotals = {
    totalMarketValue: precomputed.reduce((s, p) => s + p.marketValue, 0),
    totalEstRevenue: precomputed.reduce((s, p) => s + p.estimatedRevenue, 0),
    totalEstPL: precomputed.reduce((s, p) => s + p.estimatedPL, 0),
    totalAssets:
      (data?.settlement_balance || 0) +
      precomputed.reduce((s, p) => s + p.marketValue, 0),
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(() => {
    if (!data) return;
    setPdfGenerating(true);
  }, [data]);

  useEffect(() => {
    if (!pdfGenerating || !data) return;

    let cancelled = false;

    const generate = async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (cancelled || !pdfRef.current) return;

      try {
        const canvas = await html2canvas(pdfRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const pagePxHeight = (canvas.width / pageWidth) * pageHeight;
        const totalPages = Math.ceil(canvas.height / pagePxHeight);

        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();

          const y = page * pagePxHeight;
          const clipH = Math.min(pagePxHeight, canvas.height - y);

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.ceil(clipH);
          const ctx = pageCanvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            y,
            canvas.width,
            clipH,
            0,
            0,
            canvas.width,
            clipH
          );

          pdf.addImage(
            pageCanvas.toDataURL("image/png"),
            "PNG",
            0,
            0,
            pageWidth,
            (clipH / pagePxHeight) * pageHeight
          );
        }

        pdf.save(`\u6708\u5831\u8868_${data.month}.pdf`);
      } finally {
        if (!cancelled) setPdfGenerating(false);
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [pdfGenerating, data]);

  return (
    <div className="space-y-6">
      <style>{`@media print { @page { size: A4 landscape; } }`}</style>

      <h1 className="text-2xl font-bold text-zinc-900 print:hidden">月報表</h1>

      <div className="bg-white rounded-lg border border-zinc-200 p-6 print:hidden">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-sm text-zinc-600 mb-1">選擇月份</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-zinc-300 rounded text-sm"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 text-sm disabled:opacity-50"
          >
            {loading ? "載入中..." : "查詢"}
          </button>
          {data && (
            <>
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                預覽列印
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfGenerating}
                className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 text-sm disabled:opacity-50"
              >
                {pdfGenerating ? "產生中..." : "下載 PDF"}
              </button>
            </>
          )}
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <ReportContent
              data={data}
              precomputed={precomputed}
              totals={totals}
              variant="screen"
              genDateStr={genDateStr}
            />
          </div>
        </div>
      )}

      {!data && (
        <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center text-zinc-500">
          請選擇月份並點擊「查詢」查看報表
        </div>
      )}

      {showPreview && data && (
        <PrintPreviewModal
          onClose={() => setShowPreview(false)}
          onPrint={handlePrint}
          onDownloadPdf={handleDownloadPdf}
        >
          <ReportContent
            data={data}
            precomputed={precomputed}
            totals={totals}
            variant="print"
            genDateStr={genDateStr}
          />
        </PrintPreviewModal>
      )}

      {pdfGenerating && data && (
        <div
          ref={pdfRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "794px",
            backgroundColor: "#ffffff",
            padding: "42px 42px 84px 42px",
          }}
        >
          <style>{`
            * { line-height: 1.6 !important; }
            td, th { line-height: 1.5 !important; }
            .report-header, .report-header * {
              text-align: center !important;
              width: 100% !important;
              display: block !important;
            }
            .report-header {
              margin-bottom: 1.5rem !important;
            }
            .report-header h2 {
              font-size: 1.25rem !important;
              font-weight: 700 !important;
              margin: 0 auto 0.5rem auto !important;
            }
            .report-header p {
              font-size: 0.875rem !important;
              margin: 0 auto !important;
            }
            .text-center { text-align: center !important; }
            .text-zinc-900 { color: #18181b !important; }
            .text-zinc-800 { color: #27272a !important; }
            .text-zinc-600 { color: #52525b !important; }
            .text-zinc-500 { color: #71717a !important; }
            .text-zinc-400 { color: #a1a1aa !important; }
            .text-blue-600 { color: #2563eb !important; }
            .text-blue-500 { color: #3b82f6 !important; }
            .text-red-600 { color: #dc2626 !important; }
            .text-green-600 { color: #16a34a !important; }
            .print\\:text-black { color: #000 !important; }
            .print\\:text-red-800 { color: #991b1b !important; }
            .print\\:text-green-800 { color: #166534 !important; }
            .print\\:text-blue-900 { color: #1e3a5f !important; }
            .border-zinc-900 { border-color: #18181b !important; }
            .border-zinc-300 { border-color: #d4d4d8 !important; }
            .border-zinc-200 { border-color: #e4e4e7 !important; }
            .print\\:border-black { border-color: #000 !important; }
          `}</style>
          <ReportContent
            data={data}
            precomputed={precomputed}
            totals={totals}
            variant="print"
            genDateStr={genDateStr}
          />
        </div>
      )}
    </div>
  );
}
