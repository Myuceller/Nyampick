import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@mobile/features/auth/auth-context";
import { getAuthedApi, requestAuthedApi } from "@mobile/lib/api";

export interface UserProfile {
  id: string;
  name: string;
  babyName: string;
  babyMonthsOld: number;
  email?: string;
  profileImageUrl?: string;
}

export type ProfilePatch = Partial<Pick<UserProfile, "name" | "babyName" | "babyMonthsOld" | "profileImageUrl">>;

export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await getAuthedApi<{ profile?: UserProfile; message?: string }>("/api/profile", session.access_token);
      if (!response.profile) throw new Error(response.message ?? "프로필을 불러오지 못했습니다.");
      setProfile(response.profile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "프로필을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  const update = useCallback(async (patch: ProfilePatch) => {
    if (!session?.access_token) throw new Error("로그인 세션을 확인할 수 없어요.");
    try {
      setIsSaving(true);
      setError(null);
      const response = await requestAuthedApi<{ profile?: UserProfile; message?: string }>("/api/profile", session.access_token, { method: "PATCH", body: patch });
      if (!response.profile) throw new Error(response.message ?? "프로필을 저장하지 못했습니다.");
      setProfile(response.profile);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "프로필을 저장하지 못했습니다.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { error, isLoading, isSaving, profile, refresh, update };
}
