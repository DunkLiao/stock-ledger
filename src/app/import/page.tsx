"use client";

import { useState } from "react";

export default function ImportPage() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`成功匯入 ${data.imported} 筆交易紀錄`);
      } else {
        setError(data.error || "匯入失敗");
      }
    } catch {
      setError("匯入失敗，請檢查檔案格式");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">匯入 CSV</h1>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold mb-2">CSV 格式說明</h2>
        <p className="text-sm text-zinc-600 mb-4">
          支援中文或英文欄位名稱，CSV 檔案第一列為標題列。
        </p>
        <div className="bg-zinc-50 rounded p-4 text-sm font-mono text-zinc-700 mb-4 overflow-x-auto">
          <p>日期,股票代碼,股票名稱,類型,股數,單價,手續費,交易稅,總金額,備註</p>
          <p className="text-zinc-400 mt-2">
            # 或英文欄位：date,stock_code,stock_name,type,quantity,price,fee,tax,total_amount,note
          </p>
          <p className="text-zinc-400 mt-1">
            # 類型欄位：&quot;買進&quot; / &quot;賣出&quot; 或 &quot;buy&quot; / &quot;sell&quot;
          </p>
        </div>

        <h3 className="text-md font-semibold mb-3">上傳 CSV 檔案</h3>
        <div className="flex items-center gap-4">
          <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm cursor-pointer">
            {importing ? "匯入中..." : "選擇檔案"}
            <input
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
              disabled={importing}
            />
          </label>
        </div>

        {result && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            {result}
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
