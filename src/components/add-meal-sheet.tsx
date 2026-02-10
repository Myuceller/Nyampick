"use client";

import { useState, useMemo } from "react";
import { Search, Star, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { MealType, MenuItem } from "@/lib/types";
import { MEAL_LABELS, CATEGORY_LABELS } from "@/lib/types";
import { SAMPLE_MENUS } from "@/lib/meal-store";

type CategoryFilter = MenuItem["category"] | "all" | "favorite";

interface AddMealSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: MealType;
  onAddItems: (items: string[]) => void;
}

export function AddMealSheet({
  open,
  onOpenChange,
  mealType,
  onAddItems,
}: AddMealSheetProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const categories: { value: CategoryFilter; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "favorite", label: "즐겨찾기" },
    { value: "rice", label: "밥/죽" },
    { value: "soup", label: "국/탕" },
    { value: "side", label: "반찬" },
    { value: "snack", label: "간식" },
    { value: "vitamin", label: "비타민" },
  ];

  const filtered = useMemo(() => {
    return SAMPLE_MENUS.filter((item) => {
      const matchSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchCategory =
        category === "all"
          ? true
          : category === "favorite"
            ? item.isFavorite
            : item.category === category;
      return matchSearch && matchCategory;
    });
  }, [search, category]);

  const toggleItem = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size > 0) {
      onAddItems(Array.from(selected));
      setSelected(new Set());
      setSearch("");
      onOpenChange(false);
    }
  };

  const handleAddCustom = () => {
    if (search.trim()) {
      onAddItems([search.trim()]);
      setSearch("");
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[85vh] flex-col rounded-t-3xl px-4 pb-6 pt-4"
      >
        <SheetHeader className="mb-2 text-left">
          <SheetTitle className="text-lg font-bold text-foreground">
            {MEAL_LABELS[mealType]}에 추가하기
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            메뉴를 검색하거나 선택하세요
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="메뉴 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-muted/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Categories */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                category === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.value === "favorite" && <Star className="h-3 w-3" />}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Menu list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length > 0 ? (
            <div className="flex flex-col gap-1">
              {filtered.map((item) => {
                const isSelected = selected.has(item.name);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.name)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-primary/10 ring-1 ring-primary/30"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {item.isFavorite && (
                        <Star className="h-3.5 w-3.5 fill-meal-breakfast text-meal-breakfast" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : search.trim() ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-muted-foreground">
                {'\''}
                {search}
                {'\''}에 대한 결과가 없어요
              </p>
              <button
                type="button"
                onClick={handleAddCustom}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                {'\''}
                {search}
                {'\''} 직접 추가하기
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">메뉴가 없어요</p>
            </div>
          )}
        </div>

        {/* Submit */}
        {selected.size > 0 && (
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-3 w-full rounded-2xl bg-primary py-3.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            선택한 메뉴 추가하기 ({selected.size})
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
}
