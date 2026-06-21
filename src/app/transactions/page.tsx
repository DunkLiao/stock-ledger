"use client";

import { useEffect, useState, useCallback } from "react";

interface Transaction {
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

const emptyForm = {
  date: "",
  stock_code: "",
  stock_name: "",
  type: "buy" as "buy" | "sell",
  quantity: 0,
  price: 0,
  fee: 0,
  tax: 0,
  total_amount: 0,
  note: "",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [monthFilter, setMonthFilter] = useState("");

  const fetchTransactions = useCallback(() => {
    const url = monthFilter ? `/api/transactions?month=${monthFilter}` : "/api/transactions";
    fetch(url)
      .then((r) => r.json())
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [monthFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const calcTotal = (type: string, qty: number, price: number, fee: number, tax: number) => {
    const gross = qty * price;
    if (type === "buy") {
      return gross + fee;
    }
    return gross - fee - tax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = calcTotal(form.type, form.quantity, form.price, form.fee, form.tax);
    const body = { ...form, total_amount: Math.round(total * 100) / 100 };

    const url = editingId ? `/api/transactions/${editingId}` : "/api/transactions";
    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchTransactions();
  };

  const handleEdit = (tx: Transaction) => {
    setForm({
      date: tx.date,
      stock_code: tx.stock_code,
      stock_name: tx.stock_name,
      type: tx.type,
      quantity: tx.quantity,
      price: tx.price,
      fee: tx.fee,
      tax: tx.tax,
      total_amount: tx.total_amount,
      note: tx.note,
    });
    setEditingId(tx.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除這筆交易？")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    fetchTransactions();
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => {
      const next: typeof form = { ...prev, [field]: value };
      if (["type", "quantity", "price", "fee", "tax"].includes(field)) {
        next.total_amount = Math.round(calcTotal(next.type, next.quantity, next.price, next.fee, next.tax) * 100) / 100;
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">交易紀錄</h1>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          新增交易
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "編輯交易" : "新增交易"}
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
                <label className="block text-sm text-zinc-600 mb-1">類型</label>
                <select
                  value={form.type}
                  onChange={(e) => updateField("type", e.target.value)}
                  className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm"
                >
                  <option value="buy">買進</option>
                  <option value="sell">賣出</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-zinc-600 mb-1">股數</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={form.quantity || ""}
                    onChange={(e) => updateField("quantity", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-600 mb-1">單價</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.price || ""}
                    onChange={(e) => updateField("price", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-zinc-600 mb-1">手續費</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.fee || ""}
                    onChange={(e) => updateField("fee", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-600 mb-1">
                    交易稅 {form.type === "sell" ? "(賣出)" : ""}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.tax || ""}
                    onChange={(e) => updateField("tax", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-zinc-300 rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-600 mb-1">交割總金額 (自動計算)</label>
                <input
                  type="number"
                  readOnly
                  value={form.total_amount || ""}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded text-sm bg-zinc-50 text-zinc-600"
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
                  <th className="px-4 py-2">類型</th>
                  <th className="px-4 py-2 text-right">股數</th>
                  <th className="px-4 py-2 text-right">單價</th>
                  <th className="px-4 py-2 text-right">手續費</th>
                  <th className="px-4 py-2 text-right">交易稅</th>
                  <th className="px-4 py-2 text-right">總金額</th>
                  <th className="px-4 py-2">備註</th>
                  <th className="px-4 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-zinc-500">
                      尚無交易紀錄
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="px-4 py-2">{tx.date}</td>
                      <td className="px-4 py-2 font-mono">{tx.stock_code}</td>
                      <td className="px-4 py-2">{tx.stock_name}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            tx.type === "buy"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {tx.type === "buy" ? "買進" : "賣出"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{tx.quantity.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">${tx.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">${tx.fee.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">${tx.tax.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        ${tx.total_amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-zinc-500 text-xs">{tx.note}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="text-blue-600 hover:underline text-xs mr-2"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
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
