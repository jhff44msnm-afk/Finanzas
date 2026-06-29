const RATE_CACHE_KEY = "finanzas-exchange-rate";
const CACHE_TTL = 3600000; // 1 hour

interface CachedRate {
  rate: number;
  timestamp: number;
}

export function formatCurrency(amount: number, currency: "USD" | "MXN"): string {
  if (currency === "MXN") {
    return `MX$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrencySigned(amount: number, currency: "USD" | "MXN"): string {
  const prefix = amount >= 0 ? "+" : "-";
  return `${prefix}${formatCurrency(amount, currency)}`;
}

export function currencySymbol(currency: "USD" | "MXN"): string {
  return currency === "MXN" ? "MX$" : "$";
}

export async function getUsdMxnRate(): Promise<number> {
  try {
    const cached = localStorage.getItem(RATE_CACHE_KEY);
    if (cached) {
      const parsed: CachedRate = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.rate;
      }
    }
  } catch {}

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.MXN ?? 17.5;
      try {
        localStorage.setItem(
          RATE_CACHE_KEY,
          JSON.stringify({ rate, timestamp: Date.now() })
        );
      } catch {}
      return rate;
    }
  } catch {}

  return 17.5;
}
