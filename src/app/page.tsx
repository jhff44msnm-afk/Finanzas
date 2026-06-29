"use client";

import { useState } from "react";
import { AppProvider } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import Dashboard from "@/components/Dashboard";
import TransactionsView from "@/components/TransactionsView";
import GoalsView from "@/components/GoalsView";
import InvestmentsView from "@/components/InvestmentsView";
import StatementsView from "@/components/StatementsView";
import BudgetView from "@/components/BudgetView";
import type { AppView } from "@/lib/types";

const VIEWS: Record<AppView, React.ComponentType> = {
  dashboard: Dashboard,
  transactions: TransactionsView,
  budget: BudgetView,
  goals: GoalsView,
  investments: InvestmentsView,
  statements: StatementsView,
};

export default function Home() {
  const [view, setView] = useState<AppView>("dashboard");
  const View = VIEWS[view];

  return (
    <AppProvider>
      <div className="flex flex-col h-screen">
        <main className="flex-1 overflow-y-auto safe-top">
          <div className="max-w-2xl mx-auto px-4 pt-3 pb-28 lg:px-6 lg:pt-6">
            <View />
          </div>
        </main>
        <BottomNav current={view} onNavigate={setView} />
      </div>
    </AppProvider>
  );
}
