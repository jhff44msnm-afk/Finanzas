"use client";

import {
  Home,
  ArrowLeftRight,
  Target,
  TrendingUp,
  FileUp,
} from "lucide-react";
import type { AppView } from "@/lib/types";

const NAV_ITEMS: { view: AppView; label: string; icon: typeof Home }[] = [
  { view: "dashboard", label: "Home", icon: Home },
  { view: "transactions", label: "Activity", icon: ArrowLeftRight },
  { view: "goals", label: "Goals", icon: Target },
  { view: "investments", label: "Invest", icon: TrendingUp },
  { view: "statements", label: "Uploads", icon: FileUp },
];

export default function BottomNav({
  current,
  onNavigate,
}: {
  current: AppView;
  onNavigate: (view: AppView) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E8E2DA] safe-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
          const active = current === view;
          return (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] transition-colors"
            >
              <div
                className={`p-1.5 rounded-2xl transition-all duration-200 ${
                  active ? "bg-[#7C8C6E]/12" : ""
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.5}
                  className={active ? "text-[#7C8C6E]" : "text-[#B5AFA6]"}
                />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-wide ${
                  active ? "text-[#7C8C6E]" : "text-[#B5AFA6]"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
