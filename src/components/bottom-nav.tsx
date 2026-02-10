"use client";

import { CalendarDays, ChefHat, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "calendar" | "recipe" | "community" | "mypage";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof CalendarDays }[] = [
  { id: "calendar", label: "식단", icon: CalendarDays },
  { id: "recipe", label: "레시피", icon: ChefHat },
  { id: "community", label: "또래", icon: Users },
  { id: "mypage", label: "MY", icon: User },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon
                className={cn("h-5 w-5", isActive && "stroke-[2.5]")}
              />
              <span
                className={cn(
                  "text-[10px]",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
