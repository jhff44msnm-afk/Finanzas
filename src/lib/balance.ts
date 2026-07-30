import type { Account, Transaction } from "./types";

export interface BalanceInfo {
  /** What the account is actually worth right now — pending holds included. */
  available: number;
  /** Balance of posted transactions only. */
  posted: number;
  /** Sum of pending holds (negative for charges). */
  pendingTotal: number;
  /** Number of pending holds behind `pendingTotal`. */
  pendingCount: number;
  /** True when `available` came from the bank's own "Available Balance". */
  fromBank: boolean;
}

const EMPTY: BalanceInfo = {
  available: 0,
  posted: 0,
  pendingTotal: 0,
  pendingCount: 0,
  fromBank: false,
};

/** Running balance of the newest posted transaction. */
function postedBalanceFromTransactions(txs: Transaction[]): number {
  const posted = txs.filter((t) => !t.pending);
  if (posted.length === 0) return 0;
  const sorted = [...posted].sort((a, b) => {
    const dateCmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCmp !== 0) return dateCmp;
    return (a.seq ?? 0) - (b.seq ?? 0);
  });
  return sorted[sorted.length - 1].balance;
}

/**
 * Current balance for a single account.
 *
 * The bank's reported "Available Balance" wins when we have it — that is the
 * real spendable number, and it already accounts for pending holds. Manual
 * entries added after the statement date are applied on top so the figure
 * stays live. Without a bank figure we fall back to the newest posted running
 * balance minus outstanding holds.
 */
export function accountBalance(
  account: Account | undefined,
  txs: Transaction[]
): BalanceInfo {
  if (txs.length === 0 && account?.availableBalance === undefined) return EMPTY;

  const pending = txs.filter((t) => t.pending);
  const pendingTotal = pending.reduce((sum, t) => sum + t.amount, 0);
  const derivedPosted = postedBalanceFromTransactions(txs);

  if (account?.availableBalance !== undefined) {
    const asOf = account.balanceAsOf;
    const laterManual = txs
      .filter((t) => t.source === "manual" && (!asOf || t.date > asOf))
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      available: account.availableBalance + laterManual,
      posted: (account.postedBalance ?? derivedPosted) + laterManual,
      pendingTotal,
      pendingCount: pending.length,
      fromBank: true,
    };
  }

  return {
    available: derivedPosted + pendingTotal,
    posted: derivedPosted,
    pendingTotal,
    pendingCount: pending.length,
    fromBank: false,
  };
}

/**
 * Balance across a set of accounts. Transactions with no `accountId` are
 * treated as belonging to the single active account, matching how the views
 * filter them.
 */
export function totalBalance(
  accounts: Account[],
  transactions: Transaction[],
  activeAccountId: string
): BalanceInfo {
  if (activeAccountId !== "all") {
    const account = accounts.find((a) => a.id === activeAccountId);
    const txs = transactions.filter(
      (t) => t.accountId === activeAccountId || !t.accountId
    );
    return accountBalance(account, txs);
  }

  if (accounts.length === 0) return accountBalance(undefined, transactions);

  const combined = accounts.reduce<BalanceInfo>(
    (acc, account) => {
      const txs = transactions.filter((t) => t.accountId === account.id);
      const info = accountBalance(account, txs);
      return {
        available: acc.available + info.available,
        posted: acc.posted + info.posted,
        pendingTotal: acc.pendingTotal + info.pendingTotal,
        pendingCount: acc.pendingCount + info.pendingCount,
        fromBank: acc.fromBank || info.fromBank,
      };
    },
    { ...EMPTY }
  );

  // Untagged transactions predate multi-account support; fold them in too.
  const orphans = transactions.filter((t) => !t.accountId);
  if (orphans.length > 0) {
    const info = accountBalance(undefined, orphans);
    return {
      available: combined.available + info.available,
      posted: combined.posted + info.posted,
      pendingTotal: combined.pendingTotal + info.pendingTotal,
      pendingCount: combined.pendingCount + info.pendingCount,
      fromBank: combined.fromBank,
    };
  }

  return combined;
}
