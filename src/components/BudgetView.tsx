"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Repeat,
  Lightbulb,
  History,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Zap,
  X,
  Link2,
  EyeOff,
  Undo2,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAppState, useAppDispatch } from "@/lib/store";
import { CATEGORIES, CATEGORY_COLORS } from "@/lib/categories";
import type { RecurringBill, BillPayment } from "@/lib/types";

type SubTab = "bills" | "detected" | "insights";

const PRIORITY_CONFIG = {
  Essential: { color: "#6B9B7A", icon: ShieldCheck, label: "Essential" },
  Important: { color: "#D4A76A", icon: ShieldAlert, label: "Important" },
  Discretionary: { color: "#9B7EB5", icon: Zap, label: "Discretionary" },
  "Potentially Unnecessary": {
    color: "#C4756E",
    icon: AlertTriangle,
    label: "Potentially Unnecessary",
  },
} as const;

type Priority = keyof typeof PRIORITY_CONFIG;

function classifyPriority(category: string, description: string): Priority {
  const upper = description.toUpperCase();
  if (
    category === "Insurance" ||
    ["RENT", "MORTGAGE", "ELECTRIC", "WATER", "GAS BILL", "LOAN"].some((k) =>
      upper.includes(k)
    )
  )
    return "Essential";
  if (
    category === "Transportation" ||
    category === "Food & Dining" ||
    ["T-MOBILE", "PHONE", "INTERNET", "GROCERY"].some((k) =>
      upper.includes(k)
    )
  )
    return "Important";
  if (
    category === "Entertainment" ||
    ["SPOTIFY", "NETFLIX", "HULU", "DISNEY", "APPLE.COM BILL", "SUBSCRIPTION"].some((k) =>
      upper.includes(k)
    )
  )
    return "Discretionary";
  if (category === "Fees" || category === "Other") return "Potentially Unnecessary";
  return "Important";
}

function getNextDueDate(bill: RecurringBill): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (bill.frequency === "monthly") {
    const due = new Date(now.getFullYear(), now.getMonth(), bill.dueDay);
    if (due <= now) due.setMonth(due.getMonth() + 1);
    return due;
  }
  if (bill.frequency === "biweekly") {
    const due = new Date(now.getFullYear(), now.getMonth(), bill.dueDay);
    // Keep advancing by 14 days until we land in the future
    while (due <= now) due.setDate(due.getDate() + 14);
    return due;
  }
  // weekly — next occurrence of the given day of week
  const dayOfWeek = bill.dueDay % 7;
  const currentDay = now.getDay();
  let daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7;
  const due = new Date(now);
  due.setDate(now.getDate() + daysUntil);
  return due;
}

// The most recent cycle start (last time the bill was "due")
function getLastDueDate(bill: RecurringBill): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (bill.frequency === "monthly") {
    const due = new Date(now.getFullYear(), now.getMonth(), bill.dueDay);
    if (due > now) due.setMonth(due.getMonth() - 1);
    return due;
  }
  if (bill.frequency === "biweekly") {
    const next = getNextDueDate(bill);
    const last = new Date(next);
    last.setDate(last.getDate() - 14);
    return last;
  }
  // weekly
  const dayOfWeek = bill.dueDay % 7;
  const currentDay = now.getDay();
  const daysAgo = (currentDay - dayOfWeek + 7) % 7;
  const last = new Date(now);
  last.setDate(now.getDate() - daysAgo);
  return last;
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// --- Ignored items localStorage helpers ---

const IGNORED_KEY = "finanzas-ignored-recurring";

