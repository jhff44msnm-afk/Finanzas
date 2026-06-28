"use client";

import { useState, useMemo } from "react";
import { Search, Pencil, Check, X, Filter, Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Other");
  const [newIsExpense, setNewIsExpense] = useState(true);

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
      if (sortField === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (cmp === 0) cmp = (a.seq ?? 0) - (b.seq ?? 0);
      } else if (sortField === "amount") cmp = a.amount - b.amount;
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

  const addTransaction = () => {
    const amt = parseFloat(newAmount);
    if (!newDescription.trim() || isNaN(amt) || amt === 0) return;

    const maxSeq = transactions.reduce((max, t) => Math.max(max, t.seq ?? 0), 0);

    dispatch({
      type: "ADD_TRANSACTION",
      payload: {
        id: uuidv4(),
        date: newDate,
        description: newDescription.trim(),
        amount: newIsExpense ? -Math.abs(amt) : Math.abs(amt),
        balance: 0,
        category: newCategory,
        statementId: "manual",
        seq: maxSeq + 1,
      },
    });

    setNewDescription("");
    setNewAmount("");
    setNewCategory("Other");
    setShowAddForm(false);
  };

  const totalExpenses = filtered
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome = filtered
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Transactions</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Transaction
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-700">New Transaction</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Cash payment"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount</label>
              <div className="flex gap-2">
                <select
                  value={newIsExpense ? "expense" : "income"}
                  onChange={(e) => setNewIsExpense(e.target.value === "expense")}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
                >
                  <option value="expense">-</option>
                  <option value="income">+</option>
                </select>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addTransaction}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

      {transactions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-gray-500 text-lg">No transactions yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              Upload a bank statement or add transactions manually.
            </p>
          </div>
        </div>
      ) : (
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
                      {tx.statementId === "manual" ? "—" : `$${tx.balance.toFixed(2)}`}
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
      )}
    </div>
  );
}
