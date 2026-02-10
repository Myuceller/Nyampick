"use client";

import { Bell, Sprout } from "lucide-react";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <Sprout className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <h1 className="text-base font-bold text-foreground">맘마노트</h1>
      </div>
      <button
        type="button"
        className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
      </button>
    </header>
  );
}
