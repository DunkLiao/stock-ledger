"use client";

import { useEffect, useState, useCallback } from "react";

interface DividendRecord {
  id: number;
  date: string;
  stock_code: string;
  stock_name: string;
  amount: number;
  note: string;
}

const emptyForm = {
  date: "",
  stock_code: "",
  stock_name: "",
  amount: 0,
  note: "",
};

export default function DividendsPage() {
  const [records, setRecords] = useState<DividendRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [monthFilter, setMonthFilter] = useState("");

  const fetchRecords = useCallback(() => {
    const url = monthFilter ? `/api/dividends?month=${monthFilter}` : "/api/dividends";
    fetch(url)
      .then((r) => r.json())
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [monthFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { ...form, amount: Math.round(form.amount * 100) / 100 };

    const url = editingId ? `/api/dividends/${editingId}` : "/api/dividends";
    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchRecords();
  };

  const handleEdit = (record: DividendRecord) => {
    setForm({
      date: record.date,
      stock_code: record.stock_code,
      stock_name: record.stock_name,
      amount: record.amount,
      note: record.note,
    });
    setEditingId(record.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除此筆股利記錄？交割戶餘額將同步扣回。")) return;
    await fetch(`/api/dividends/${id}`, { method: "DELETE" });
    fetchRecords();
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">股利領息</h1>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          新增股利
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-zinc-600">月份篩選：</label>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => {
            setMonthFilter(e.target.value);
            setLoading(true);
          }}
          className="px-3 py-1.5 border border-zinc-300 rounded text-sm"
        />
        {monthFilter && (
          <button
            onClick={() => {
              setMonthFilter("");
              setLoading(true);
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            清除
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "編輯股利" : "新增股利"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-600 mb-1">日期</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-zinc-600 mb-1">股票代碼</label>
                  <input
                    type="text"
                    required
                    value={form.stock_code}
                    onChange={(e) => updateField("stock_code", e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-600 mb-1">股票名稱</label>
                  <input
                    type="text"
                    value={form.stock_name}
                    onChange={(e) => updateField("stock_name", e.target.value)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-600 mb-1">股利金額</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.amount || ""}
                  onChange={(e) => updateField("amount", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 mb-1">備註</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => updateField("note", e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  {editingId ? "更新" : "新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-zinc-500">載入中...</div>
      ) : (
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-left text-zinc-500">
                  <th className="px-4 py-2">日期</th>
                  <th className="px-4 py-2">代碼</th>
                  <th className="px-4 py-2">名稱</th>
                  <th className="px-4 py-2 text-right">金額</th>
                  <th className="px-4 py-2">備註</th>
                  <th className="px-4 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      尚無股利記錄
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="px-4 py-2">{r.date}</td>
                      <td className="px-4 py-2 font-mono">{r.stock_code}</td>
                      <td className="px-4 py-2">{r.stock_name}</td>
                      <td className="px-4 py-2 text-right font-medium text-green-600">
                        ${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-zinc-500 text-xs">{r.note}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleEdit(r)}
                          className="text-blue-600 hover:underline text-xs mr-2"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
