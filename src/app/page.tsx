"use client";

import { useState, useRef, useEffect } from "react";
import { AppProvider, useAppState, useAppDispatch } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import Dashboard from "@/components/Dashboard";
import TransactionsView from "@/components/TransactionsView";
import GoalsView from "@/components/GoalsView";
import InvestmentsView from "@/components/InvestmentsView";
import StatementsView from "@/components/StatementsView";
import BudgetView from "@/components/BudgetView";
import AccountSwitcher from "@/components/AccountSwitcher";
import type { AppView } from "@/lib/types";

const VIEWS: Record<AppView, React.ComponentType> = {
  dashboard: Dashboard,
  transactions: TransactionsView,
  budget: BudgetView,
  goals: GoalsView,
  investments: InvestmentsView,
  statements: StatementsView,
};

function AppContent() {
  const [view, setView] = useState<AppView>("dashboard");
  const [transitioning, setTransitioning] = useState(false);
  const [displayView, setDisplayView] = useState<AppView>("dashboard");
  const contentRef = useRef<HTMLDivElement>(null);

  const handleNavigate = (newView: AppView) => {
    if (newView === view) return;
    setTransitioning(true);
    setTimeout(() => {
      setView(newView);
      setDisplayView(newView);
      setTimeout(() => setTransitioning(false), 20);
    }, 150);
  };

  const View = VIEWS[displayView];

  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1 overflow-y-auto safe-top">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-28 lg:px-6 lg:pt-6">
          <AccountSwitcher />
          <div
            ref={contentRef}
            className={`transition-all duration-150 ease-in-out ${
              transitioning
                ? "opacity-0 translate-y-2"
                : "opacity-100 translate-y-0"
            }`}
          >
            <View />
          </div>
        </div>
      </main>
      <BottomNav current={view} onNavigate={handleNavigate} />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
