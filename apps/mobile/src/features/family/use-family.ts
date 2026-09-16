import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@mobile/features/auth/auth-context";
import { getAuthedApi, requestAuthedApi } from "@mobile/lib/api";

export interface FamilyMember {
  id: string;
  name: string;
  role: "owner" | "member";
  roleLabel: string;
}

export function useFamily() {
  const { session } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [linkedMode, setLinkedMode] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAuthedApi<{ members?: FamilyMember[]; linkedMode?: boolean; message?: string }>("/api/family", session.access_token);
      setMembers(response.members ?? []);
      setLinkedMode(Boolean(response.linkedMode));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "가족 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  const createInviteCode = useCallback(async (rotate = true) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    try {
      setIsSaving(true);
      setError(null);
      const response = await requestAuthedApi<{ code?: string; message?: string }>("/api/children/invite-code", session.access_token, { method: "POST", body: { rotate } });
      if (!response.code) throw new Error(response.message ?? "가족 코드를 만들지 못했습니다.");
      setInviteCode(response.code);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "가족 코드를 만들지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [session?.access_token]);

  const joinFamily = useCallback(async (code: string, relationshipLabel: string) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) throw new Error("가족 코드를 입력해주세요.");
    try {
      setIsSaving(true);
      setError(null);
      await requestAuthedApi("/api/children/join-code", session.access_token, { method: "POST", body: { code: normalizedCode, relationshipLabel } });
      setInviteCode(null);
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "가족 참여에 실패했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [refresh, session?.access_token]);

  const unlinkFamily = useCallback(async () => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    try {
      setIsSaving(true);
      setError(null);
      await requestAuthedApi("/api/children/unlink", session.access_token, { method: "POST", body: {} });
      setInviteCode(null);
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "가족 연결 해제에 실패했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [refresh, session?.access_token]);

  const unlinkFamilyMember = useCallback(async (guestUserId: string) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    if (!guestUserId) throw new Error("가족 구성원을 확인할 수 없어요.");
    try {
      setIsSaving(true);
      setError(null);
      await requestAuthedApi("/api/family", session.access_token, { method: "DELETE", body: { guestUserId } });
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "가족 구성원 연결 해제에 실패했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [refresh, session?.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { createInviteCode, error, inviteCode, isLoading, isSaving, joinFamily, linkedMode, members, refresh, unlinkFamily, unlinkFamilyMember };
}
