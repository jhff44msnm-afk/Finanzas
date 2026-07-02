"use client";

import { useState, useMemo } from "react";
import { Search, Pencil, Check, X, Filter, Plus, Calendar } from "lucide-react";
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
  const [sortField, setSortField] = useState<"date" | "amount" | "balance">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Other");
  const [newIsExpense, setNewIsExpense] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const inputClass =
    "w-full border border-[#E8E2DA] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#7C8C6E] bg-white text-[#2D2D2D]";

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (timeFilter !== "all") {
      const now = new Date();
      let fromDate: Date;
      let toDate: Date = now;
      if (timeFilter === "week") {
        fromDate = new Date(now);
        fromDate.setDate(now.getDate() - 7);
      } else if (timeFilter === "month") {
        fromDate = new Date(now);
        fromDate.setMonth(now.getMonth() - 1);
      } else {
        fromDate = customFrom ? new Date(customFrom) : new Date(0);
        toDate = customTo ? new Date(customTo + "T23:59:59") : now;
      }
      result = result.filter((t) => {
        const d = new Date(t.date);
        return d >= fromDate && d <= toDate;
      });
    }

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
  }, [transactions, search, categoryFilter, sortField, sortDir, timeFilter, customFrom, customTo]);

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
        payload: { ...tx, category: editCategory, description: editDescription },
      });
    }
    setEditingId(null);
  };

  const addTransaction = () => {
    const amt = parseFloat(newAmount);
    if (!newDescription.trim() || isNaN(amt) || amt === 0) return;
    const finalAmt = newIsExpense ? -Math.abs(amt) : Math.abs(amt);

    // Derive balance from the most recent transaction
    const sorted = [...transactions].sort((a, b) => {
      const dateCmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCmp !== 0) return dateCmp;
      return (a.seq ?? 0) - (b.seq ?? 0);
    });
    const lastBalance = sorted.length > 0 ? sorted[sorted.length - 1].balance : 0;

    const maxSeq = transactions.reduce((max, t) => Math.max(max, t.seq ?? 0), 0);
    dispatch({
      type: "ADD_TRANSACTION",
      payload: {
        id: uuidv4(),
        date: newDate,
        description: newDescription.trim(),
        amount: finalAmt,
        balance: lastBalance + finalAmt,
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
        <h2 className="text-xl font-bold text-[#2D2D2D]">Activity</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-[#7C8C6E] text-white px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-[#6B7A5E] transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
          <h3 className="font-semibold text-[#2D2D2D] text-sm">New Transaction</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Date</label>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Category</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Description</label>
              <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="e.g. Cash payment" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Amount</label>
              <div className="flex gap-2">
                <select
                  value={newIsExpense ? "expense" : "income"}
                  onChange={(e) => setNewIsExpense(e.target.value === "expense")}
                  className="border border-[#E8E2DA] rounded-xl px-3 py-2.5 text-sm outline-none bg-white w-20"
                >
                  <option value="expense">-</option>
                  <option value="income">+</option>
                </select>
                <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" step="0.01" min="0" className={inputClass} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={addTransaction} className="bg-[#7C8C6E] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#6B7A5E]">Add</button>
            <button onClick={() => setShowAddForm(false)} className="bg-[#F5F0EB] text-[#5C5549] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#EDE7DF]">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B5AFA6]" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-[#E8E2DA] rounded-xl text-sm focus:ring-2 focus:ring-[#7C8C6E] outline-none bg-white text-[#2D2D2D] placeholder-[#B5AFA6]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <Filter size={14} className="text-[#B5AFA6]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-[#E8E2DA] rounded-xl px-2.5 py-1.5 text-xs outline-none bg-white text-[#2D2D2D]"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar size={14} className="text-[#B5AFA6]" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as "all" | "month" | "week" | "custom")}
              className="border border-[#E8E2DA] rounded-xl px-2.5 py-1.5 text-xs outline-none bg-white text-[#2D2D2D]"
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {timeFilter === "custom" && (
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <label className="text-xs text-[#8B8578] shrink-0">From</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="flex-1 border border-[#E8E2DA] rounded-xl px-2.5 py-1.5 text-xs outline-none bg-white" />
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <label className="text-xs text-[#8B8578] shrink-0">To</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="flex-1 border border-[#E8E2DA] rounded-xl px-2.5 py-1.5 text-xs outline-none bg-white" />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 text-xs">
        <span className="text-[#8B8578]">{filtered.length} transactions</span>
        <span className="text-[#6B9B7A] font-semibold">+${totalIncome.toFixed(2)}</span>
        <span className="text-[#C4756E] font-semibold">-${totalExpenses.toFixed(2)}</span>
      </div>

      {transactions.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-[#8B8578]">No transactions yet.</p>
            <p className="text-[#B5AFA6] text-sm mt-1">Upload a statement or add manually.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-2xl border border-[#E8E2DA] p-3.5"
            >
              {editingId === tx.id ? (
                <div className="space-y-2">
                  <input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className={inputClass}
                  />
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className={inputClass}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex items-center gap-1 bg-[#6B9B7A] text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                      <Check size={14} /> Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex items-center gap-1 bg-[#F5F0EB] text-[#5C5549] px-3 py-1.5 rounded-lg text-xs font-medium">
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: (CATEGORY_COLORS[tx.category] ?? "#B5AFA6") + "18",
                      }}
                    >
                      <span className="text-xs font-bold" style={{ color: CATEGORY_COLORS[tx.category] ?? "#B5AFA6" }}>
                        {tx.category.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#2D2D2D] truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#B5AFA6]">{tx.date}</span>
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: (CATEGORY_COLORS[tx.category] ?? "#B5AFA6") + "15",
                            color: CATEGORY_COLORS[tx.category] ?? "#B5AFA6",
                          }}
                        >
                          {tx.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.amount >= 0 ? "text-[#6B9B7A]" : "text-[#C4756E]"}`}>
                        {tx.amount >= 0 ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                      </p>
                      {tx.statementId !== "manual" && (
                        <p className="text-[10px] text-[#B5AFA6]">${tx.balance.toFixed(2)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => startEdit(tx.id)}
                      className="p-1.5 text-[#B5AFA6] hover:text-[#7C8C6E] hover:bg-[#7C8C6E]/10 rounded-lg transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
