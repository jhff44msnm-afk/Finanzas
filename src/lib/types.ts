export type AccountType = "us" | "mx";

export interface Account {
  id: string;
  name: string;
  bankName: string;
  type: AccountType;
  currency: "USD" | "MXN";
  routingNumber?: string;
  accountNumber?: string;
  cuentaNumber?: string;
  clabeNumber?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number;
  category: string;
  statementId: string;
  seq: number;
  accountId?: string;
  source?: "statement" | "manual";
}

export interface Statement {
  id: string;
  fileName: string;
  uploadDate: string;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  accountId?: string;
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

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  dueDay: number;
  category: string;
  accountId?: string;
}

export interface BillPayment {
  id: string;
  billId: string;
  paidDate: string;
  dueDate: string;
  amount: number;
  onTime: boolean;
}

export type AppView =
  | "dashboard"
  | "transactions"
  | "goals"
  | "investments"
  | "statements"
  | "budget";
