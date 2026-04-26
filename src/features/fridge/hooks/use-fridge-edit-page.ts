"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";

export type FridgeCategory =
  | "fruit"
  | "vegetable"
  | "protein"
  | "dairy"
  | "grain"
  | "sauce"
  | "snack"
  | "other";

export type SectionKey = "cube" | FridgeCategory;

export interface FridgeItem {
  id: string;
  name: string;
  category: FridgeCategory;
  quantity?: string;
  expiresAt?: string;
  addedAt: string;
  source: "manual" | "receipt";
}

export const CHIP_ORDER: SectionKey[] = [
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

export const SECTION_META: Record<
  SectionKey,
  { label: string; emoji: string; chip: string }
> = {
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
  const matched = raw.trim().match(/^(\d+)\s*(.*)$/);
  if (!matched) return { value: 0, suffix: raw };
  return {
    value: Number(matched[1]),
    suffix: matched[2] || "개",
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
        setInitialItems(items);
        setDraftItems(items);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "냉장고 데이터를 불러오지 못했습니다.";
        toast.error(message);
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
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
  };
}
