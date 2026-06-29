const CATEGORY_RULES: [string[], string][] = [
  [
    ["DAIRY QUEEN", "TORTAS", "UBER *EATS", "SENOR SUSHI", "SUPERCENTER", "WAL-MART",
     "BEST CHICKEN", "CHAPA PRIME", "EL TACO", "SORIANA", "OXXO", "MACU CAF",
     "CARNICERIA", "SUPERETTE", "S MART", "SMART ", "REST ", "WENDYS",
     "MATSURI", "STEAK", "GROCERY", "FOOD"],
    "Food & Dining",
  ],
  [["UBER *TRIP", "LYFT", "ALON DK", "TX429", "DIDI RIDES", "DLO*DIDI", "DLO DIDI"], "Transportation"],
  [["SPOTIFY", "TODOMODA", "NETFLIX", "SHEIN", "TIPSY CHAT"], "Entertainment"],
  [["AUTOZONE", "TOSKA", "TOP BELLEZA", "CIBER FLY", "FERRETERIA", "MERCADO PAGO", "POCKETS"], "Shopping"],
  [["T-MOBILE", "RMTLY*", "APPLE.COM BILL", "APPLE CASH"], "Bills & Subscriptions"],
  [["PROGRESSIVE INSU"], "Insurance"],
  [["TRNSFER FRM SV", "TRANSFER TO SV", "TRNSFER TO SV", "PAGO CUENTA DE TERCERO", "SPEI RECIBIDO"], "Transfers"],
  [["FOREIGN TRANSACTION FEE", "COMISION"], "Fees"],
  [["PROV CR FRAUD", "REV PROV CR FRAUD", "MM PROV CR FRAUD"], "Adjustments"],
  [["PMT Credit", "DEPOSITO"], "Payment"],
  [["RETIRO CAJERO"], "ATM"],
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
  "ATM",
  "Income",
  "Other",
];

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#C4756E",
  Transportation: "#D4A76A",
  Entertainment: "#9B7EB5",
  Shopping: "#C48B9F",
  "Bills & Subscriptions": "#7C8C6E",
  Insurance: "#6BA3A0",
  Transfers: "#8B8578",
  Fees: "#A89585",
  Adjustments: "#8B9F6B",
  Payment: "#6B9B7A",
  ATM: "#8B7355",
  Income: "#6B9B7A",
  Other: "#B5AFA6",
};
