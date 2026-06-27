const CATEGORY_RULES: [string[], string][] = [
  [
    ["DAIRY QUEEN", "TORTAS", "UBER *EATS", "SENOR SUSHI", "SUPERCENTER", "WAL-MART",
     "BEST CHICKEN", "CHAPA PRIME", "EL TACO", "SORIANA", "OXXO", "MACU CAF"],
    "Food & Dining",
  ],
  [["UBER *TRIP", "LYFT", "ALON DK", "TX429"], "Transportation"],
  [["SPOTIFY", "TODOMODA"], "Entertainment"],
  [["AUTOZONE", "TOSKA", "TOP BELLEZA", "CIBER FLY"], "Shopping"],
  [["T-MOBILE", "RMTLY*", "APPLE.COM BILL", "APPLE CASH"], "Bills & Subscriptions"],
  [["PROGRESSIVE INSU"], "Insurance"],
  [["TRNSFER FRM SV", "TRANSFER TO SV", "TRNSFER TO SV"], "Transfers"],
  [["FOREIGN TRANSACTION FEE"], "Fees"],
  [["PROV CR FRAUD", "REV PROV CR FRAUD", "MM PROV CR FRAUD"], "Adjustments"],
  [["PMT Credit"], "Payment"],
];

export function categorizeTransaction(description: string): string {
  const upper = description.toUpperCase();
  for (const [keywords, category] of CATEGORY_RULES) {
    if (keywords.some((kw) => upper.includes(kw.toUpperCase()))) {
      return category;
    }
  }
  return "Other";
}

export const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills & Subscriptions",
  "Insurance",
  "Transfers",
  "Fees",
  "Adjustments",
  "Payment",
  "Income",
  "Other",
];

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#ef4444",
  Transportation: "#f97316",
  Entertainment: "#a855f7",
  Shopping: "#ec4899",
  "Bills & Subscriptions": "#3b82f6",
  Insurance: "#06b6d4",
  Transfers: "#6b7280",
  Fees: "#78716c",
  Adjustments: "#84cc16",
  Payment: "#22c55e",
  Income: "#10b981",
  Other: "#94a3b8",
};
