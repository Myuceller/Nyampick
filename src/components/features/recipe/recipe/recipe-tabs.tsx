import { cn } from "@/lib/utils";
import { TAB_LABELS } from "./constants";
import { TabKey } from "./types";

interface RecipeTabsProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS: TabKey[] = ["all", "ai", "favorite"];

export function RecipeTabs({ activeTab, onChange }: RecipeTabsProps) {
  return (
    <div className="border-b border-[#d3d7d5] px-4">
      <div className="grid grid-cols-3">
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className={cn(
                "relative py-3 text-[17px] font-extrabold text-[#252b29]",
                !isActive && "text-[#2b3130]"
              )}
            >
              {TAB_LABELS[tab]}
              {isActive ? (
                <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[#4ec492]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
