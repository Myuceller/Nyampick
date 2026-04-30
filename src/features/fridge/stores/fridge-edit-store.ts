import { create } from "zustand";
import type { FridgeItem, FridgeSectionKey } from "@/features/fridge/lib/fridge-types";

type FridgeEditFilter = "all" | FridgeSectionKey;
type QuantityValueUpdate = number | ((value: number) => number);

interface QuantityDraft {
  id: string | null;
  value: number;
  suffix: string;
}

interface FridgeEditState {
  initialItems: FridgeItem[];
  draftItems: FridgeItem[];
  activeFilter: FridgeEditFilter;
  keyword: string;
  quantityDraft: QuantityDraft;
  pendingDeleteItem: FridgeItem | null;
  isDeleteMode: boolean;
  selectedDeleteIds: Set<string>;
  showBulkDeleteConfirm: boolean;
  initializeItems: (items: FridgeItem[]) => void;
  setActiveFilter: (activeFilter: FridgeEditFilter) => void;
  setKeyword: (keyword: string) => void;
  startEditQuantity: (item: FridgeItem) => void;
  setEditingQtyValue: (value: QuantityValueUpdate) => void;
  commitQuantity: () => void;
  removeItem: (id: string) => void;
  requestRemoveItem: (item: FridgeItem) => void;
  setPendingDeleteItem: (item: FridgeItem | null) => void;
  confirmRemoveItem: () => void;
  toggleDeleteSelection: (id: string) => void;
  enterDeleteMode: (id: string) => void;
  cancelDeleteMode: () => void;
  confirmBulkDelete: () => void;
  applyBulkDelete: () => void;
  setShowBulkDeleteConfirm: (showBulkDeleteConfirm: boolean) => void;
}

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

const initialQuantityDraft: QuantityDraft = {
  id: null,
  value: 0,
  suffix: "개",
};

export const useFridgeEditStore = create<FridgeEditState>((set, get) => ({
  initialItems: [],
  draftItems: [],
  activeFilter: "all",
  keyword: "",
  quantityDraft: initialQuantityDraft,
  pendingDeleteItem: null,
  isDeleteMode: false,
  selectedDeleteIds: new Set(),
  showBulkDeleteConfirm: false,
  initializeItems: (items) =>
    set(() => ({
      initialItems: items,
      draftItems: items,
      activeFilter: "all",
      keyword: "",
      quantityDraft: initialQuantityDraft,
      pendingDeleteItem: null,
      isDeleteMode: false,
      selectedDeleteIds: new Set(),
      showBulkDeleteConfirm: false,
    })),
  setActiveFilter: (activeFilter) => set(() => ({ activeFilter })),
  setKeyword: (keyword) => set(() => ({ keyword })),
  startEditQuantity: (item) => {
    const parsed = parseQuantity(item.quantity);
    set(() => ({
      quantityDraft: {
        id: item.id,
        value: parsed.value,
        suffix: parsed.suffix,
      },
    }));
  },
  setEditingQtyValue: (value) =>
    set((state) => ({
      quantityDraft: {
        ...state.quantityDraft,
        value:
          typeof value === "function"
            ? value(state.quantityDraft.value)
            : value,
      },
    })),
  commitQuantity: () => {
    const { quantityDraft } = get();
    if (!quantityDraft.id) return;
    set((state) => ({
      draftItems: state.draftItems.map((item) =>
        item.id === quantityDraft.id
          ? {
              ...item,
              quantity: buildQuantity(quantityDraft.value, quantityDraft.suffix),
            }
          : item
      ),
      quantityDraft: {
        ...state.quantityDraft,
        id: null,
      },
    }));
  },
  removeItem: (id) =>
    set((state) => ({
      draftItems: state.draftItems.filter((item) => item.id !== id),
      quantityDraft:
        state.quantityDraft.id === id
          ? { ...state.quantityDraft, id: null }
          : state.quantityDraft,
    })),
  requestRemoveItem: (item) => set(() => ({ pendingDeleteItem: item })),
  setPendingDeleteItem: (pendingDeleteItem) => set(() => ({ pendingDeleteItem })),
  confirmRemoveItem: () => {
    const { pendingDeleteItem, removeItem } = get();
    if (!pendingDeleteItem) return;
    removeItem(pendingDeleteItem.id);
    set(() => ({ pendingDeleteItem: null }));
  },
  toggleDeleteSelection: (id) =>
    set((state) => {
      const selectedDeleteIds = new Set(state.selectedDeleteIds);
      if (selectedDeleteIds.has(id)) selectedDeleteIds.delete(id);
      else selectedDeleteIds.add(id);
      return { selectedDeleteIds };
    }),
  enterDeleteMode: (id) =>
    set(() => ({
      isDeleteMode: true,
      selectedDeleteIds: new Set([id]),
    })),
  cancelDeleteMode: () =>
    set(() => ({
      isDeleteMode: false,
      selectedDeleteIds: new Set(),
      showBulkDeleteConfirm: false,
    })),
  confirmBulkDelete: () => {
    if (get().selectedDeleteIds.size === 0) return;
    set(() => ({ showBulkDeleteConfirm: true }));
  },
  applyBulkDelete: () => {
    const { selectedDeleteIds } = get();
    if (selectedDeleteIds.size === 0) return;
    set((state) => ({
      draftItems: state.draftItems.filter((item) => !selectedDeleteIds.has(item.id)),
      quantityDraft:
        state.quantityDraft.id && selectedDeleteIds.has(state.quantityDraft.id)
          ? { ...state.quantityDraft, id: null }
          : state.quantityDraft,
      showBulkDeleteConfirm: false,
      isDeleteMode: false,
      selectedDeleteIds: new Set(),
    }));
  },
  setShowBulkDeleteConfirm: (showBulkDeleteConfirm) =>
    set(() => ({ showBulkDeleteConfirm })),
}));
