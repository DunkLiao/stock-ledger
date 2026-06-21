"use client";

import { useState } from "react";

export default function BackupPage() {
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleBackup = async () => {
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("備份失敗");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || "stock_booking_backup.db";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("備份下載失敗，請稍後再試");
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("確定要還原資料庫？\n\n現有資料庫會先自動備份，再以選擇的檔案取代。\n此操作無法復原，請確認後再執行。")) {
      e.target.value = "";
      return;
    }

    setRestoring(true);
    setRestoreResult(null);
    setRestoreError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/backup", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setRestoreResult(`還原成功！已自動備份為 ${data.backupPath}`);
      } else {
        setRestoreError(data.error || "還原失敗");
      }
    } catch {
      setRestoreError("還原失敗，請檢查檔案格式");
    } finally {
      setRestoring(false);
      e.target.value = "";
    }
  };

  const handleExportCsv = async (type: string) => {
    setExporting(type);
    try {
      const res = await fetch(`/api/export/csv?type=${type}`);
      if (!res.ok) throw new Error("匯出失敗");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || `${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("CSV 匯出失敗，請稍後再試");
    } finally {
      setExporting(null);
    }
  };

  const handleReset = async () => {
    const step1 = confirm("⚠️ 確定要重設資料庫？\n\n此操作會刪除所有交易紀錄、持股、股息及設定資料。\n系統會先自動備份，但資料無法自動還原。");
    if (!step1) return;

    const step2 = prompt("請輸入「我確定要重設」以確認操作：");
    if (step2 !== "我確定要重設") {
      alert("輸入不符，已取消重設。");
      return;
    }

    setResetting(true);
    setResetResult(null);
    setResetError(null);

    try {
      const res = await fetch("/api/backup", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setResetResult(`資料庫已重置。舊資料已備份為 ${data.backupPath}`);
      } else {
        setResetError(data.error || "重置失敗");
      }
    } catch {
      setResetError("重置失敗，請稍後再試");
    } finally {
      setResetting(false);
    }
  };

  const exportButtons = [
    { type: "transactions", label: "匯出交易記錄", desc: "下載所有買賣交易明細" },
    { type: "holdings", label: "匯出持倉明細", desc: "下載目前持倉、平均成本與股息" },
    { type: "dividends", label: "匯出股息資料", desc: "下載各股票累計股息" },
    { type: "config", label: "匯出系統設定", desc: "下載交割金與手續費折扣設定" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">備份管理</h1>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold mb-2">資料庫備份</h2>
        <p className="text-sm text-zinc-600 mb-4">
          將整個資料庫下載為 .db 檔案，可保存至本機作為備份。
        </p>
        <button
          onClick={handleBackup}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm cursor-pointer"
        >
          下載備份檔案
        </button>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold mb-2">資料庫還原</h2>
        <p className="text-sm text-zinc-600 mb-4">
          上傳 .db 備份檔以取代現有資料庫。還原前會自動備份現有資料庫，避免資料遺失。
        </p>
        <div className="flex items-center gap-4">
          <label className={`px-4 py-2 rounded-lg text-sm cursor-pointer text-white ${restoring ? "bg-zinc-400" : "bg-orange-600 hover:bg-orange-700"}`}>
            {restoring ? "還原中..." : "選擇備份檔案 (.db)"}
            <input
              type="file"
              accept=".db"
              onChange={handleRestore}
              className="hidden"
              disabled={restoring}
            />
          </label>
        </div>
        {restoreResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            {restoreResult}
          </div>
        )}
        {restoreError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {restoreError}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="text-lg font-semibold mb-2 text-red-700">重置資料庫</h2>
        <p className="text-sm text-zinc-600 mb-4">
          刪除所有資料，還原為全新空白資料庫。重置前會自動備份現有資料。
        </p>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm cursor-pointer disabled:opacity-50"
        >
          {resetting ? "重置中..." : "重置資料庫"}
        </button>
        {resetResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            {resetResult}
          </div>
        )}
        {resetError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {resetError}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold mb-2">資料匯出 CSV</h2>
        <p className="text-sm text-zinc-600 mb-4">
          將資料匯出為 CSV 檔案，可用於備份或匯入其他軟體。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exportButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => handleExportCsv(btn.type)}
              disabled={exporting !== null}
              className="flex flex-col items-start gap-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-lg hover:bg-zinc-100 text-left disabled:opacity-50"
            >
              <span className="text-sm font-medium text-zinc-800">
                {exporting === btn.type ? "匯出中..." : btn.label}
              </span>
              <span className="text-xs text-zinc-500">{btn.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
