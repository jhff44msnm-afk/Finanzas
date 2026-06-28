"use client";

import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  TrendingUp,
  FileUp,
  Menu,
  X,
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
  mobileOpen,
  onToggleMobile,
}: {
  current: AppView;
  onNavigate: (view: AppView) => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}) {
  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white flex items-center justify-between px-4 py-3 safe-top">
        <button onClick={onToggleMobile} className="p-1">
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold">Finanzas</h1>
        <div className="w-8" />
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={onToggleMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-50 top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col shrink-0 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Finanzas</h1>
            <p className="text-xs text-gray-400 mt-1">Personal Finance Manager</p>
          </div>
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              onClick={() => {
                onNavigate(view);
                onToggleMobile();
              }}
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
    </>
  );
}
