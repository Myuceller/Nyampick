import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@mobile/features/auth/auth-context";
import { getAuthedApi, requestAuthedApi } from "@mobile/lib/api";

export type FridgeCategory = "fruit" | "vegetable" | "protein" | "dairy" | "grain" | "sauce" | "snack" | "other";

export interface FridgeItem {
  id: string;
  name: string;
  category: FridgeCategory;
  quantity?: string;
  expiresAt?: string;
  addedAt: string;
  source: "manual" | "receipt";
}

export interface ReceiptCandidate {
  tempId: string;
  name: string;
  category: FridgeCategory;
  confidence: number;
  quantity?: string;
}

export function useFridgeItems(category?: FridgeCategory) {
  const { session } = useAuth();
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const query = useMemo(() => (category ? `?category=${category}` : ""), [category]);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAuthedApi<{ items?: FridgeItem[]; message?: string }>(`/api/fridge/items${query}`, session.access_token);
      setItems(response.items ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "냉장고 재료를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [query, session?.access_token]);

  const addItem = useCallback(async (name: string, quantity?: string, category?: FridgeCategory, expiresAt?: string) => {
    const cleanedName = name.trim();
    if (!cleanedName) throw new Error("재료 이름을 입력해주세요.");
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    try {
      setIsSaving(true);
      setError(null);
      await requestAuthedApi<{ item: FridgeItem }>("/api/fridge/items", session.access_token, {
        method: "POST",
        body: { name: cleanedName, quantity: quantity?.trim() || undefined, category, expiresAt: expiresAt?.trim() || undefined },
      });
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "재료를 저장하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [refresh, session?.access_token]);

  const updateItem = useCallback(async (id: string, patch: Pick<FridgeItem, "name" | "quantity" | "expiresAt">) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    const name = patch.name.trim();
    if (!name) throw new Error("재료 이름을 입력해주세요.");
    try {
      setIsSaving(true);
      setError(null);
      const response = await requestAuthedApi<{ item: FridgeItem; message?: string }>("/api/fridge/items", session.access_token, {
        method: "PATCH",
        body: { id, name, quantity: patch.quantity?.trim() || undefined, expiresAt: patch.expiresAt?.trim() || null },
      });
      setItems((previous) => previous.map((item) => item.id === id ? response.item : item));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "재료를 수정하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [session?.access_token]);

  const removeItem = useCallback(async (id: string) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      setError(null);
      await requestAuthedApi<{ ok: true; message?: string }>("/api/fridge/items", session.access_token, { method: "DELETE", body: { id } });
    } catch (caught) {
      setItems(previous);
      const message = caught instanceof Error ? caught.message : "재료를 삭제하지 못했습니다.";
      setError(message);
      throw new Error(message);
    }
  }, [items, session?.access_token]);

  const scanReceipt = useCallback(async (imageDataUrl: string, fileName?: string) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    try {
      setIsSaving(true);
      setError(null);
      const response = await requestAuthedApi<{ scanId?: string; candidates?: ReceiptCandidate[]; message?: string }>("/api/fridge/receipt-scan", session.access_token, {
        method: "POST",
        body: { imageDataUrl, fileName },
      });
      if (!response.scanId) throw new Error(response.message ?? "영수증을 분석하지 못했습니다.");
      return { candidates: response.candidates ?? [], scanId: response.scanId };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "영수증을 분석하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [session?.access_token]);

  const confirmReceipt = useCallback(async (scanId: string, selected: ReceiptCandidate[]) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    if (!selected.length) throw new Error("추가할 재료를 하나 이상 선택해주세요.");
    try {
      setIsSaving(true);
      setError(null);
      await requestAuthedApi("/api/fridge/receipt-confirm", session.access_token, {
        method: "POST",
        body: { scanId, selected: selected.map((item) => ({ tempId: item.tempId, name: item.name, category: item.category, quantity: item.quantity })) },
      });
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "영수증 재료를 추가하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [refresh, session?.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { addItem, confirmReceipt, error, isLoading, isSaving, items, refresh, removeItem, scanReceipt, updateItem };
}
