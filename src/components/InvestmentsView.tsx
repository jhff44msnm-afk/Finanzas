"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Briefcase,
  BarChart3,
  Plus,
  Trash2,
} from "lucide-react";
import { useAppState, useAppDispatch } from "@/lib/store";
import type { InvestmentHolding, InsurancePolicy } from "@/lib/types";

type Tab = "stocks" | "retirement" | "insurance";

const STOCK_BROKERAGES = [
  "Fidelity Investments",
  "Charles Schwab",
  "Vanguard",
  "TD Ameritrade",
  "E*TRADE",
  "Robinhood",
  "Merrill Edge",
  "Interactive Brokers",
  "Webull",
  "SoFi Invest",
  "Other",
];

const RETIREMENT_PROVIDERS = [
  "Fidelity 401(k)",
  "Vanguard 401(k)",
  "Charles Schwab IRA",
  "Fidelity IRA",
  "Vanguard IRA",
  "T. Rowe Price",
  "TIAA",
  "Empower Retirement",
  "Principal Financial",
  "ADP Retirement",
  "Other",
];

const INSURANCE_PROVIDERS: Record<InsurancePolicy["type"], string[]> = {
  auto: [
    "Progressive",
    "GEICO",
    "State Farm",
    "Allstate",
    "USAA",
    "Liberty Mutual",
    "Farmers",
    "Nationwide",
    "American Family",
    "Other",
  ],
  home: [
    "State Farm",
    "Allstate",
    "USAA",
    "Liberty Mutual",
    "Farmers",
    "Nationwide",
    "Travelers",
    "American Family",
    "Erie Insurance",
    "Other",
  ],
  life: [
    "Northwestern Mutual",
    "New York Life",
    "MassMutual",
    "Prudential",
    "MetLife",
    "Lincoln Financial",
    "State Farm",
    "Transamerica",
    "Other",
  ],
  health: [
    "Blue Cross Blue Shield",
    "UnitedHealthcare",
    "Aetna",
    "Cigna",
    "Humana",
    "Kaiser Permanente",
    "Molina Healthcare",
    "Centene",
    "Other",
  ],
};

const INSURANCE_LABELS: Record<InsurancePolicy["type"], string> = {
  home: "Home Insurance",
  auto: "Auto Insurance",
  life: "Life Insurance",
  health: "Health Insurance",
};

const INSURANCE_COLORS: Record<InsurancePolicy["type"], string> = {
  home: "#3b82f6",
  auto: "#f97316",
  life: "#a855f7",
  health: "#10b981",
};

