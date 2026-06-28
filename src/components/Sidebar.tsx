"use client";

import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  TrendingUp,
  FileUp,
} from "lucide-react";
import type { AppView } from "@/lib/types";

const NAV_ITEMS: { view: AppView; label: string; icon: typeof LayoutDashboard }[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { view: "goals", label: "Goals", icon: Target },
  { view: "investments", label: "Investments", icon: TrendingUp },
  { view: "statements", label: "Statements", icon: FileUp },
];

export default function Sidebar({
  current,
  onNavigate,
}: {
  current: AppView;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold tracking-tight">Finanzas</h1>
        <p className="text-xs text-gray-400 mt-1">Personal Finance Manager</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              current === view
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">v1.0.0</p>
      </div>
    </aside>
  );
}
