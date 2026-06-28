"use client";

import { useMemo } from "react";
import {
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAppState } from "@/lib/store";
import { CATEGORY_COLORS } from "@/lib/categories";

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.ceil(d.getDate() / 7);
}

export default function Dashboard() {
  const { transactions } = useAppState();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const stats = useMemo(() => {
    if (transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netFlow: 0,
        txCount: 0,
        weeklyData: [],
        categoryData: [],
        recentTx: [],
        currentBalance: 0,
        currentMonth: "",
      };
    }

    const sorted = [...transactions].sort((a, b) => {
      const dateCmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCmp !== 0) return dateCmp;
      return (a.seq ?? 0) - (b.seq ?? 0);
    });

    const lastTx = sorted[sorted.length - 1];
    const currentBalance = lastTx.balance;

    const latestDate = new Date(lastTx.date);
    const latestMonth = latestDate.getMonth();
    const latestYear = latestDate.getFullYear();
    const currentMonth = latestDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const monthTx = sorted.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === latestMonth && d.getFullYear() === latestYear;
    });

    const nonTransfer = monthTx.filter(
      (t) => t.category !== "Transfers" && t.category !== "Adjustments"
    );
    const totalIncome = nonTransfer
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = nonTransfer
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const weekMap = new Map<number, { income: number; expenses: number }>();
    for (const t of nonTransfer) {
      const week = getWeekNumber(t.date);
      const entry = weekMap.get(week) ?? { income: 0, expenses: 0 };
      if (t.amount > 0) entry.income += t.amount;
      else entry.expenses += Math.abs(t.amount);
      weekMap.set(week, entry);
    }
    const weeklyData = Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, data]) => ({
        name: `W${week}`,
        Income: Math.round(data.income * 100) / 100,
        Expenses: Math.round(data.expenses * 100) / 100,
      }));

    const catMap = new Map<string, number>();
    for (const t of nonTransfer.filter((t) => t.amount < 0)) {
      const prev = catMap.get(t.category) ?? 0;
      catMap.set(t.category, prev + Math.abs(t.amount));
    }
    const categoryData = Array.from(catMap.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);

    const recentTx = [...sorted].reverse().slice(0, 6);

    return {
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses,
      txCount: monthTx.length,
      weeklyData,
      categoryData,
      recentTx,
      currentBalance,
      currentMonth,
    };
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2D2D]">{greeting}</h1>
          <p className="text-[#8B8578] text-sm mt-1">Welcome to Finanzas</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-[#7C8C6E]/10 flex items-center justify-center mx-auto mb-4">
              <Wallet size={36} className="text-[#7C8C6E]" />
            </div>
            <h2 className="text-lg font-semibold text-[#2D2D2D] mb-2">
              Start tracking your finances
            </h2>
            <p className="text-[#8B8578] text-sm max-w-xs">
              Upload a bank statement in the Uploads tab to get started.
              Your transactions will be automatically parsed and categorized.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Balance",
      value: stats.currentBalance,
      icon: Wallet,
      iconColor: "#7C8C6E",
      iconBg: "bg-[#7C8C6E]/10",
    },
    {
      label: "Income",
      value: stats.totalIncome,
      icon: TrendingUp,
      iconColor: "#6B9B7A",
      iconBg: "bg-[#6B9B7A]/10",
    },
    {
      label: "Expenses",
      value: stats.totalExpenses,
      icon: TrendingDown,
      iconColor: "#C4756E",
      iconBg: "bg-[#C4756E]/10",
    },
    {
      label: "Transactions",
      value: stats.txCount,
      icon: ArrowLeftRight,
      iconColor: "#D4A76A",
      iconBg: "bg-[#D4A76A]/10",
      isCurrency: false,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#2D2D2D]">{greeting}</h1>
        {stats.currentMonth && (
          <p className="text-[#8B8578] text-sm mt-0.5">{stats.currentMonth}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-[#E8E2DA] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-xl ${card.iconBg}`}>
                <card.icon size={16} style={{ color: card.iconColor }} />
              </div>
              <span className="text-xs text-[#8B8578] font-medium">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-[#2D2D2D]">
              {card.isCurrency === false
                ? card.value
                : `$${card.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
        <h3 className="text-sm font-semibold text-[#2D2D2D] mb-3">
          Weekly Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DA" />
            <XAxis dataKey="name" fontSize={11} tick={{ fill: "#8B8578" }} />
            <YAxis fontSize={11} tickFormatter={(v) => `$${v}`} tick={{ fill: "#8B8578" }} />
            <Tooltip
              formatter={(value) => `$${Number(value).toFixed(2)}`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E8E2DA",
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            />
            <Bar dataKey="Income" fill="#6B9B7A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Expenses" fill="#C4756E" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
        <h3 className="text-sm font-semibold text-[#2D2D2D] mb-3">
          Spending by Category
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={stats.categoryData}
              cx="50%"
              cy="45%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {stats.categoryData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={CATEGORY_COLORS[entry.name] ?? "#B5AFA6"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `$${Number(value).toFixed(2)}`}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E8E2DA",
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => (
                <span style={{ color: "#8B8578" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
        <h3 className="text-sm font-semibold text-[#2D2D2D] mb-3">
          Recent Activity
        </h3>
        <div className="space-y-3">
          {stats.recentTx.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor:
                      (CATEGORY_COLORS[tx.category] ?? "#B5AFA6") + "18",
                  }}
                >
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: CATEGORY_COLORS[tx.category] ?? "#B5AFA6",
                    }}
                  >
                    {tx.category.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2D2D2D] truncate">
                    {tx.description}
                  </p>
                  <p className="text-xs text-[#B5AFA6]">{tx.date}</p>
                </div>
              </div>
              <span
                className={`text-sm font-semibold shrink-0 ml-3 ${
                  tx.amount >= 0 ? "text-[#6B9B7A]" : "text-[#C4756E]"
                }`}
              >
                {tx.amount >= 0 ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
