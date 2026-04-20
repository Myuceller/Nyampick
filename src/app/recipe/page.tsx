"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { RecipePage } from "@/components/features/recipe/recipe-page";

export default function RecipeRoutePage() {
  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-[480px]">
      <RecipePage />
      <BottomNav />
    </div>
  );
}
