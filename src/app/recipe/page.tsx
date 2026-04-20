"use client";

import { BottomNav } from "@/components/bottom-nav";
import { RecipePage } from "@/components/recipe-page";

export default function RecipeRoutePage() {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-[480px]">
      <RecipePage />
      <BottomNav />
    </div>
  );
}
