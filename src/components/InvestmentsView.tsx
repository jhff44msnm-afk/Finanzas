"use client";

import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Briefcase,
  BarChart3,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Settings,
  ExternalLink,
} from "lucide-react";
import { useAppState, useAppDispatch } from "@/lib/store";
import type { InvestmentHolding, InsurancePolicy } from "@/lib/types";

type Tab = "stocks" | "retirement" | "insurance" | "suggestions";

const STOCK_BROKERAGES = [
  "Fidelity Investments", "Charles Schwab", "Vanguard", "TD Ameritrade",
  "E*TRADE", "Robinhood", "Merrill Edge", "Interactive Brokers",
  "Webull", "SoFi Invest", "Other",
];

const RETIREMENT_PROVIDERS = [
  "Fidelity 401(k)", "Vanguard 401(k)", "Charles Schwab IRA", "Fidelity IRA",
  "Vanguard IRA", "T. Rowe Price", "TIAA", "Empower Retirement",
  "Principal Financial", "ADP Retirement", "Other",
];

const INSURANCE_PROVIDERS: Record<InsurancePolicy["type"], string[]> = {
  auto: ["Progressive", "GEICO", "State Farm", "Allstate", "USAA", "Liberty Mutual", "Farmers", "Nationwide", "American Family", "Other"],
  home: ["State Farm", "Allstate", "USAA", "Liberty Mutual", "Farmers", "Nationwide", "Travelers", "American Family", "Erie Insurance", "Other"],
  life: ["Northwestern Mutual", "New York Life", "MassMutual", "Prudential", "MetLife", "Lincoln Financial", "State Farm", "Transamerica", "Other"],
  health: ["Blue Cross Blue Shield", "UnitedHealthcare", "Aetna", "Cigna", "Humana", "Kaiser Permanente", "Molina Healthcare", "Centene", "Other"],
};

const INSURANCE_LABELS: Record<InsurancePolicy["type"], string> = {
  home: "Home", auto: "Auto", life: "Life", health: "Health",
};

const INSURANCE_COLORS: Record<InsurancePolicy["type"], string> = {
  home: "#7C8C6E", auto: "#D4A76A", life: "#9B7EB5", health: "#6BA3A0",
};

interface StockSuggestion {
  ticker: string;
  name: string;
  sector: string;
  reason: string;
  potential: "high" | "medium";
  price?: number;
  change?: number;
}

const CURATED_STOCKS: StockSuggestion[] = [
  { ticker: "NVDA", name: "NVIDIA", sector: "Semiconductors", reason: "Leading AI/GPU infrastructure with dominant market share in data centers and AI training", potential: "high" },
  { ticker: "AAPL", name: "Apple", sector: "Technology", reason: "Strong ecosystem, growing services revenue, and consistent hardware innovation", potential: "medium" },
  { ticker: "MSFT", name: "Microsoft", sector: "Cloud & AI", reason: "Azure cloud growth, Copilot AI integration across products, enterprise dominance", potential: "high" },
  { ticker: "AMZN", name: "Amazon", sector: "Cloud & E-commerce", reason: "AWS cloud leadership, advertising growth, and logistics infrastructure", potential: "high" },
  { ticker: "GOOGL", name: "Alphabet", sector: "Search & AI", reason: "Search monopoly, YouTube growth, Gemini AI expansion, and cloud computing", potential: "medium" },
  { ticker: "LLY", name: "Eli Lilly", sector: "Pharmaceuticals", reason: "Weight-loss drug pipeline (Mounjaro/Zepbound) driving massive revenue growth", potential: "high" },
  { ticker: "AVGO", name: "Broadcom", sector: "Semiconductors", reason: "Custom AI chip demand, VMware integration, and networking infrastructure", potential: "high" },
  { ticker: "V", name: "Visa", sector: "Payments", reason: "Global digital payments growth, cross-border transaction recovery", potential: "medium" },
  { ticker: "TSLA", name: "Tesla", sector: "EVs & Energy", reason: "EV market leader, energy storage growth, and autonomous driving potential", potential: "high" },
  { ticker: "META", name: "Meta Platforms", sector: "Social & AI", reason: "Ad revenue optimization with AI, Reality Labs long-term bet, Threads growth", potential: "medium" },
];

