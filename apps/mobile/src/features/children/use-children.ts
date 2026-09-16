import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@mobile/features/auth/auth-context";
import { getAuthedApi, requestAuthedApi } from "@mobile/lib/api";

export interface ChildProfile {
  id: string;
  name: string;
  monthsOld: number;
  isPrimary: boolean;
  allergies: string[];
  photoUrl?: string | null;
  babyFoodStartedOn?: string | null;
}

export type ChildPatch = Partial<Pick<ChildProfile, "name" | "monthsOld" | "isPrimary" | "allergies" | "photoUrl" | "babyFoodStartedOn">>;

export function useChildren() {
  const { session } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [linkedMode, setLinkedMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAuthedApi<{ children?: ChildProfile[]; linkedMode?: boolean; message?: string }>("/api/children", session.access_token);
      setChildren(response.children ?? []);
      setLinkedMode(Boolean(response.linkedMode));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "아이 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  const addChild = useCallback(async (name: string, monthsOld: number) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    const cleanedName = name.trim();
    if (!cleanedName || !Number.isInteger(monthsOld) || monthsOld < 0) throw new Error("아이 이름과 개월 수를 확인해주세요.");
    try {
      setIsSaving(true);
      setError(null);
      const response = await requestAuthedApi<{ child?: ChildProfile; message?: string }>("/api/children", session.access_token, { method: "POST", body: { name: cleanedName, monthsOld } });
      if (!response.child) throw new Error(response.message ?? "아이 정보를 추가하지 못했습니다.");
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "아이 정보를 추가하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [refresh, session?.access_token]);

  const updateChild = useCallback(async (id: string, patch: ChildPatch) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    if (patch.name !== undefined && !patch.name.trim()) throw new Error("아이 이름을 입력해주세요.");
    if (patch.monthsOld !== undefined && (!Number.isInteger(patch.monthsOld) || patch.monthsOld < 0)) throw new Error("개월 수를 확인해주세요.");
    if (patch.allergies !== undefined && patch.allergies.some((allergy) => !allergy.trim() || allergy.trim().length > 30)) throw new Error("알레르기 정보를 확인해주세요.");
    try {
      setIsSaving(true);
      setError(null);
      const response = await requestAuthedApi<{ child?: ChildProfile; message?: string }>("/api/children", session.access_token, { method: "PATCH", body: { id, ...patch, name: patch.name?.trim(), allergies: patch.allergies?.map((allergy) => allergy.trim()).filter(Boolean) } });
      if (!response.child) throw new Error(response.message ?? "아이 정보를 수정하지 못했습니다.");
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "아이 정보를 수정하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [refresh, session?.access_token]);

  const removeChild = useCallback(async (id: string) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    try {
      setIsSaving(true);
      setError(null);
      await requestAuthedApi<{ ok: true; message?: string }>("/api/children", session.access_token, { method: "DELETE", body: { id } });
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "아이 정보를 삭제하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [refresh, session?.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { addChild, children, error, isLoading, isSaving, linkedMode, refresh, removeChild, updateChild };
}