export default function InvestmentsView() {
  const { investments, insurance } = useAppState();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>("stocks");

  const [showAddStock, setShowAddStock] = useState(false);
  const [stockName, setStockName] = useState("");
  const [stockTicker, setStockTicker] = useState("");
  const [stockBrokerage, setStockBrokerage] = useState(STOCK_BROKERAGES[0]);
  const [stockValue, setStockValue] = useState("");
  const [stockCost, setStockCost] = useState("");

  const [showAddRetirement, setShowAddRetirement] = useState(false);
  const [retirementProvider, setRetirementProvider] = useState(RETIREMENT_PROVIDERS[0]);
  const [retirementName, setRetirementName] = useState("");
  const [retirementValue, setRetirementValue] = useState("");
  const [retirementCost, setRetirementCost] = useState("");

  const [showAddInsurance, setShowAddInsurance] = useState(false);
  const [insType, setInsType] = useState<InsurancePolicy["type"]>("auto");
  const [insProvider, setInsProvider] = useState(INSURANCE_PROVIDERS.auto[0]);
  const [insPremium, setInsPremium] = useState("");
  const [insFrequency, setInsFrequency] = useState<InsurancePolicy["premiumFrequency"]>("monthly");
  const [insCoverage, setInsCoverage] = useState("");
  const [insNextPayment, setInsNextPayment] = useState(new Date().toISOString().slice(0, 10));

  const stocks = investments.filter((i) => i.type === "stock");
  const retirement = investments.filter((i) => i.type === "retirement");

  const totalStockValue = stocks.reduce((s, i) => s + i.currentValue, 0);
  const totalStockCost = stocks.reduce((s, i) => s + i.costBasis, 0);
  const totalRetirementValue = retirement.reduce((s, i) => s + i.currentValue, 0);
  const totalInsurancePremium = insurance.reduce((s, i) => {
    if (i.premiumFrequency === "annual") return s + i.premium / 12;
    if (i.premiumFrequency === "quarterly") return s + i.premium / 3;
    return s + i.premium;
  }, 0);

  const addStock = () => {
    const val = parseFloat(stockValue);
    const cost = parseFloat(stockCost);
    if (!stockName.trim() || isNaN(val) || isNaN(cost)) return;
    const holding: InvestmentHolding = {
      id: uuidv4(),
      name: `${stockName.trim()} (${stockBrokerage})`,
      ticker: stockTicker.trim() || undefined,
      type: "stock",
      currentValue: val,
      costBasis: cost,
      history: [{ date: new Date().toISOString().slice(0, 10), value: val }],
    };
    dispatch({ type: "ADD_INVESTMENT", payload: holding });
    setStockName("");
    setStockTicker("");
    setStockValue("");
    setStockCost("");
    setShowAddStock(false);
  };

  const addRetirement = () => {
    const val = parseFloat(retirementValue);
    const cost = parseFloat(retirementCost);
    if (isNaN(val) || isNaN(cost)) return;
    const name = retirementName.trim() || retirementProvider;
    const holding: InvestmentHolding = {
      id: uuidv4(),
      name,
      type: "retirement",
      currentValue: val,
      costBasis: cost,
      history: [{ date: new Date().toISOString().slice(0, 10), value: val }],
    };
    dispatch({ type: "ADD_INVESTMENT", payload: holding });
    setRetirementName("");
    setRetirementValue("");
    setRetirementCost("");
    setShowAddRetirement(false);
  };

  const addInsurance = () => {
    const premium = parseFloat(insPremium);
    const coverage = parseFloat(insCoverage);
    if (isNaN(premium) || isNaN(coverage)) return;
    const policy: InsurancePolicy = {
      id: uuidv4(),
      type: insType,
      provider: insProvider,
      premium,
      premiumFrequency: insFrequency,
      coverageAmount: coverage,
      nextPaymentDate: insNextPayment,
    };
    dispatch({ type: "ADD_INSURANCE", payload: policy });
    setInsPremium("");
    setInsCoverage("");
    setShowAddInsurance(false);
  };

  const deleteInvestment = (id: string) => {
    dispatch({ type: "DELETE_INVESTMENT", payload: id });
  };

  const deleteInsurance = (id: string) => {
    dispatch({ type: "DELETE_INSURANCE", payload: id });
  };

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: "stocks", label: "Stock Market", icon: BarChart3 },
    { key: "retirement", label: "Retirement", icon: Briefcase },
    { key: "insurance", label: "Insurance", icon: Shield },
  ];

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Investments</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Stock Portfolio</p>
          <p className="text-2xl font-bold text-gray-800">
            ${totalStockValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          {totalStockCost > 0 && (
            <p className={`text-sm ${totalStockValue - totalStockCost >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalStockValue - totalStockCost >= 0 ? "+" : ""}$
              {(totalStockValue - totalStockCost).toFixed(2)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Retirement Accounts</p>
          <p className="text-2xl font-bold text-gray-800">
            ${totalRetirementValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-gray-400">{retirement.length} account{retirement.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Insurance (Monthly)</p>
          <p className="text-2xl font-bold text-gray-800">
            ${totalInsurancePremium.toFixed(2)}
          </p>
          <p className="text-sm text-gray-400">{insurance.length} polic{insurance.length !== 1 ? "ies" : "y"}</p>
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
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddStock(!showAddStock)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Stock
            </button>
          </div>

          {showAddStock && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-700">New Stock Investment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Brokerage</label>
                  <select value={stockBrokerage} onChange={(e) => setStockBrokerage(e.target.value)} className={inputClass}>
                    {STOCK_BROKERAGES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Stock / Fund Name</label>
                  <input type="text" value={stockName} onChange={(e) => setStockName(e.target.value)} placeholder="e.g. Apple Inc." className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ticker (optional)</label>
                  <input type="text" value={stockTicker} onChange={(e) => setStockTicker(e.target.value)} placeholder="e.g. AAPL" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current Value</label>
                  <input type="number" value={stockValue} onChange={(e) => setStockValue(e.target.value)} placeholder="0.00" step="0.01" min="0" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cost Basis</label>
                  <input type="number" value={stockCost} onChange={(e) => setStockCost(e.target.value)} placeholder="0.00" step="0.01" min="0" className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addStock} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Add</button>
                <button onClick={() => setShowAddStock(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          )}

          {stocks.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <BarChart3 size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-lg">No stock investments yet.</p>
                <p className="text-gray-400 text-sm mt-1">Add your first stock investment above.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stocks.map((s) => {
                const gain = s.currentValue - s.costBasis;
                const gainPct = s.costBasis > 0 ? (gain / s.costBasis) * 100 : 0;
                const isPositive = gain >= 0;
                return (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-800">{s.name}</h4>
                        {s.ticker && <span className="text-xs text-gray-400 font-mono">{s.ticker}</span>}
                      </div>
                      <button onClick={() => deleteInvestment(s.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-3">
                      <p className="text-lg font-bold text-gray-800">
                        ${s.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-sm font-medium flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {isPositive ? "+" : ""}${gain.toFixed(2)} ({gainPct.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "retirement" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddRetirement(!showAddRetirement)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Retirement Account
            </button>
          </div>

          {showAddRetirement && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-700">New Retirement Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Provider</label>
                  <select value={retirementProvider} onChange={(e) => setRetirementProvider(e.target.value)} className={inputClass}>
                    {RETIREMENT_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Account Name (optional)</label>
                  <input type="text" value={retirementName} onChange={(e) => setRetirementName(e.target.value)} placeholder="e.g. My 401(k)" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current Value</label>
                  <input type="number" value={retirementValue} onChange={(e) => setRetirementValue(e.target.value)} placeholder="0.00" step="0.01" min="0" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Total Contributions</label>
                  <input type="number" value={retirementCost} onChange={(e) => setRetirementCost(e.target.value)} placeholder="0.00" step="0.01" min="0" className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addRetirement} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Add</button>
                <button onClick={() => setShowAddRetirement(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          )}

          {retirement.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Briefcase size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-lg">No retirement accounts yet.</p>
                <p className="text-gray-400 text-sm mt-1">Add your 401(k), IRA, or other retirement accounts above.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {retirement.map((r) => {
                const gain = r.currentValue - r.costBasis;
                const gainPct = r.costBasis > 0 ? (gain / r.costBasis) * 100 : 0;
                const isPositive = gain >= 0;
                return (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-800">{r.name}</h4>
                      </div>
                      <button onClick={() => deleteInvestment(r.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-3">
                      <p className="text-lg font-bold text-gray-800">
                        ${r.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-sm font-medium flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {isPositive ? "+" : ""}${gain.toFixed(2)} ({gainPct.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "insurance" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddInsurance(!showAddInsurance)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add Insurance Policy
            </button>
          </div>

          {showAddInsurance && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="font-semibold text-gray-700">New Insurance Policy</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select
                    value={insType}
                    onChange={(e) => {
                      const t = e.target.value as InsurancePolicy["type"];
                      setInsType(t);
                      setInsProvider(INSURANCE_PROVIDERS[t][0]);
                    }}
                    className={inputClass}
                  >
                    <option value="auto">Auto Insurance</option>
                    <option value="home">Home Insurance</option>
                    <option value="life">Life Insurance</option>
                    <option value="health">Health Insurance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Provider</label>
                  <select value={insProvider} onChange={(e) => setInsProvider(e.target.value)} className={inputClass}>
                    {INSURANCE_PROVIDERS[insType].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Premium</label>
                  <div className="flex gap-2">
                    <input type="number" value={insPremium} onChange={(e) => setInsPremium(e.target.value)} placeholder="0.00" step="0.01" min="0" className={inputClass} />
                    <select value={insFrequency} onChange={(e) => setInsFrequency(e.target.value as InsurancePolicy["premiumFrequency"])} className="border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none shrink-0">
                      <option value="monthly">/mo</option>
                      <option value="quarterly">/qtr</option>
                      <option value="annual">/yr</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Coverage Amount</label>
                  <input type="number" value={insCoverage} onChange={(e) => setInsCoverage(e.target.value)} placeholder="0.00" step="1" min="0" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Next Payment Date</label>
                  <input type="date" value={insNextPayment} onChange={(e) => setInsNextPayment(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addInsurance} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Add</button>
                <button onClick={() => setShowAddInsurance(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
              </div>
            </div>
          )}

          {insurance.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Shield size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-lg">No insurance policies yet.</p>
                <p className="text-gray-400 text-sm mt-1">Add your auto, home, life, or health insurance above.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insurance.map((policy) => {
                const color = INSURANCE_COLORS[policy.type];
                return (
                  <div key={policy.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: color + "15" }}>
                        <Shield size={24} style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-800">{INSURANCE_LABELS[policy.type]}</h4>
                            <p className="text-sm text-gray-500">{policy.provider}</p>
                          </div>
                          <button onClick={() => deleteInsurance(policy.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-400">Premium</p>
                            <p className="font-semibold text-gray-700">
                              ${policy.premium.toFixed(2)}/{policy.premiumFrequency === "monthly" ? "mo" : policy.premiumFrequency === "quarterly" ? "qtr" : "yr"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Coverage</p>
                            <p className="font-semibold text-gray-700">${policy.coverageAmount.toLocaleString()}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-400">Next Payment</p>
                            <p className="font-semibold text-gray-700">
                              {new Date(policy.nextPaymentDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
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
      )}
    </div>
  );
}
