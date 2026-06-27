import type { InvestmentHolding, InsurancePolicy } from "./types";

function generateHistory(
  base: number,
  volatility: number,
  months: number
): { date: string; value: number }[] {
  const history: { date: string; value: number }[] = [];
  let value = base * (1 - volatility * months * 0.01);
  const now = new Date();
  for (let i = months; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const change = (Math.random() - 0.4) * volatility * value * 0.01;
    value = Math.max(value + change, base * 0.3);
    history.push({
      date: d.toISOString().slice(0, 10),
      value: Math.round(value * 100) / 100,
    });
  }
  history[history.length - 1].value = base;
  return history;
}

export const MOCK_INVESTMENTS: InvestmentHolding[] = [
  {
    id: "inv1",
    name: "S&P 500 ETF",
    ticker: "SPY",
    type: "stock",
    currentValue: 12450.0,
    costBasis: 10800.0,
    history: generateHistory(12450, 3, 12),
  },
  {
    id: "inv2",
    name: "Apple Inc.",
    ticker: "AAPL",
    type: "stock",
    currentValue: 5230.0,
    costBasis: 4200.0,
    history: generateHistory(5230, 5, 12),
  },
  {
    id: "inv3",
    name: "Tesla Inc.",
    ticker: "TSLA",
    type: "stock",
    currentValue: 3100.0,
    costBasis: 3800.0,
    history: generateHistory(3100, 8, 12),
  },
  {
    id: "inv4",
    name: "401(k) - Fidelity",
    type: "retirement",
    currentValue: 45200.0,
    costBasis: 38000.0,
    history: generateHistory(45200, 2, 24),
  },
  {
    id: "inv5",
    name: "Roth IRA",
    type: "retirement",
    currentValue: 18750.0,
    costBasis: 15000.0,
    history: generateHistory(18750, 2.5, 24),
  },
  {
    id: "inv6",
    name: "Traditional IRA",
    type: "retirement",
    currentValue: 8900.0,
    costBasis: 7500.0,
    history: generateHistory(8900, 2, 18),
  },
];

export const MOCK_INSURANCE: InsurancePolicy[] = [
  {
    id: "ins1",
    type: "auto",
    provider: "Progressive",
    premium: 89.93,
    premiumFrequency: "monthly",
    coverageAmount: 50000,
    nextPaymentDate: "2026-07-23",
  },
  {
    id: "ins2",
    type: "health",
    provider: "Blue Cross Blue Shield",
    premium: 320.0,
    premiumFrequency: "monthly",
    coverageAmount: 500000,
    nextPaymentDate: "2026-07-01",
  },
  {
    id: "ins3",
    type: "life",
    provider: "Northwestern Mutual",
    premium: 45.0,
    premiumFrequency: "monthly",
    coverageAmount: 250000,
    nextPaymentDate: "2026-07-15",
  },
  {
    id: "ins4",
    type: "home",
    provider: "State Farm",
    premium: 1200.0,
    premiumFrequency: "annual",
    coverageAmount: 300000,
    nextPaymentDate: "2026-09-01",
  },
];
