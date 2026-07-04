"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart2 } from "lucide-react";
import { useAppState } from "@/lib/store";
import { CATEGORY_COLORS } from "@/lib/categories";
import { currencySymbol } from "@/lib/currency";

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function formatMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function InsightsView() {
  const { transactions, statements, accounts, activeAccountId } = useAppState();

  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const currency = activeAccount?.currency ?? "USD";
  const sym = currencySymbol(currency);

  const accountTransactions = useMemo(() => {
    if (activeAccountId === "all") return transactions;
    return transactions.filter(
      (t) => t.accountId === activeAccountId || !t.accountId
    );
  }, [transactions, activeAccountId]);

  // Derive months from uploaded statements only
  const statementMonths = useMemo(() => {
    const relevant =
      activeAccountId === "all"
        ? statements
        : statements.filter(
            (s) => s.accountId === activeAccountId || !s.accountId
          );

    const keys = new Set<string>();
    for (const s of relevant) {
      if (s.periodStart) keys.add(monthKey(s.periodStart));
      if (s.periodEnd) keys.add(monthKey(s.periodEnd));
    }

    return Array.from(keys).sort((a, b) => b.localeCompare(a)); // most recent first
  }, [statements, activeAccountId]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => statementMonths[0] ?? "");

  const effectiveMonth = statementMonths.includes(selectedMonth)
    ? selectedMonth
    : statementMonths[0] ?? "";

  const monthTx = useMemo(() => {
    if (!effectiveMonth) return [];
    return accountTransactions.filter((t) => monthKey(t.date) === effectiveMonth);
  }, [accountTransactions, effectiveMonth]);

  const nonTransfer = useMemo(
    () =>
      monthTx.filter(
        (t) => t.category !== "Transfers" && t.category !== "Adjustments"
      ),
    [monthTx]
  );

  const totalIncome = useMemo(
    () =>
      nonTransfer
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0),
    [nonTransfer]
  );

  const totalExpenses = useMemo(
    () =>
      nonTransfer
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [nonTransfer]
  );

  const categoryData = useMemo(() => {
    const catMap = new Map<string, number>();
    for (const t of nonTransfer.filter((t) => t.amount < 0)) {
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + Math.abs(t.amount));
    }
    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [nonTransfer]);

  const weeklyData = useMemo(() => {
    const weekMap = new Map<number, { income: number; expenses: number }>();
    for (const t of nonTransfer) {
      const week = Math.ceil(new Date(t.date).getDate() / 7);
      const entry = weekMap.get(week) ?? { income: 0, expenses: 0 };
      if (t.amount > 0) entry.income += t.amount;
      else entry.expenses += Math.abs(t.amount);
      weekMap.set(week, entry);
    }
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, d]) => ({
        name: `Wk ${week}`,
        Income: Math.round(d.income * 100) / 100,
        Expenses: Math.round(d.expenses * 100) / 100,
      }));
  }, [nonTransfer]);

  const fmt = (v: number) =>
    `${sym}${v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (statementMonths.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[#2D2D2D]">Insights</h2>
        <div className="flex items-center justify-center py-20 text-center">
          <div>
            <div className="w-20 h-20 rounded-full bg-[#7C8C6E]/10 flex items-center justify-center mx-auto mb-4">
              <BarChart2 size={36} className="text-[#7C8C6E]" />
            </div>
            <h2 className="text-lg font-semibold text-[#2D2D2D] mb-2">
              No statement data yet
            </h2>
            <p className="text-[#8B8578] text-sm max-w-xs">
              Upload bank statements in the Uploads tab to see monthly spending
              analytics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-[#2D2D2D]">Insights</h2>

      {/* Month picker — scrolls horizontally, only statement months */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 pb-1">
          {statementMonths.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                m === effectiveMonth
                  ? "bg-[#7C8C6E] text-white"
                  : "bg-[#F5F0EB] text-[#8B8578] hover:bg-[#E8E2DA]"
              }`}
            >
              {formatMonth(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Income / Expenses summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
          <p className="text-xs text-[#8B8578] font-medium mb-1">Income</p>
          <p className="text-lg font-bold text-[#6B9B7A]">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
          <p className="text-xs text-[#8B8578] font-medium mb-1">Expenses</p>
          <p className="text-lg font-bold text-[#C4756E]">{fmt(totalExpenses)}</p>
        </div>
      </div>

      {/* Spending by Category */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
          <h3 className="text-sm font-semibold text-[#2D2D2D] mb-4">
            Spending by Category
          </h3>
          <div className="space-y-3.5">
            {categoryData.map((cat) => {
              const pct =
                totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0;
              const color = CATEGORY_COLORS[cat.name] ?? "#B5AFA6";
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-[#2D2D2D]">
                      {cat.name}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] text-[#B5AFA6]">
                        {pct.toFixed(1)}%
                      </span>
                      <span className="text-xs font-semibold text-[#2D2D2D] tabular-nums">
                        {fmt(cat.value)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#F5F0EB] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Breakdown */}
      {weeklyData.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
          <h3 className="text-sm font-semibold text-[#2D2D2D] mb-3">
            Weekly Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barGap={4} barCategoryGap="35%">
              <CartesianGrid vertical={false} stroke="#F5F0EB" />
              <XAxis
                dataKey="name"
                fontSize={11}
                tick={{ fill: "#8B8578" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                fontSize={11}
                tickFormatter={(v) =>
                  v >= 1000
                    ? `${sym}${(v / 1000).toFixed(0)}k`
                    : `${sym}${v}`
                }
                tick={{ fill: "#8B8578" }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                formatter={(value, name) => [fmt(Number(value)), name]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E8E2DA",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
                cursor={{ fill: "#F5F0EB" }}
              />
              <Bar
                dataKey="Income"
                fill="#6B9B7A"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
              <Bar
                dataKey="Expenses"
                fill="#C4756E"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-5 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#6B9B7A]" />
              <span className="text-[11px] text-[#8B8578]">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C4756E]" />
              <span className="text-[11px] text-[#8B8578]">Expenses</span>
            </div>
          </div>
        </div>
      )}

      {monthTx.length === 0 && (
        <p className="text-center py-8 text-[#B5AFA6] text-sm">
          No transactions found for {formatMonth(effectiveMonth)}.
        </p>
      )}
    </div>
  );
}