const FINNHUB_KEY_STORAGE = "finanzas-finnhub-key";

function StockSuggestionsPanel() {
  const [stocks, setStocks] = useState<StockSuggestion[]>(CURATED_STOCKS);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(FINNHUB_KEY_STORAGE);
    if (saved) {
      setApiKey(saved);
      setKeyInput(saved);
    }
    const cached = localStorage.getItem("finanzas-stock-prices");
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 15 * 60 * 1000) {
          setStocks(data);
          setLastFetch(new Date(timestamp).toLocaleTimeString());
        }
      } catch {}
    }
  }, []);

  const fetchPrices = useCallback(async (key: string) => {
    if (!key) return;
    setLoading(true);
    try {
      const updated = [...CURATED_STOCKS];
      for (const stock of updated) {
        try {
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${stock.ticker}&token=${key}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.c && data.c > 0) {
              stock.price = data.c;
              stock.change = data.dp;
            }
          }
        } catch {}
      }
      setStocks(updated);
      const now = Date.now();
      setLastFetch(new Date(now).toLocaleTimeString());
      localStorage.setItem(
        "finanzas-stock-prices",
        JSON.stringify({ data: updated, timestamp: now })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      const cached = localStorage.getItem("finanzas-stock-prices");
      if (cached) {
        try {
          const { timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 15 * 60 * 1000) return;
        } catch {}
      }
      fetchPrices(apiKey);
    }
  }, [apiKey, fetchPrices]);

  const saveKey = () => {
    localStorage.setItem(FINNHUB_KEY_STORAGE, keyInput);
    setApiKey(keyInput);
    setShowSettings(false);
    if (keyInput) fetchPrices(keyInput);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#D4A76A]" />
          <h3 className="text-sm font-semibold text-[#2D2D2D]">Growth Stocks to Watch</h3>
        </div>
        <div className="flex items-center gap-1">
          {apiKey && (
            <button
              onClick={() => fetchPrices(apiKey)}
              disabled={loading}
              className="p-1.5 text-[#B5AFA6] hover:text-[#7C8C6E] rounded-lg transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 text-[#B5AFA6] hover:text-[#7C8C6E] rounded-lg transition-colors"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-[#F5F0EB] rounded-xl p-3 space-y-2">
          <p className="text-xs text-[#8B8578]">
            Enter your free Finnhub API key for live prices. Get one free at finnhub.io
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Your API key"
              className="flex-1 border border-[#E8E2DA] rounded-lg px-3 py-1.5 text-xs outline-none bg-white"
            />
            <button onClick={saveKey} className="bg-[#7C8C6E] text-white px-3 py-1.5 rounded-lg text-xs font-medium">
              Save
            </button>
          </div>
        </div>
      )}

      {lastFetch && (
        <p className="text-[10px] text-[#B5AFA6]">Prices updated at {lastFetch}</p>
      )}

      <div className="space-y-2">
        {stocks.map((stock) => (
          <div key={stock.ticker} className="bg-white rounded-2xl border border-[#E8E2DA] p-3.5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#2D2D2D]">{stock.ticker}</span>
                  <span className="text-xs text-[#B5AFA6]">{stock.name}</span>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                      stock.potential === "high"
                        ? "bg-[#6B9B7A]/12 text-[#6B9B7A]"
                        : "bg-[#D4A76A]/12 text-[#D4A76A]"
                    }`}
                  >
                    {stock.potential}
                  </span>
                </div>
                <p className="text-[10px] text-[#8B8578] uppercase tracking-wider mt-0.5">{stock.sector}</p>
                <p className="text-xs text-[#8B8578] mt-1 leading-relaxed">{stock.reason}</p>
              </div>
              {stock.price && (
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold text-[#2D2D2D]">${stock.price.toFixed(2)}</p>
                  {stock.change !== undefined && (
                    <p className={`text-xs font-medium flex items-center justify-end gap-0.5 ${
                      stock.change >= 0 ? "text-[#6B9B7A]" : "text-[#C4756E]"
                    }`}>
                      {stock.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#B5AFA6] text-center leading-relaxed">
        For informational purposes only. Not financial advice. Always do your own research before investing.
      </p>
    </div>
  );
}

export default function InvestmentsView() {
  const { investments, insurance } = useAppState();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<Tab>("suggestions");

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

  const inputClass = "w-full border border-[#E8E2DA] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#7C8C6E] bg-white text-[#2D2D2D]";

  const addStock = () => {
    const val = parseFloat(stockValue);
    const cost = parseFloat(stockCost);
    if (!stockName.trim() || isNaN(val) || isNaN(cost)) return;
    dispatch({
      type: "ADD_INVESTMENT",
      payload: {
        id: uuidv4(),
        name: `${stockName.trim()} (${stockBrokerage})`,
        ticker: stockTicker.trim() || undefined,
        type: "stock",
        currentValue: val,
        costBasis: cost,
        history: [{ date: new Date().toISOString().slice(0, 10), value: val }],
      },
    });
    setStockName(""); setStockTicker(""); setStockValue(""); setStockCost("");
    setShowAddStock(false);
  };

  const addRetirement = () => {
    const val = parseFloat(retirementValue);
    const cost = parseFloat(retirementCost);
    if (isNaN(val) || isNaN(cost)) return;
    dispatch({
      type: "ADD_INVESTMENT",
      payload: {
        id: uuidv4(),
        name: retirementName.trim() || retirementProvider,
        type: "retirement",
        currentValue: val,
        costBasis: cost,
        history: [{ date: new Date().toISOString().slice(0, 10), value: val }],
      },
    });
    setRetirementName(""); setRetirementValue(""); setRetirementCost("");
    setShowAddRetirement(false);
  };

  const addInsurance = () => {
    const premium = parseFloat(insPremium);
    const coverage = parseFloat(insCoverage);
    if (isNaN(premium) || isNaN(coverage)) return;
    dispatch({
      type: "ADD_INSURANCE",
      payload: {
        id: uuidv4(),
        type: insType,
        provider: insProvider,
        premium,
        premiumFrequency: insFrequency,
        coverageAmount: coverage,
        nextPaymentDate: insNextPayment,
      },
    });
    setInsPremium(""); setInsCoverage("");
    setShowAddInsurance(false);
  };

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: "suggestions", label: "Trending", icon: Sparkles },
    { key: "stocks", label: "Stocks", icon: BarChart3 },
    { key: "retirement", label: "Retire", icon: Briefcase },
    { key: "insurance", label: "Insure", icon: Shield },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-[#2D2D2D]">Invest</h2>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-3">
          <p className="text-[10px] text-[#8B8578] font-medium uppercase tracking-wider">Stocks</p>
          <p className="text-lg font-bold text-[#2D2D2D] mt-1">
            ${totalStockValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          {totalStockCost > 0 && (
            <p className={`text-[10px] font-medium ${totalStockValue - totalStockCost >= 0 ? "text-[#6B9B7A]" : "text-[#C4756E]"}`}>
              {totalStockValue - totalStockCost >= 0 ? "+" : ""}${(totalStockValue - totalStockCost).toFixed(2)}
            </p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-3">
          <p className="text-[10px] text-[#8B8578] font-medium uppercase tracking-wider">Retirement</p>
          <p className="text-lg font-bold text-[#2D2D2D] mt-1">
            ${totalRetirementValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-[#B5AFA6]">{retirement.length} acct{retirement.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-3">
          <p className="text-[10px] text-[#8B8578] font-medium uppercase tracking-wider">Insurance</p>
          <p className="text-lg font-bold text-[#2D2D2D] mt-1">${totalInsurancePremium.toFixed(2)}</p>
          <p className="text-[10px] text-[#B5AFA6]">/month</p>
        </div>
      </div>

      <div className="flex gap-1 bg-[#F5F0EB] p-1 rounded-2xl">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium rounded-xl transition-all ${
              tab === key
                ? "bg-white text-[#2D2D2D] shadow-sm"
                : "text-[#8B8578]"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "suggestions" && <StockSuggestionsPanel />}

      {tab === "stocks" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowAddStock(!showAddStock)} className="flex items-center gap-1.5 bg-[#7C8C6E] text-white px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-[#6B7A5E] transition-colors">
              <Plus size={16} /> Add Stock
            </button>
          </div>

          {showAddStock && (
            <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
              <h3 className="font-semibold text-[#2D2D2D] text-sm">New Stock</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Brokerage</label>
                  <select value={stockBrokerage} onChange={(e) => setStockBrokerage(e.target.value)} className={inputClass}>
                    {STOCK_BROKERAGES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Name</label>
                  <input type="text" value={stockName} onChange={(e) => setStockName(e.target.value)} placeholder="Apple Inc." className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Ticker</label>
                  <input type="text" value={stockTicker} onChange={(e) => setStockTicker(e.target.value)} placeholder="AAPL" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Value</label>
                  <input type="number" value={stockValue} onChange={(e) => setStockValue(e.target.value)} placeholder="0.00" step="0.01" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Cost Basis</label>
                  <input type="number" value={stockCost} onChange={(e) => setStockCost(e.target.value)} placeholder="0.00" step="0.01" className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addStock} className="bg-[#7C8C6E] text-white px-4 py-2 rounded-xl text-sm font-medium">Add</button>
                <button onClick={() => setShowAddStock(false)} className="bg-[#F5F0EB] text-[#5C5549] px-4 py-2 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          {stocks.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#7C8C6E]/10 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 size={24} className="text-[#7C8C6E]" />
                </div>
                <p className="text-[#8B8578] text-sm">No stock investments yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {stocks.map((s) => {
                const gain = s.currentValue - s.costBasis;
                const gainPct = s.costBasis > 0 ? (gain / s.costBasis) * 100 : 0;
                return (
                  <div key={s.id} className="bg-white rounded-2xl border border-[#E8E2DA] p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2D2D2D] truncate">{s.name}</p>
                      {s.ticker && <span className="text-[10px] text-[#B5AFA6] font-mono">{s.ticker}</span>}
                      <p className="text-lg font-bold text-[#2D2D2D] mt-1">${s.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      <p className={`text-xs font-medium flex items-center gap-1 ${gain >= 0 ? "text-[#6B9B7A]" : "text-[#C4756E]"}`}>
                        {gain >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {gain >= 0 ? "+" : ""}${gain.toFixed(2)} ({gainPct.toFixed(1)}%)
                      </p>
                    </div>
                    <button onClick={() => dispatch({ type: "DELETE_INVESTMENT", payload: s.id })} className="p-2 text-[#B5AFA6] hover:text-[#C4756E] hover:bg-[#C4756E]/10 rounded-xl">
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "retirement" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowAddRetirement(!showAddRetirement)} className="flex items-center gap-1.5 bg-[#7C8C6E] text-white px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-[#6B7A5E] transition-colors">
              <Plus size={16} /> Add Account
            </button>
          </div>

          {showAddRetirement && (
            <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
              <h3 className="font-semibold text-[#2D2D2D] text-sm">New Retirement Account</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Provider</label>
                  <select value={retirementProvider} onChange={(e) => setRetirementProvider(e.target.value)} className={inputClass}>
                    {RETIREMENT_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Account Name</label>
                  <input type="text" value={retirementName} onChange={(e) => setRetirementName(e.target.value)} placeholder="My 401(k)" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Value</label>
                  <input type="number" value={retirementValue} onChange={(e) => setRetirementValue(e.target.value)} placeholder="0.00" step="0.01" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Contributions</label>
                  <input type="number" value={retirementCost} onChange={(e) => setRetirementCost(e.target.value)} placeholder="0.00" step="0.01" className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addRetirement} className="bg-[#7C8C6E] text-white px-4 py-2 rounded-xl text-sm font-medium">Add</button>
                <button onClick={() => setShowAddRetirement(false)} className="bg-[#F5F0EB] text-[#5C5549] px-4 py-2 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          {retirement.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#D4A76A]/10 flex items-center justify-center mx-auto mb-3">
                  <Briefcase size={24} className="text-[#D4A76A]" />
                </div>
                <p className="text-[#8B8578] text-sm">No retirement accounts yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {retirement.map((r) => {
                const gain = r.currentValue - r.costBasis;
                const gainPct = r.costBasis > 0 ? (gain / r.costBasis) * 100 : 0;
                return (
                  <div key={r.id} className="bg-white rounded-2xl border border-[#E8E2DA] p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2D2D2D] truncate">{r.name}</p>
                      <p className="text-lg font-bold text-[#2D2D2D] mt-1">${r.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      <p className={`text-xs font-medium flex items-center gap-1 ${gain >= 0 ? "text-[#6B9B7A]" : "text-[#C4756E]"}`}>
                        {gain >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {gain >= 0 ? "+" : ""}${gain.toFixed(2)} ({gainPct.toFixed(1)}%)
                      </p>
                    </div>
                    <button onClick={() => dispatch({ type: "DELETE_INVESTMENT", payload: r.id })} className="p-2 text-[#B5AFA6] hover:text-[#C4756E] hover:bg-[#C4756E]/10 rounded-xl">
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "insurance" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowAddInsurance(!showAddInsurance)} className="flex items-center gap-1.5 bg-[#7C8C6E] text-white px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-[#6B7A5E] transition-colors">
              <Plus size={16} /> Add Policy
            </button>
          </div>

          {showAddInsurance && (
            <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
              <h3 className="font-semibold text-[#2D2D2D] text-sm">New Insurance Policy</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Type</label>
                  <select
                    value={insType}
                    onChange={(e) => { const t = e.target.value as InsurancePolicy["type"]; setInsType(t); setInsProvider(INSURANCE_PROVIDERS[t][0]); }}
                    className={inputClass}
                  >
                    <option value="auto">Auto</option>
                    <option value="home">Home</option>
                    <option value="life">Life</option>
                    <option value="health">Health</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Provider</label>
                  <select value={insProvider} onChange={(e) => setInsProvider(e.target.value)} className={inputClass}>
                    {INSURANCE_PROVIDERS[insType].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Premium</label>
                  <div className="flex gap-1">
                    <input type="number" value={insPremium} onChange={(e) => setInsPremium(e.target.value)} placeholder="0.00" step="0.01" className={inputClass} />
                    <select value={insFrequency} onChange={(e) => setInsFrequency(e.target.value as InsurancePolicy["premiumFrequency"])} className="border border-[#E8E2DA] rounded-xl px-2 py-2 text-xs outline-none bg-white shrink-0">
                      <option value="monthly">/mo</option>
                      <option value="quarterly">/qtr</option>
                      <option value="annual">/yr</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Coverage</label>
                  <input type="number" value={insCoverage} onChange={(e) => setInsCoverage(e.target.value)} placeholder="0" step="1" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Next Payment</label>
                  <input type="date" value={insNextPayment} onChange={(e) => setInsNextPayment(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addInsurance} className="bg-[#7C8C6E] text-white px-4 py-2 rounded-xl text-sm font-medium">Add</button>
                <button onClick={() => setShowAddInsurance(false)} className="bg-[#F5F0EB] text-[#5C5549] px-4 py-2 rounded-xl text-sm font-medium">Cancel</button>
              </div>
            </div>
          )}

          {insurance.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#9B7EB5]/10 flex items-center justify-center mx-auto mb-3">
                  <Shield size={24} className="text-[#9B7EB5]" />
                </div>
                <p className="text-[#8B8578] text-sm">No insurance policies yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {insurance.map((policy) => {
                const color = INSURANCE_COLORS[policy.type];
                return (
                  <div key={policy.id} className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl shrink-0" style={{ backgroundColor: color + "15" }}>
                          <Shield size={18} style={{ color }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#2D2D2D]">{INSURANCE_LABELS[policy.type]} Insurance</p>
                          <p className="text-xs text-[#8B8578]">{policy.provider}</p>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div>
                              <p className="text-[#B5AFA6]">Premium</p>
                              <p className="font-semibold text-[#2D2D2D]">
                                ${policy.premium.toFixed(2)}/{policy.premiumFrequency === "monthly" ? "mo" : policy.premiumFrequency === "quarterly" ? "qtr" : "yr"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[#B5AFA6]">Coverage</p>
                              <p className="font-semibold text-[#2D2D2D]">${policy.coverageAmount.toLocaleString()}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[#B5AFA6]">Next Payment</p>
                              <p className="font-semibold text-[#2D2D2D]">
                                {new Date(policy.nextPaymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => dispatch({ type: "DELETE_INSURANCE", payload: policy.id })} className="p-2 text-[#B5AFA6] hover:text-[#C4756E] hover:bg-[#C4756E]/10 rounded-xl shrink-0">
                        <Trash2 size={16} />
                      </button>
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
