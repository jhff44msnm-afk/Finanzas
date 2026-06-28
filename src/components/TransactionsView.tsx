"use client";

import { useState, useMemo } from "react";
import { Search, Pencil, Check, X, Filter } from "lucide-react";
import { useAppState, useAppDispatch } from "@/lib/store";
import { CATEGORIES, CATEGORY_COLORS } from "@/lib/categories";

export default function TransactionsView() {
  const { transactions } = useAppState();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount" | "balance">(
    "date"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let result = [...transactions];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.date.includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "All") {
      result = result.filter((t) => t.category === categoryFilter);
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date")
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortField === "amount") cmp = a.amount - b.amount;
      else cmp = a.balance - b.balance;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [transactions, search, categoryFilter, sortField, sortDir]);

  const handleSort = (field: "date" | "amount" | "balance") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const startEdit = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (tx) {
      setEditingId(id);
      setEditCategory(tx.category);
      setEditDescription(tx.description);
    }
  };

  const saveEdit = () => {
    if (!editingId) return;
    const tx = transactions.find((t) => t.id === editingId);
    if (tx) {
      dispatch({
        type: "UPDATE_TRANSACTION",
        payload: {
          ...tx,
          category: editCategory,
          description: editDescription,
        },
      });
    }
    setEditingId(null);
  };

  const totalExpenses = filtered
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome = filtered
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  if (transactions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No transactions yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Upload a bank statement to see your transactions here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Transactions</h2>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <span className="text-gray-500">
          {filtered.length} transactions
        </span>
        <span className="text-green-600 font-medium">
          Income: ${totalIncome.toFixed(2)}
        </span>
        <span className="text-red-600 font-medium">
          Expenses: ${totalExpenses.toFixed(2)}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  className="text-left py-3 px-4 text-gray-600 font-semibold cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort("date")}
                >
                  Date {sortField === "date" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="text-left py-3 px-4 text-gray-600 font-semibold">
                  Description
                </th>
                <th className="text-left py-3 px-4 text-gray-600 font-semibold">
                  Category
                </th>
                <th
                  className="text-right py-3 px-4 text-gray-600 font-semibold cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort("amount")}
                >
                  Amount{" "}
                  {sortField === "amount" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th
                  className="text-right py-3 px-4 text-gray-600 font-semibold cursor-pointer hover:text-gray-900"
                  onClick={() => handleSort("balance")}
                >
                  Balance{" "}
                  {sortField === "balance" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="py-3 px-4 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-600">{tx.date}</td>
                  <td className="py-3 px-4">
                    {editingId === tx.id ? (
                      <input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="border border-blue-300 rounded px-2 py-1 text-sm w-full outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-gray-800 font-medium">
                        {tx.description}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === tx.id ? (
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="border border-blue-300 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor:
                            (CATEGORY_COLORS[tx.category] ?? "#94a3b8") + "20",
                          color: CATEGORY_COLORS[tx.category] ?? "#94a3b8",
                        }}
                      >
                        {tx.category}
                      </span>
                    )}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-semibold ${
                      tx.amount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : "-"}$
                    {Math.abs(tx.amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    ${tx.balance.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === tx.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={saveEdit}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(tx.id)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
