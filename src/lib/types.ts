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
  /** "Available Balance" as reported by the bank — includes pending holds. */
  availableBalance?: number;
  /** "Balance" as reported by the bank — posted transactions only. */
  postedBalance?: number;
  /** Statement date the two balances above were read from (ISO). */
  balanceAsOf?: string;
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
  /** Authorization hold not yet posted. `balance` is unknown (0) for these. */
  pending?: boolean;
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
  frequency: "weekly" | "biweekly" | "monthly" | "custom";
  customMonths?: number;
  /**
   * A known due-date occurrence (ISO) that a custom interval counts from.
   * Without it "every N months on day D" has no starting point and collapses
   * to monthly. Only meaningful when frequency is "custom".
   */
  anchorDate?: string;
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
  | "insights"
  | "goals"
  | "investments"
  | "statements"
  | "budget";
