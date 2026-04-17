"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, MinusCircle, PlusCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/app-button";
import { AppSearchInput } from "@/components/app-search-input";
import { CategoryChipFilter } from "@/components/category-chip-filter";
import { ConfirmModal } from "@/components/confirm-modal";
import { authedFetch } from "@/lib/authed-fetch";
import { cn } from "@/lib/utils";

type FridgeCategory =
  | "fruit"
  | "vegetable"
  | "protein"
  | "dairy"
  | "grain"
  | "sauce"
  | "snack"
  | "other";

type SectionKey = "cube" | FridgeCategory;

interface FridgeItem {
  id: string;
  name: string;
  category: FridgeCategory;
  quantity?: string;
  expiresAt?: string;
  addedAt: string;
  source: "manual" | "receipt";
}

const CHIP_ORDER: SectionKey[] = [
  "cube",
  "protein",
  "vegetable",
  "fruit",
  "dairy",
  "grain",
  "sauce",
  "snack",
  "other",
];

const SECTION_META: Record<SectionKey, { label: string; emoji: string; chip: string }> = {
  cube: { label: "큐브 이유식", emoji: "🧊", chip: "큐브 이유식" },
  protein: { label: "단백질", emoji: "🥩", chip: "단백질" },
  vegetable: { label: "채소", emoji: "🥦", chip: "채소" },
  fruit: { label: "과일", emoji: "🍎", chip: "과일" },
  dairy: { label: "유제품", emoji: "🥛", chip: "유제품" },
  grain: { label: "곡물", emoji: "🌾", chip: "곡물" },
  sauce: { label: "소스", emoji: "🧂", chip: "소스" },
  snack: { label: "간식", emoji: "🍪", chip: "간식" },
  other: { label: "기타", emoji: "🍽️", chip: "기타" },
};

function parseQuantity(raw?: string): { value: number; suffix: string } {
  if (!raw) return { value: 0, suffix: "개" };
  const m = raw.trim().match(/^(\d+)\s*(.*)$/);
  if (!m) return { value: 0, suffix: raw };
  return {
    value: Number(m[1]),
    suffix: m[2] || "개",
  };
}

function buildQuantity(value: number, suffix: string) {
  return `${Math.max(0, value)}${suffix}`;
}