function loadIgnored(): Set<string> {
  try {
    const raw = localStorage.getItem(IGNORED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveIgnored(set: Set<string>) {
  try {
    localStorage.setItem(IGNORED_KEY, JSON.stringify([...set]));
  } catch {}
}

// --- Detected Recurring Payments Section ---

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type PriorityFilter = "all" | Priority;

function DetectedRecurring({
  transactions,
}: {
  transactions: { description: string; amount: number; category: string; date: string }[];
}) {
  const dispatch = useAppDispatch();
  const { bills } = useAppState();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<PriorityFilter>("all");
  const [ignored, setIgnored] = useState<Set<string>>(() => loadIgnored());
  const [showIgnored, setShowIgnored] = useState(false);

  const toggleIgnore = (key: string) => {
    const next = new Set(ignored);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setIgnored(next);
    saveIgnored(next);
  };

  const linkToBills = (item: {
    description: string;
    avgAmount: number;
    category: string;
  }) => {
    dispatch({
      type: "ADD_BILL",
      payload: {
        id: uuidv4(),
        name: item.description,
        amount: Math.round(item.avgAmount * 100) / 100,
        frequency: "monthly",
        dueDay: 15,
        category: item.category,
      },
    });
  };

  const recurring = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; description: string; amounts: number[]; dates: string[]; category: string }
    >();

    for (const tx of transactions) {
      if (tx.amount >= 0) continue;
      const key = tx.description
        .replace(/\d{2}\/\d{2}/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
      if (!key || key.length < 3) continue;

      const existing = groups.get(key);
      if (existing) {
        existing.amounts.push(Math.abs(tx.amount));
        existing.dates.push(tx.date);
      } else {
        groups.set(key, {
          key,
          description: tx.description,
          amounts: [Math.abs(tx.amount)],
          dates: [tx.date],
          category: tx.category,
        });
      }
    }

    return Array.from(groups.values())
      .filter((g) => g.amounts.length >= 2)
      .map((g) => {
        const avg =
          g.amounts.reduce((s, a) => s + a, 0) / g.amounts.length;
        const priority = classifyPriority(g.category, g.description);
        return { ...g, avgAmount: avg, priority, count: g.amounts.length };
      })
      .sort((a, b) => {
        const order: Priority[] = [
          "Potentially Unnecessary",
          "Discretionary",
          "Important",
          "Essential",
        ];
        const diff = order.indexOf(a.priority) - order.indexOf(b.priority);
        if (diff !== 0) return diff;
        return b.avgAmount - a.avgAmount;
      });
  }, [transactions]);

  const activeItems = recurring.filter((r) => !ignored.has(r.key));
  const ignoredItems = recurring.filter((r) => ignored.has(r.key));
  const filteredItems =
    filter === "all"
      ? activeItems
      : activeItems.filter((r) => r.priority === filter);

  const totalMonthly = useMemo(() => {
    return activeItems.reduce((sum, r) => sum + r.avgAmount, 0);
  }, [activeItems]);

  const linkedDescriptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of bills) set.add(b.name.toUpperCase());
    return set;
  }, [bills]);

  if (recurring.length === 0) {
    return (
      <div className="text-center py-10">
        <Repeat size={28} className="text-[#B5AFA6] mx-auto mb-2" />
        <p className="text-[#8B8578] text-sm">No recurring payments detected yet.</p>
        <p className="text-[#B5AFA6] text-xs mt-1">
          Upload more statements to detect patterns.
        </p>
      </div>
    );
  }

  const filterButtons: { key: PriorityFilter; label: string; color: string }[] = [
    { key: "all", label: "All", color: "#8B8578" },
    { key: "Essential", label: "Essential", color: PRIORITY_CONFIG.Essential.color },
    { key: "Important", label: "Important", color: PRIORITY_CONFIG.Important.color },
    { key: "Discretionary", label: "Discretionary", color: PRIORITY_CONFIG.Discretionary.color },
    {
      key: "Potentially Unnecessary",
      label: "Unnecessary",
      color: PRIORITY_CONFIG["Potentially Unnecessary"].color,
    },
  ];

  const renderItem = (
    item: (typeof recurring)[0],
    isIgnoredItem: boolean,
  ) => {
    const config = PRIORITY_CONFIG[item.priority];
    const isLinked = linkedDescriptions.has(item.description.toUpperCase());
    return (
      <div
        key={item.key}
        className={`bg-white rounded-2xl border overflow-hidden ${
          isIgnoredItem
            ? "border-[#E8E2DA]/60 opacity-60"
            : "border-[#E8E2DA]"
        }`}
      >
        <button
          onClick={() =>
            setExpanded(expanded === item.key ? null : item.key)
          }
          className="w-full p-3.5 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: config.color + "18" }}
            >
              <span
                className="text-xs font-bold"
                style={{ color: config.color }}
              >
                {item.category.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#2D2D2D] truncate">
                {item.description}
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-[#B5AFA6]">
                  {item.count}x &middot; {item.category}
                </p>
                {isLinked && (
                  <span className="text-[10px] font-medium text-[#7C8C6E] bg-[#7C8C6E]/10 px-1.5 py-0.5 rounded-full">
                    Linked
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-sm font-semibold text-[#C4756E]">
              -${item.avgAmount.toFixed(2)}
            </span>
            {expanded === item.key ? (
              <ChevronUp size={14} className="text-[#B5AFA6]" />
            ) : (
              <ChevronDown size={14} className="text-[#B5AFA6]" />
            )}
          </div>
        </button>
        {expanded === item.key && (
          <div className="px-3.5 pb-3.5 border-t border-[#E8E2DA] pt-3 space-y-3">
            <div>
              <p className="text-[10px] text-[#8B8578] font-medium uppercase tracking-wider mb-2">
                Payment History
              </p>
              <div className="space-y-1.5">
                {item.dates
                  .sort(
                    (a, b) =>
                      new Date(b).getTime() - new Date(a).getTime()
                  )
                  .slice(0, 6)
                  .map((date, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-[#8B8578]">{date}</span>
                      <span className="text-[#C4756E] font-medium">
                        -${item.amounts[item.dates.indexOf(date)]?.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {item.priority === "Potentially Unnecessary" && (
              <div className="bg-[#C4756E]/8 border border-[#C4756E]/20 rounded-xl p-2.5">
                <p className="text-[10px] text-[#C4756E] font-medium">
                  Cutting this saves ~$
                  {(item.avgAmount * 12).toFixed(0)}/year
                </p>
              </div>
            )}
            {item.priority === "Discretionary" && (
              <div className="bg-[#9B7EB5]/8 border border-[#9B7EB5]/20 rounded-xl p-2.5">
                <p className="text-[10px] text-[#9B7EB5] font-medium">
                  Consider if you still use this — $
                  {(item.avgAmount * 12).toFixed(0)}/year
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {!isIgnoredItem && !isLinked && (
                <button
                  onClick={() => linkToBills(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#7C8C6E]/10 text-[#7C8C6E] py-2 rounded-xl text-xs font-medium hover:bg-[#7C8C6E]/20 transition-colors"
                >
                  <Link2 size={13} />
                  Link to Bills
                </button>
              )}
              <button
                onClick={() => toggleIgnore(item.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isIgnoredItem
                    ? "bg-[#6B9B7A]/10 text-[#6B9B7A] hover:bg-[#6B9B7A]/20"
                    : "bg-[#F5F0EB] text-[#8B8578] hover:bg-[#EDE7DF]"
                }`}
              >
                {isIgnoredItem ? (
                  <>
                    <Undo2 size={13} />
                    Restore
                  </>
                ) : (
                  <>
                    <EyeOff size={13} />
                    Ignore
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#8B8578] font-medium">
            {activeItems.length} recurring charges detected
          </span>
          <span className="text-sm font-bold text-[#C4756E]">
            ~${totalMonthly.toFixed(2)}/mo
          </span>
        </div>
      </div>

      {/* Priority filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filterButtons.map((btn) => {
          const active = filter === btn.key;
          const count =
            btn.key === "all"
              ? activeItems.length
              : activeItems.filter((r) => r.priority === btn.key).length;
          return (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${
                active
                  ? "text-white border-transparent"
                  : "bg-white border-[#E8E2DA] text-[#8B8578] hover:border-[#B5AFA6]"
              }`}
              style={
                active
                  ? { backgroundColor: btn.color, borderColor: btn.color }
                  : undefined
              }
            >
              {btn.label}
              {count > 0 && (
                <span
                  className={`ml-1 ${active ? "opacity-80" : "opacity-50"}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active items grouped by priority */}
      {filter === "all" ? (
        (["Potentially Unnecessary", "Discretionary", "Important", "Essential"] as Priority[]).map(
          (priority) => {
            const items = filteredItems.filter((r) => r.priority === priority);
            if (items.length === 0) return null;
            const config = PRIORITY_CONFIG[priority];
            const Icon = config.icon;
            return (
              <div key={priority} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Icon size={14} style={{ color: config.color }} />
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: config.color }}
                  >
                    {config.label}
                  </span>
                </div>
                {items.map((item) => renderItem(item, false))}
              </div>
            );
          }
        )
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => renderItem(item, false))}
          {filteredItems.length === 0 && (
            <p className="text-center text-xs text-[#B5AFA6] py-6">
              No items in this category.
            </p>
          )}
        </div>
      )}

      {/* Ignored section */}
      {ignoredItems.length > 0 && (
        <div className="space-y-2 pt-2">
          <button
            onClick={() => setShowIgnored(!showIgnored)}
            className="flex items-center gap-2 px-1 w-full"
          >
            <EyeOff size={14} className="text-[#B5AFA6]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B5AFA6]">
              Ignored ({ignoredItems.length})
            </span>
            {showIgnored ? (
              <ChevronUp size={14} className="text-[#B5AFA6] ml-auto" />
            ) : (
              <ChevronDown size={14} className="text-[#B5AFA6] ml-auto" />
            )}
          </button>
          {showIgnored &&
            ignoredItems.map((item) => renderItem(item, true))}
        </div>
      )}
    </div>
  );
}

// --- Monthly Bills Checklist Section ---

function BillsChecklist() {
  const { bills, billPayments, transactions } = useAppState();
  const dispatch = useAppDispatch();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RecurringBill["frequency"]>("monthly");
  const [dueDay, setDueDay] = useState("");
  const [category, setCategory] = useState("Bills & Subscriptions");
  const [historyBillId, setHistoryBillId] = useState<string | null>(null);

  const inputClass =
    "w-full border border-[#E8E2DA] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#7C8C6E] bg-white text-[#2D2D2D]";

  const addBill = () => {
    if (!name || !amount || !dueDay) return;
    dispatch({
      type: "ADD_BILL",
      payload: {
        id: uuidv4(),
        name,
        amount: parseFloat(amount),
        frequency,
        dueDay: parseInt(dueDay),
        category,
      },
    });
    setName("");
    setAmount("");
    setDueDay("");
    setShowForm(false);
  };

  const markPaid = (bill: RecurringBill) => {
    const nextDue = getNextDueDate(bill);
    const now = new Date();
    const days = daysUntil(nextDue);
    dispatch({
      type: "ADD_BILL_PAYMENT",
      payload: {
        id: uuidv4(),
        billId: bill.id,
        paidDate: now.toISOString().slice(0, 10),
        dueDate: nextDue.toISOString().slice(0, 10),
        amount: bill.amount,
        onTime: days >= 0,
      },
    });
  };

  const getBillPayments = (billId: string) =>
    billPayments
      .filter((p) => p.billId === billId)
      .sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());

  const isAlreadyPaidThisCycle = (bill: RecurringBill) => {
    const lastDue = getLastDueDate(bill);
    const payments = getBillPayments(bill.id);
    if (payments.length === 0) return false;
    const lastPaid = new Date(payments[0].paidDate);
    lastPaid.setHours(0, 0, 0, 0);
    return lastPaid >= lastDue;
  };

  const totalIncome = useMemo(() => {
    const now = new Date();
    const monthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return monthTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  // Sum of bill payments recorded this calendar month
  const paidBillsThisMonth = useMemo(() => {
    const now = new Date();
    return billPayments
      .filter((p) => {
        const d = new Date(p.paidDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [billPayments]);

  const totalMonthlyBills = useMemo(() => {
    return bills.reduce((sum, b) => {
      if (b.frequency === "monthly") return sum + b.amount;
      if (b.frequency === "biweekly") return sum + b.amount * 2.17;
      return sum + b.amount * 4.33;
    }, 0);
  }, [bills]);

  const totalWeeklyBills = useMemo(() => {
    return bills.reduce((sum, b) => {
      if (b.frequency === "weekly") return sum + b.amount;
      if (b.frequency === "biweekly") return sum + b.amount / 2;
      return sum + b.amount / 4.33;
    }, 0);
  }, [bills]);

  const sortedBills = useMemo(() => {
    return [...bills].sort((a, b) => {
      const aDays = daysUntil(getNextDueDate(a));
      const bDays = daysUntil(getNextDueDate(b));
      return aDays - bDays;
    });
  }, [bills]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#2D2D2D]">Monthly Bills</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-[#7C8C6E] text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-[#6B7A5E] transition-colors"
        >
          <Plus size={14} />
          Add Bill
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                Bill Name
              </label>
              <input
                placeholder="e.g. T-Mobile"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                Amount ($)
              </label>
              <input
                type="number"
                placeholder="50.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as RecurringBill["frequency"])
                }
                className={inputClass}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                {frequency === "weekly" ? "Day of Week" : "Due Day"}
              </label>
              {frequency === "weekly" ? (
                <div className="flex gap-1">
                  {DAYS_OF_WEEK.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDueDay(String(i))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        dueDay === String(i)
                          ? "bg-[#7C8C6E] text-white"
                          : "border border-[#E8E2DA] bg-white text-[#8B8578] hover:border-[#7C8C6E]"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="number"
                  placeholder="15"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  min={1}
                  max={31}
                  className={inputClass}
                />
              )}
            </div>
            <div>
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={addBill}
              className="bg-[#7C8C6E] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#6B7A5E]"
            >
              Add
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-[#F5F0EB] text-[#5C5549] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#EDE7DF]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {bills.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl border border-[#E8E2DA] p-3 text-center">
            <p className="text-[10px] text-[#8B8578] font-medium uppercase tracking-wider">
              /week
            </p>
            <p className="text-base font-bold text-[#2D2D2D] mt-1">
              ${totalWeeklyBills.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8E2DA] p-3 text-center">
            <p className="text-[10px] text-[#8B8578] font-medium uppercase tracking-wider">
              /month
            </p>
            <p className="text-base font-bold text-[#2D2D2D] mt-1">
              ${totalMonthlyBills.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8E2DA] p-3 text-center">
            <p className="text-[10px] text-[#8B8578] font-medium uppercase tracking-wider">
              Remaining
            </p>
            <p
              className={`text-base font-bold mt-1 ${
                totalIncome - paidBillsThisMonth >= 0
                  ? "text-[#6B9B7A]"
                  : "text-[#C4756E]"
              }`}
            >
              ${(totalIncome - paidBillsThisMonth).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Bill List */}
      {sortedBills.length === 0 ? (
        <div className="text-center py-10">
          <Clock size={28} className="text-[#B5AFA6] mx-auto mb-2" />
          <p className="text-[#8B8578] text-sm">No bills added yet.</p>
          <p className="text-[#B5AFA6] text-xs mt-1">
            Add your recurring bills to track payments.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedBills.map((bill) => {
            const nextDue = getNextDueDate(bill);
            const days = daysUntil(nextDue);
            const paid = isAlreadyPaidThisCycle(bill);
            const payments = getBillPayments(bill.id);
            const onTimeCount = payments.filter((p) => p.onTime).length;
            const urgencyColor =
              paid
                ? "#6B9B7A"
                : days <= 0
                  ? "#C4756E"
                  : days <= 3
                    ? "#D4A76A"
                    : "#8B8578";

            return (
              <div
                key={bill.id}
                className="bg-white rounded-2xl border border-[#E8E2DA] p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor:
                          (CATEGORY_COLORS[bill.category] ?? "#B5AFA6") + "18",
                      }}
                    >
                      {paid ? (
                        <CheckCircle2
                          size={18}
                          style={{ color: "#6B9B7A" }}
                        />
                      ) : (
                        <Clock size={18} style={{ color: urgencyColor }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#2D2D2D] truncate">
                        {bill.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#B5AFA6]">
                          {bill.frequency} &middot;{" "}
                          {bill.frequency === "weekly"
                            ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                                bill.dueDay % 7
                              ]
                            : `Day ${bill.dueDay}`}
                        </span>
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: urgencyColor + "15",
                            color: urgencyColor,
                          }}
                        >
                          {paid
                            ? "Paid"
                            : days === 0
                              ? "Due today"
                              : days < 0
                                ? `${Math.abs(days)}d overdue`
                                : `${days}d left`}
                        </span>
                        {paid && (
                          <span className="text-[10px] text-[#B5AFA6]">
                            Next: {formatDate(nextDue)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-sm font-semibold text-[#C4756E]">
                      ${bill.amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!paid && (
                    <button
                      onClick={() => markPaid(bill)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#6B9B7A]/10 text-[#6B9B7A] py-2 rounded-xl text-xs font-medium hover:bg-[#6B9B7A]/20 transition-colors"
                    >
                      <CheckCircle2 size={14} />
                      Mark Paid
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setHistoryBillId(
                        historyBillId === bill.id ? null : bill.id
                      )
                    }
                    className="flex items-center justify-center gap-1.5 bg-[#F5F0EB] text-[#5C5549] py-2 px-3 rounded-xl text-xs font-medium hover:bg-[#EDE7DF] transition-colors"
                  >
                    <History size={14} />
                    {payments.length > 0 && (
                      <span className="text-[#6B9B7A]">
                        {onTimeCount}/{payments.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      dispatch({ type: "DELETE_BILL", payload: bill.id })
                    }
                    className="p-2 text-[#B5AFA6] hover:text-[#C4756E] hover:bg-[#C4756E]/10 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {historyBillId === bill.id && (
                  <div className="border-t border-[#E8E2DA] pt-2 mt-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-[#8B8578] font-medium uppercase tracking-wider">
                        Payment History
                      </p>
                      <button
                        onClick={() => setHistoryBillId(null)}
                        className="p-0.5 text-[#B5AFA6]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {payments.length === 0 ? (
                      <p className="text-xs text-[#B5AFA6]">No payments recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {payments.slice(0, 8).map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-1.5">
                              {p.onTime ? (
                                <CheckCircle2
                                  size={12}
                                  className="text-[#6B9B7A]"
                                />
                              ) : (
                                <AlertTriangle
                                  size={12}
                                  className="text-[#C4756E]"
                                />
                              )}
                              <span className="text-[#8B8578]">
                                {p.paidDate}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[#2D2D2D] font-medium">
                                ${p.amount.toFixed(2)}
                              </span>
                              <button
                                onClick={() =>
                                  dispatch({
                                    type: "DELETE_BILL_PAYMENT",
                                    payload: p.id,
                                  })
                                }
                                className="p-0.5 text-[#B5AFA6] hover:text-[#C4756E] transition-colors"
                                title="Delete payment"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Spending Insights Section ---

function SpendingInsights({
  transactions,
}: {
  transactions: { amount: number; category: string; date: string; description: string }[];
}) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <Lightbulb size={28} className="text-[#B5AFA6] mx-auto mb-2" />
        <p className="text-[#8B8578] text-sm">No data to analyze yet.</p>
        <p className="text-[#B5AFA6] text-xs mt-1">
          Upload statements to get spending insights.
        </p>
      </div>
    );
  }

  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonth = transactions.filter((t) => {
    const d = new Date(t.date);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  });

  const income = thisMonth
    .filter((t) => t.amount > 0 && t.category !== "Transfers" && t.category !== "Adjustments")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth
    .filter((t) => t.amount < 0 && t.category !== "Transfers" && t.category !== "Adjustments")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  // 50/30/20 analysis
  const needs = thisMonth
    .filter(
      (t) =>
        t.amount < 0 &&
        ["Food & Dining", "Transportation", "Insurance", "Bills & Subscriptions"].includes(
          t.category
        )
    )
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const wants = thisMonth
    .filter(
      (t) =>
        t.amount < 0 &&
        ["Entertainment", "Shopping"].includes(t.category)
    )
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const savings = Math.max(0, income - expenses);

  const needsPct = income > 0 ? (needs / income) * 100 : 0;
  const wantsPct = income > 0 ? (wants / income) * 100 : 0;
  const savingsPct = income > 0 ? (savings / income) * 100 : 0;

  // Category trends
  const categoryThisMonth = new Map<string, number>();
  const categoryLastMonth = new Map<string, number>();
  for (const t of thisMonth.filter((t) => t.amount < 0)) {
    categoryThisMonth.set(
      t.category,
      (categoryThisMonth.get(t.category) ?? 0) + Math.abs(t.amount)
    );
  }
  for (const t of lastMonth.filter((t) => t.amount < 0)) {
    categoryLastMonth.set(
      t.category,
      (categoryLastMonth.get(t.category) ?? 0) + Math.abs(t.amount)
    );
  }

  const trends = Array.from(categoryThisMonth.entries())
    .map(([cat, amount]) => {
      const prev = categoryLastMonth.get(cat) ?? 0;
      const change = prev > 0 ? ((amount - prev) / prev) * 100 : 0;
      return { category: cat, amount, prev, change };
    })
    .filter((t) => Math.abs(t.change) > 10 && t.prev > 0)
    .sort((a, b) => b.change - a.change);

  // Fee detection
  const fees = transactions.filter(
    (t) => t.category === "Fees" && t.amount < 0
  );
  const totalFees = fees.reduce((s, t) => s + Math.abs(t.amount), 0);

  // Tips
  const tips: string[] = [];
  if (needsPct > 50)
    tips.push(
      `Your needs are at ${needsPct.toFixed(0)}% of income (target: 50%). Look for ways to reduce fixed costs.`
    );
  if (wantsPct > 30)
    tips.push(
      `Wants spending is ${wantsPct.toFixed(0)}% of income (target: 30%). Consider cutting one discretionary expense.`
    );
  if (savingsPct < 20 && income > 0)
    tips.push(
      `You're saving ${savingsPct.toFixed(0)}% of income (target: 20%). Even $25/week adds up to $1,300/year.`
    );
  if (totalFees > 0)
    tips.push(
      `You paid $${totalFees.toFixed(2)} in fees across ${fees.length} charges. Consider fee-free alternatives.`
    );
  if (savingsRate > 20)
    tips.push(
      `Great savings rate of ${savingsRate.toFixed(0)}%! Consider putting the surplus into your goals.`
    );

  for (const t of trends) {
    if (t.change > 25) {
      tips.push(
        `${t.category} spending is up ${t.change.toFixed(0)}% vs. last month ($${t.amount.toFixed(2)} → was $${t.prev.toFixed(2)}).`
      );
    }
  }

  return (
    <div className="space-y-3">
      {/* 50/30/20 Score */}
      <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#2D2D2D]">
          50/30/20 Budget Score
        </h3>
        {income === 0 ? (
          <p className="text-xs text-[#B5AFA6]">
            No income detected this month to calculate ratios.
          </p>
        ) : (
          <div className="space-y-2.5">
            {[
              {
                label: "Needs",
                pct: needsPct,
                target: 50,
                color: "#7C8C6E",
              },
              {
                label: "Wants",
                pct: wantsPct,
                target: 30,
                color: "#9B7EB5",
              },
              {
                label: "Savings",
                pct: savingsPct,
                target: 20,
                color: "#6B9B7A",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#8B8578] font-medium">
                    {item.label}
                  </span>
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        item.label === "Savings"
                          ? item.pct >= item.target
                            ? "#6B9B7A"
                            : "#C4756E"
                          : item.pct <= item.target
                            ? "#6B9B7A"
                            : "#C4756E",
                    }}
                  >
                    {item.pct.toFixed(0)}%{" "}
                    <span className="text-[#B5AFA6] font-normal">
                      / {item.target}%
                    </span>
                  </span>
                </div>
                <div className="w-full bg-[#F5F0EB] rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(item.pct, 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Savings Rate */}
      <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8B8578] font-medium">Savings Rate</p>
            <p
              className={`text-2xl font-bold mt-0.5 ${
                savingsRate >= 20 ? "text-[#6B9B7A]" : savingsRate >= 0 ? "text-[#D4A76A]" : "text-[#C4756E]"
              }`}
            >
              {savingsRate.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#8B8578]">
              ${income.toFixed(2)} in &middot; ${expenses.toFixed(2)} out
            </p>
            <p
              className={`text-sm font-semibold mt-0.5 ${
                savings >= 0 ? "text-[#6B9B7A]" : "text-[#C4756E]"
              }`}
            >
              {savings >= 0 ? "+" : "-"}${Math.abs(savings).toFixed(2)} net
            </p>
          </div>
        </div>
      </div>

      {/* Spending Trends */}
      {trends.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-2.5">
          <h3 className="text-sm font-semibold text-[#2D2D2D]">
            Spending Trends
          </h3>
          {trends.slice(0, 5).map((t) => (
            <div key={t.category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      CATEGORY_COLORS[t.category] ?? "#B5AFA6",
                  }}
                />
                <span className="text-xs text-[#2D2D2D]">{t.category}</span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  t.change > 0 ? "text-[#C4756E]" : "text-[#6B9B7A]"
                }`}
              >
                {t.change > 0 ? "+" : ""}
                {t.change.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tips & Advice */}
      {tips.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[#2D2D2D] px-1">
            Financial Tips
          </h3>
          {tips.map((tip, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#E8E2DA] p-3.5 flex items-start gap-2.5"
            >
              <Lightbulb
                size={15}
                className="text-[#D4A76A] mt-0.5 shrink-0"
              />
              <p className="text-xs text-[#5C5549] leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      )}

      {/* What If Simulator */}
      <WhatIfSimulator
        income={income}
        expenses={expenses}
        categorySpending={categoryThisMonth}
      />
    </div>
  );
}

function WhatIfSimulator({
  income,
  expenses,
  categorySpending,
}: {
  income: number;
  expenses: number;
  categorySpending: Map<string, number>;
}) {
  const [selectedCat, setSelectedCat] = useState("");
  const [reduction, setReduction] = useState(20);

  const categories = Array.from(categorySpending.entries())
    .filter(([, v]) => v > 10)
    .sort(([, a], [, b]) => b - a);

  if (categories.length === 0 || income === 0) return null;

  const catAmount = categorySpending.get(selectedCat) ?? 0;
  const savedAmount = catAmount * (reduction / 100);
  const newExpenses = expenses - savedAmount;
  const newSavingsRate = ((income - newExpenses) / income) * 100;
  const currentSavingsRate = ((income - expenses) / income) * 100;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[#2D2D2D]">
        &ldquo;What If&rdquo; Simulator
      </h3>
      <div className="space-y-2">
        <div>
          <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
            Category to reduce
          </label>
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full border border-[#E8E2DA] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#7C8C6E] bg-white text-[#2D2D2D]"
          >
            <option value="">Select a category...</option>
            {categories.map(([cat, amt]) => (
              <option key={cat} value={cat}>
                {cat} (${amt.toFixed(2)})
              </option>
            ))}
          </select>
        </div>
        {selectedCat && (
          <>
            <div>
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                Reduce by {reduction}%
              </label>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={reduction}
                onChange={(e) => setReduction(parseInt(e.target.value))}
                className="w-full accent-[#7C8C6E]"
              />
              <div className="flex justify-between text-[10px] text-[#B5AFA6]">
                <span>10%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="bg-[#7C8C6E]/6 border border-[#7C8C6E]/15 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#8B8578]">You&apos;d save</span>
                <span className="text-[#6B9B7A] font-bold">
                  ${savedAmount.toFixed(2)}/mo &middot; $
                  {(savedAmount * 12).toFixed(0)}/yr
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8B8578]">Savings rate</span>
                <span className="font-semibold text-[#2D2D2D]">
                  {currentSavingsRate.toFixed(0)}% →{" "}
                  <span className="text-[#6B9B7A]">
                    {newSavingsRate.toFixed(0)}%
                  </span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Main BudgetView ---

export default function BudgetView() {
  const { transactions, activeAccountId } = useAppState();
  const [subTab, setSubTab] = useState<SubTab>("bills");

  const accountTransactions = useMemo(() => {
    if (activeAccountId === "all") return transactions;
    return transactions.filter((t) => t.accountId === activeAccountId || !t.accountId);
  }, [transactions, activeAccountId]);

  const tabs: { key: SubTab; label: string }[] = [
    { key: "bills", label: "My Bills" },
    { key: "detected", label: "Detected" },
    { key: "insights", label: "Insights" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#2D2D2D]">Budget</h2>

      <div className="flex bg-[#F5F0EB] rounded-xl p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
              subTab === tab.key
                ? "bg-white text-[#2D2D2D] shadow-sm"
                : "text-[#8B8578] hover:text-[#5C5549]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "bills" && <BillsChecklist />}
      {subTab === "detected" && <DetectedRecurring transactions={accountTransactions} />}
      {subTab === "insights" && <SpendingInsights transactions={accountTransactions} />}
    </div>
  );
}
