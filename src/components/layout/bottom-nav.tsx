"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ChefHat, Package2, User } from "lucide-react";
import { authedJson } from "@/lib/authed-fetch";
import { cn } from "@/lib/utils";

export type TabId = "meal" | "fridge" | "recipe" | "mypage";

const tabs: { id: TabId; label: string; icon: typeof CalendarDays; href: string }[] = [
  { id: "meal", label: "식단", icon: CalendarDays, href: "/" },
  { id: "fridge", label: "냉장고", icon: Package2, href: "/fridge" },
  { id: "recipe", label: "레시피", icon: ChefHat, href: "/recipe" },
  { id: "mypage", label: "마이페이지", icon: User, href: "/mypage" },
];

function tabFromPath(pathname: string): TabId {
  if (pathname.startsWith("/fridge")) return "fridge";
  if (pathname.startsWith("/recipe")) return "recipe";
  if (pathname.startsWith("/mypage")) return "mypage";
  return "meal";
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = tabFromPath(pathname);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const tab of tabs) {
        router.prefetch(tab.href);
      }

      void Promise.allSettled([
        authedJson("/api/home/summary"),
        authedJson("/api/fridge/items"),
        authedJson("/api/recipes/saved"),
        authedJson("/api/profile"),
        authedJson("/api/children"),
        authedJson("/api/family"),
      ]);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onMouseEnter={() => router.prefetch(tab.href)}
              onTouchStart={() => router.prefetch(tab.href)}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
