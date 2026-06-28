"use client";

import { useState } from "react";
import { AppProvider } from "@/lib/store";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import TransactionsView from "@/components/TransactionsView";
import GoalsView from "@/components/GoalsView";
import InvestmentsView from "@/components/InvestmentsView";
import StatementsView from "@/components/StatementsView";
import type { AppView } from "@/lib/types";

const VIEWS: Record<AppView, React.ComponentType> = {
  dashboard: Dashboard,
  transactions: TransactionsView,
  goals: GoalsView,
  investments: InvestmentsView,
  statements: StatementsView,
};

export default function Home() {
  const [view, setView] = useState<AppView>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const View = VIEWS[view];

  return (
    <AppProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          current={view}
          onNavigate={setView}
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen((o) => !o)}
        />
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 p-4 lg:p-8">
          <View />
        </main>
      </div>
    </AppProvider>
  );
}
