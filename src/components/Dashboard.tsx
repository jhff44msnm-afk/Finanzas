"use client";

import { useMemo } from "react";
import {
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  DollarSign,
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
  const dayOfMonth = d.getDate();
  return Math.ceil(dayOfMonth / 7);
}

function getWeekLabel(weekNum: number): string {
  return `Week ${weekNum}`;
}

export default function Dashboard() {
  const { transactions } = useAppState();

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
      };
    }

    const nonTransfer = transactions.filter(
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
        name: getWeekLabel(week),
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

    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const currentBalance = sorted[0]?.balance ?? 0;

    return {
      totalIncome,
      totalExpenses,
      netFlow: totalIncome - totalExpenses,
      txCount: transactions.length,
      weeklyData,
      categoryData,
      recentTx: sorted.slice(0, 8),
      currentBalance,
    };
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <DollarSign size={64} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Welcome to Finanzas
          </h2>
          <p className="text-gray-500">
            Upload a bank statement in the Statements section to get started.
            Your transactions will be automatically parsed and categorized.
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Current Balance",
      value: stats.currentBalance,
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Income",
      value: stats.totalIncome,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Total Expenses",
      value: stats.totalExpenses,
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Transactions",
      value: stats.txCount,
      icon: ArrowLeftRight,
      color: "text-purple-600",
      bg: "bg-purple-50",
      isCurrency: false,
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon size={20} className={card.color} />
              </div>
              <span className="text-sm text-gray-500">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {card.isCurrency === false
                ? card.value
                : `$${card.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Weekly Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value) => `$${Number(value).toFixed(2)}`}
              />
              <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Expenses by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
                fontSize={11}
              >
                {stats.categoryData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_COLORS[entry.name] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Recent Transactions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">
                  Date
                </th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">
                  Description
                </th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">
                  Category
                </th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">
                  Amount
                </th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentTx.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="py-2 px-3 text-gray-600">{tx.date}</td>
                  <td className="py-2 px-3 text-gray-800 font-medium">
                    {tx.description}
                  </td>
                  <td className="py-2 px-3">
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
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-medium ${
                      tx.amount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600">
                    ${tx.balance.toFixed(2)}
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
