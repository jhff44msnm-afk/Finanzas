export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number;
  category: string;
  statementId: string;
}

export interface Statement {
  id: string;
  fileName: string;
  uploadDate: string;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

export interface InvestmentHolding {
  id: string;
  name: string;
  ticker?: string;
  type: "stock" | "retirement" | "insurance";
  currentValue: number;
  costBasis: number;
  history: { date: string; value: number }[];
}

export interface InsurancePolicy {
  id: string;
  type: "home" | "auto" | "life" | "health";
  provider: string;
  premium: number;
  premiumFrequency: "monthly" | "quarterly" | "annual";
  coverageAmount: number;
  nextPaymentDate: string;
}

export type AppView =
  | "dashboard"
  | "transactions"
  | "goals"
  | "investments"
  | "statements";