function hashToUnit(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function getWiggleStyle(id: string): CSSProperties {
  const a = hashToUnit(`${id}:a`);
  const b = hashToUnit(`${id}:b`);
  const c = hashToUnit(`${id}:c`);
  const duration = 0.85 + a * 0.25; // 0.85s ~ 1.10s
  const delay = -(b * duration); // 시작 위상 분산
  const rotate = 0.28 + c * 0.34; // 0.28deg ~ 0.62deg

  return {
    "--wiggle-duration": `${duration.toFixed(2)}s`,
    "--wiggle-delay": `${delay.toFixed(2)}s`,
    "--wiggle-rotate": `${rotate.toFixed(2)}deg`,
  } as CSSProperties;
}

export default function FridgeEditPage() {
  const router = useRouter();
  const [initialItems, setInitialItems] = useState<FridgeItem[]>([]);
  const [draftItems, setDraftItems] = useState<FridgeItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | SectionKey>("all");
  const [keyword, setKeyword] = useState("");
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState(0);
  const [editingQtySuffix, setEditingQtySuffix] = useState("개");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<FridgeItem | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await authedFetch("/api/fridge/items", { cache: "no-store" });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(err.message ?? "냉장고 데이터를 불러오지 못했습니다.");
        }
        const json = (await res.json()) as { items?: FridgeItem[] };
        const items = json.items ?? [];
        setInitialItems(items);
        setDraftItems(items);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "냉장고 데이터를 불러오지 못했습니다.";
        alert(message);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const initialMap = useMemo(
    () => new Map(initialItems.map((item) => [item.id, item])),
    [initialItems]
  );

  const deletedIds = useMemo(
    () => initialItems.filter((item) => !draftItems.some((d) => d.id === item.id)).map((item) => item.id),
    [draftItems, initialItems]
  );

  const changedItems = useMemo(
    () =>
      draftItems.filter((item) => {
        const initial = initialMap.get(item.id);
        if (!initial) return false;
        return (
          initial.quantity !== item.quantity ||
          initial.name !== item.name ||
          initial.category !== item.category
        );
      }),
    [draftItems, initialMap]
  );

  const filteredItems = useMemo(() => {
    const q = keyword.trim();
    return draftItems.filter((item) => {
      if (activeFilter === "cube" && !item.name.includes("큐브")) return false;
      if (activeFilter !== "all" && activeFilter !== "cube" && item.category !== activeFilter) {
        return false;
      }
      if (q && !item.name.includes(q)) return false;
      return true;
    });
  }, [activeFilter, draftItems, keyword]);

  const grouped = useMemo(() => {
    const bySection: Record<SectionKey, FridgeItem[]> = {
      cube: [],
      protein: [],
      vegetable: [],
      fruit: [],
      dairy: [],
      grain: [],
      sauce: [],
      snack: [],
      other: [],
    };

    for (const item of filteredItems) {
      if (item.name.includes("큐브")) {
        bySection.cube.push(item);
      } else {
        bySection[item.category].push(item);
      }
    }
    return bySection;
  }, [filteredItems]);

  const visibleSectionOrder = useMemo(
    () => CHIP_ORDER.filter((section) => grouped[section].length > 0),
    [grouped]
  );

  const filterOptions = useMemo(
    () => [
      { key: "all", label: "전체" },
      ...CHIP_ORDER.map((section) => ({ key: section, label: SECTION_META[section].chip })),
    ],
    []
  );

  const startEditQuantity = (item: FridgeItem) => {
    const parsed = parseQuantity(item.quantity);
    setEditingQtyId(item.id);
    setEditingQtyValue(parsed.value);
    setEditingQtySuffix(parsed.suffix);
  };

  const commitQuantity = () => {
    if (!editingQtyId) return;
    setDraftItems((prev) =>
      prev.map((item) =>
        item.id === editingQtyId
          ? { ...item, quantity: buildQuantity(editingQtyValue, editingQtySuffix) }
          : item
      )
    );
    setEditingQtyId(null);
  };

  const removeItem = (id: string) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
    if (editingQtyId === id) {
      setEditingQtyId(null);
    }
  };

  const toggleDeleteSelection = (id: string) => {
    setSelectedDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const enterDeleteMode = (id: string) => {
    setIsDeleteMode(true);
    setSelectedDeleteIds(new Set([id]));
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = (id: string) => {
    if (isDeleteMode) return;
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      enterDeleteMode(id);
    }, 420);
  };

  const endLongPress = () => {
    clearLongPressTimer();
  };

  const cancelDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedDeleteIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const confirmBulkDelete = () => {
    if (selectedDeleteIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const applyBulkDelete = () => {
    if (selectedDeleteIds.size === 0) return;
    setDraftItems((prev) => prev.filter((item) => !selectedDeleteIds.has(item.id)));
    if (editingQtyId && selectedDeleteIds.has(editingQtyId)) {
      setEditingQtyId(null);
    }
    setShowBulkDeleteConfirm(false);
    setIsDeleteMode(false);
    setSelectedDeleteIds(new Set());
  };

  const requestRemoveItem = (item: FridgeItem) => {
    setPendingDeleteItem(item);
  };

  const confirmRemoveItem = () => {
    if (!pendingDeleteItem) return;
    removeItem(pendingDeleteItem.id);
    setPendingDeleteItem(null);
  };

  const saveChanges = async () => {
    try {
      setIsSaving(true);

      await Promise.all(
        deletedIds.map((id) =>
          authedFetch("/api/fridge/items", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = (await res.json().catch(() => ({}))) as { message?: string };
              throw new Error(err.message ?? "재료 삭제에 실패했습니다.");
            }
          })
        )
      );

      await Promise.all(
        changedItems.map((item) =>
          authedFetch("/api/fridge/items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: item.id,
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              expiresAt: item.expiresAt,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = (await res.json().catch(() => ({}))) as { message?: string };
              throw new Error(err.message ?? "재료 수정에 실패했습니다.");
            }
          })
        )
      );

      router.push("/fridge");
    } catch (error) {
      const message = error instanceof Error ? error.message : "저장에 실패했습니다.";
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-white">
      <div className="px-4 pb-3 pt-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/fridge")}
            className="rounded-md p-1 text-[#1f2725]"
            aria-label="뒤로"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#1f2725]">냉장고 수정</h1>
          <span className="w-8" />
        </div>

        <p className="mt-6 text-center text-[14px] leading-snug text-[#6f7875]">
          재료를 한번에 삭제하고 싶다면
          <br />
          꼭 눌러서 선택해보세요
        </p>

        <AppSearchInput
          value={keyword}
          onChange={setKeyword}
          placeholder="수정할 재료 검색"
          wrapperClassName="mt-6"
          inputClassName="border-transparent bg-[#eef0ef]"
        />

        <CategoryChipFilter
          options={filterOptions}
          activeKey={activeFilter}
          onChange={(key) => setActiveFilter(key as "all" | SectionKey)}
        />
      </div>

      <div className="h-px bg-[#d3d7d5]" />

      <div className="flex-1 overflow-y-auto bg-[#eef3f0] px-4 pb-28 pt-4">
        {isLoading ? (
          <p className="text-center text-[18px] text-[#6f7875]">불러오는 중...</p>
        ) : visibleSectionOrder.length === 0 ? (
          <p className="text-center text-[18px] text-[#6f7875]">표시할 재료가 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {visibleSectionOrder.map((section) => (
              <section key={section}>
                <h2 className="mb-3 text-[16px] font-bold text-[#2a4a3c]">
                  {SECTION_META[section].emoji} {SECTION_META[section].label}
                </h2>
                <div className="space-y-2.5">
                  {grouped[section].map((item) => {
                    const isEditing = editingQtyId === item.id;
                    const isSelectedForDelete = selectedDeleteIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between rounded-[14px] border px-4 py-3",
                          isDeleteMode
                            ? "cursor-pointer [animation:fridgeWiggle_var(--wiggle-duration)_ease-in-out_infinite] [animation-delay:var(--wiggle-delay)]"
                            : "",
                          isDeleteMode && isSelectedForDelete
                            ? "border-[#ff6e7a] bg-[#f9d9df]"
                            : "border-[#c8cfcd] bg-white"
                        )}
                        style={isDeleteMode ? getWiggleStyle(item.id) : undefined}
                        onMouseDown={() => startLongPress(item.id)}
                        onMouseUp={endLongPress}
                        onMouseLeave={endLongPress}
                        onTouchStart={() => startLongPress(item.id)}
                        onTouchEnd={endLongPress}
                        onTouchCancel={endLongPress}
                        onClick={() => {
                          if (isDeleteMode) {
                            toggleDeleteSelection(item.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[18px] font-medium text-[#1f2725]">{item.name}</span>
                          {item.quantity ? (
                            isEditing ? (
                              <>
                                <div className="flex items-center gap-1 rounded-xl border border-[#65c496] px-2 py-1 text-[#57bf8e]">
                                  <button
                                    type="button"
                                    onClick={() => setEditingQtyValue((v) => Math.max(0, v - 1))}
                                  >
                                    <MinusCircle className="h-4 w-4" />
                                  </button>
                                  <span className="min-w-[40px] text-center text-[16px] font-semibold">
                                    {buildQuantity(editingQtyValue, editingQtySuffix)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingQtyValue((v) => v + 1)}
                                  >
                                    <PlusCircle className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={commitQuantity}
                                  className="rounded-lg border border-[#65c496] p-1 text-[#57bf8e]"
                                  aria-label="수량 적용"
                                >
                                  <Check className="h-5 w-5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (isDeleteMode) return;
                                  startEditQuantity(item);
                                }}
                                className="rounded-xl border border-[#ccd2d0] px-3 py-1 text-[16px] text-[#79827f]"
                              >
                                {item.quantity} ✎
                              </button>
                            )
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isDeleteMode) {
                              toggleDeleteSelection(item.id);
                              return;
                            }
                            requestRemoveItem(item);
                          }}
                          className="rounded-md p-1 text-[#1f2725]"
                          aria-label="재료 삭제"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {isDeleteMode ? (
        <div className="pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom))] left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 px-4">
          <div className="pointer-events-auto grid grid-cols-2 gap-2">
            <AppButton
              label="취소하기"
              onClick={cancelDeleteMode}
              bgClassName="bg-[#7b8782]"
              className="h-12 rounded-full"
            />
            <AppButton
              label="선택한 재료 삭제"
              onClick={confirmBulkDelete}
              disabled={selectedDeleteIds.size === 0}
              bgClassName="bg-[#ff2f3e]"
              className="h-12 rounded-full disabled:opacity-40"
            />
          </div>
        </div>
      ) : (
        <div className="pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom))] left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 px-4">
          <AppButton
            label="저장하기"
            disabled={isSaving}
            onClick={saveChanges}
            className="pointer-events-auto mx-auto flex h-12 w-[180px] rounded-full text-[18px] disabled:opacity-70"
          />
        </div>
      )}

      <ConfirmModal
        open={Boolean(pendingDeleteItem)}
        title="정말 삭제할까요?"
        description={
          pendingDeleteItem
            ? `“${pendingDeleteItem.name}” 재료가 사라져요`
            : ""
        }
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={confirmRemoveItem}
      />

      <ConfirmModal
        open={showBulkDeleteConfirm}
        title="정말 삭제할까요?"
        description="선택한 재료가 모두 사라져요!"
        onCancel={() => setShowBulkDeleteConfirm(false)}
        onConfirm={applyBulkDelete}
      />

      <style jsx global>{`
        @keyframes fridgeWiggle {
          0% {
            transform: rotate(calc(var(--wiggle-rotate, 0.8deg) * -1));
          }
          50% {
            transform: rotate(var(--wiggle-rotate, 0.8deg));
          }
          100% {
            transform: rotate(calc(var(--wiggle-rotate, 0.8deg) * -1));
          }
        }
      `}</style>
    </main>
  );
}
