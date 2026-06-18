"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";
import { useFridgeEditStore } from "@/features/fridge/stores/fridge-edit-store";
import {
  FRIDGE_SECTION_META,
  FRIDGE_SECTION_ORDER,
  FridgeCategory,
  FridgeItem,
  FridgeSectionKey,
  sectionFromFridgeItem,
} from "@/features/fridge/lib/fridge-types";

export type { FridgeCategory, FridgeItem };
export type SectionKey = FridgeSectionKey;

export const CHIP_ORDER = FRIDGE_SECTION_ORDER;
export const SECTION_META = Object.fromEntries(
  Object.entries(FRIDGE_SECTION_META).map(([key, meta]) => [
    key,
    { label: meta.label, emoji: meta.emoji, chip: meta.chipLabel },
  ])
) as Record<SectionKey, { label: string; emoji: string; chip: string }>;

function hashToUnit(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

export function getWiggleStyle(id: string): CSSProperties {
  const a = hashToUnit(`${id}:a`);
  const b = hashToUnit(`${id}:b`);
  const c = hashToUnit(`${id}:c`);
  const duration = 0.85 + a * 0.25;
  const delay = -(b * duration);
  const rotate = 0.28 + c * 0.34;

  return {
    "--wiggle-duration": `${duration.toFixed(2)}s`,
    "--wiggle-delay": `${delay.toFixed(2)}s`,
    "--wiggle-rotate": `${rotate.toFixed(2)}deg`,
  } as CSSProperties;
}

export function useFridgeEditPage() {
  const router = useRouter();
  const initialItems = useFridgeEditStore((state) => state.initialItems);
  const draftItems = useFridgeEditStore((state) => state.draftItems);
  const activeFilter = useFridgeEditStore((state) => state.activeFilter);
  const setActiveFilter = useFridgeEditStore((state) => state.setActiveFilter);
  const keyword = useFridgeEditStore((state) => state.keyword);
  const setKeyword = useFridgeEditStore((state) => state.setKeyword);
  const editingQtyId = useFridgeEditStore((state) => state.quantityDraft.id);
  const editingQtyValue = useFridgeEditStore((state) => state.quantityDraft.value);
  const editingQtySuffix = useFridgeEditStore((state) => state.quantityDraft.suffix);
  const initializeItems = useFridgeEditStore((state) => state.initializeItems);
  const startEditQuantity = useFridgeEditStore((state) => state.startEditQuantity);
  const setEditingQtyValue = useFridgeEditStore((state) => state.setEditingQtyValue);
  const commitQuantity = useFridgeEditStore((state) => state.commitQuantity);
  const pendingDeleteItem = useFridgeEditStore((state) => state.pendingDeleteItem);
  const setPendingDeleteItem = useFridgeEditStore((state) => state.setPendingDeleteItem);
  const isDeleteMode = useFridgeEditStore((state) => state.isDeleteMode);
  const selectedDeleteIds = useFridgeEditStore((state) => state.selectedDeleteIds);
  const showBulkDeleteConfirm = useFridgeEditStore(
    (state) => state.showBulkDeleteConfirm
  );
  const setShowBulkDeleteConfirm = useFridgeEditStore(
    (state) => state.setShowBulkDeleteConfirm
  );
  const toggleDeleteSelection = useFridgeEditStore(
    (state) => state.toggleDeleteSelection
  );
  const enterDeleteMode = useFridgeEditStore((state) => state.enterDeleteMode);
  const cancelDeleteMode = useFridgeEditStore((state) => state.cancelDeleteMode);
  const confirmBulkDelete = useFridgeEditStore((state) => state.confirmBulkDelete);
  const applyBulkDelete = useFridgeEditStore((state) => state.applyBulkDelete);
  const requestRemoveItem = useFridgeEditStore((state) => state.requestRemoveItem);
  const confirmRemoveItem = useFridgeEditStore((state) => state.confirmRemoveItem);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedExitConfirm, setShowUnsavedExitConfirm] = useState(false);
  const cancelDeleteLabel = "취소하기";
  const bulkDeleteLabel = "선택한 재료 삭제";
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
        initializeItems(items);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "냉장고 데이터를 불러오지 못했습니다.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [initializeItems]);

  const initialMap = useMemo(
    () => new Map(initialItems.map((item) => [item.id, item])),
    [initialItems]
  );

  const deletedIds = useMemo(
    () =>
      initialItems
        .filter((item) => !draftItems.some((draft) => draft.id === item.id))
        .map((item) => item.id),
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

  const hasUnsavedChanges = deletedIds.length > 0 || changedItems.length > 0;

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
      bySection[sectionFromFridgeItem(item)].push(item);
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
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const requestExit = () => {
    if (isSaving) return;
    if (hasUnsavedChanges) {
      setShowUnsavedExitConfirm(true);
      return;
    }
    router.push("/fridge");
  };

  const confirmExitWithoutSaving = () => {
    setShowUnsavedExitConfirm(false);
    router.push("/fridge");
  };

  return {
    router,
    keyword,
    setKeyword,
    activeFilter,
    setActiveFilter,
    editingQtyId,
    editingQtyValue,
    setEditingQtyValue,
    editingQtySuffix,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    showUnsavedExitConfirm,
    setShowUnsavedExitConfirm,
    pendingDeleteItem,
    setPendingDeleteItem,
    isDeleteMode,
    selectedDeleteIds,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    cancelDeleteLabel,
    bulkDeleteLabel,
    visibleSectionOrder,
    grouped,
    filterOptions,
    startEditQuantity,
    commitQuantity,
    toggleDeleteSelection,
    startLongPress,
    endLongPress,
    cancelDeleteMode,
    confirmBulkDelete,
    applyBulkDelete,
    requestRemoveItem,
    confirmRemoveItem,
    saveChanges,
    requestExit,
    confirmExitWithoutSaving,
  };
}
