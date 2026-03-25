"use client";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { RecipePage } from "@/components/recipe-page";

export default function RecipeRoutePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-24">
      <AppHeader />
      <RecipePage />
      <BottomNav />
    </div>
  );
}
