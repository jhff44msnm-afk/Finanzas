"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Briefcase,
  BarChart3,
} from "lucide-react";
import { useAppState } from "@/lib/store";
import type { InvestmentHolding } from "@/lib/types";

type Tab = "stocks" | "retirement" | "insurance";

const STOCK_COLORS = ["#3b82f6", "#10b981", "#f97316", "#a855f7", "#ef4444"];

function InvestmentCard({
  holding,
  color,
}: {
  holding: InvestmentHolding;
  color: string;
}) {
  const gain = holding.currentValue - holding.costBasis;
  const gainPct = (gain / holding.costBasis) * 100;
  const isPositive = gain >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-semibold text-gray-800">{holding.name}</h4>
          {holding.ticker && (
            <span className="text-xs text-gray-400 font-mono">
              {holding.ticker}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-800">
            ${holding.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p
            className={`text-sm font-medium flex items-center justify-end gap-1 ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isPositive ? "+" : ""}${gain.toFixed(2)} ({gainPct.toFixed(1)}%)
          </p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={holding.history}>
          <defs>
            <linearGradient id={`grad-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${holding.id})`}
          />
          <Tooltip
            formatter={(v) => [`$${Number(v).toFixed(2)}`, "Value"]}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const INSURANCE_ICONS = {
  home: Shield,
  auto: Shield,
  life: Shield,
  health: Shield,
};

const INSURANCE_LABELS = {
  home: "Home Insurance",
  auto: "Auto Insurance",
  life: "Life Insurance",
  health: "Health Insurance",
};

const INSURANCE_COLORS = {
  home: "#3b82f6",
  auto: "#f97316",
  life: "#a855f7",
  health: "#10b981",
};

export default function InvestmentsView() {
  const { investments, insurance } = useAppState();
  const [tab, setTab] = useState<Tab>("stocks");

  const stocks = investments.filter((i) => i.type === "stock");
  const retirement = investments.filter((i) => i.type === "retirement");

  const totalStockValue = stocks.reduce((s, i) => s + i.currentValue, 0);
  const totalStockCost = stocks.reduce((s, i) => s + i.costBasis, 0);
  const totalRetirementValue = retirement.reduce(
    (s, i) => s + i.currentValue,
    0
  );
  const totalInsurancePremium = insurance.reduce((s, i) => {
    if (i.premiumFrequency === "annual") return s + i.premium / 12;
    if (i.premiumFrequency === "quarterly") return s + i.premium / 3;
    return s + i.premium;
  }, 0);

  const portfolioHistory = stocks[0]?.history.map((_, idx) => {
    const point: Record<string, string | number> = {
      date: stocks[0].history[idx].date,
    };
    for (const s of stocks) {
      if (s.history[idx]) point[s.ticker || s.name] = s.history[idx].value;
    }
    return point;
  });

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: "stocks", label: "Stock Market", icon: BarChart3 },
    { key: "retirement", label: "Retirement", icon: Briefcase },
    { key: "insurance", label: "Insurance", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Investments</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Stock Portfolio</p>
          <p className="text-2xl font-bold text-gray-800">
            ${totalStockValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p
            className={`text-sm ${totalStockValue - totalStockCost >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {totalStockValue - totalStockCost >= 0 ? "+" : ""}$
            {(totalStockValue - totalStockCost).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Retirement Accounts</p>
          <p className="text-2xl font-bold text-gray-800">
            ${totalRetirementValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-gray-400">
            {retirement.length} accounts
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Insurance (Monthly)</p>
          <p className="text-2xl font-bold text-gray-800">
            ${totalInsurancePremium.toFixed(2)}
          </p>
          <p className="text-sm text-gray-400">
            {insurance.length} policies
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === "stocks" && (
        <div className="space-y-6">
          {portfolioHistory && portfolioHistory.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Portfolio Performance
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={portfolioHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    tickFormatter={(d) =>
                      new Date(String(d)).toLocaleDateString("en-US", {
                        month: "short",
                      })
                    }
                  />
                  <YAxis
                    fontSize={11}
                    tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`}
                  />
                  <Tooltip
                    formatter={(v) => `$${Number(v).toFixed(2)}`}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  {stocks.map((s, i) => (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.ticker || s.name}
                      stroke={STOCK_COLORS[i]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map((s, i) => (
              <InvestmentCard
                key={s.id}
                holding={s}
                color={STOCK_COLORS[i]}
              />
            ))}
          </div>
        </div>
      )}

      {tab === "retirement" && (
        <div className="space-y-6">
          {retirement.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Retirement Growth
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={retirement[0].history.map((_, idx) => {
                    const point: Record<string, string | number> = {
                      date: retirement[0].history[idx].date,
                    };
                    for (const r of retirement) {
                      if (r.history[idx])
                        point[r.name] = r.history[idx].value;
                    }
                    return point;
                  })}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    tickFormatter={(d) =>
                      new Date(String(d)).toLocaleDateString("en-US", {
                        month: "short",
                        year: "2-digit",
                      })
                    }
                  />
                  <YAxis
                    fontSize={11}
                    tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v) => `$${Number(v).toFixed(2)}`}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  {retirement.map((r, i) => (
                    <Area
                      key={r.id}
                      type="monotone"
                      dataKey={r.name}
                      stroke={STOCK_COLORS[i]}
                      fill={STOCK_COLORS[i]}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {retirement.map((r, i) => (
              <InvestmentCard
                key={r.id}
                holding={r}
                color={STOCK_COLORS[i]}
              />
            ))}
          </div>
        </div>
      )}

      {tab === "insurance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insurance.map((policy) => {
            const Icon = INSURANCE_ICONS[policy.type];
            const color = INSURANCE_COLORS[policy.type];
            return (
              <div
                key={policy.id}
                className="bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: color + "15" }}
                  >
                    <Icon size={24} style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">
                      {INSURANCE_LABELS[policy.type]}
                    </h4>
                    <p className="text-sm text-gray-500">{policy.provider}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">Premium</p>
                        <p className="font-semibold text-gray-700">
                          ${policy.premium.toFixed(2)}/{policy.premiumFrequency === "monthly" ? "mo" : policy.premiumFrequency === "quarterly" ? "qtr" : "yr"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Coverage</p>
                        <p className="font-semibold text-gray-700">
                          ${policy.coverageAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-400">Next Payment</p>
                        <p className="font-semibold text-gray-700">
                          {new Date(policy.nextPaymentDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
