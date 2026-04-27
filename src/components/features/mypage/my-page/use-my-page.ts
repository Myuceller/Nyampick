import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";
import type { ChildrenResponseDto } from "@/lib/dto/children";
import type { ApiMessageResponseDto } from "@/lib/dto/common";
import type { ProfileResponseDto } from "@/lib/dto/profile";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function useMyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [babySaving, setBabySaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [babyName, setBabyName] = useState("");
  const [babyMonthsOld, setBabyMonthsOld] = useState("0");
  const [childCount, setChildCount] = useState(0);
  const [familyMemberCount, setFamilyMemberCount] = useState(1);
  const [primaryChildId, setPrimaryChildId] = useState<string | null>(null);
  const [linkedMode, setLinkedMode] = useState(false);
  const [linkedOwnerLabel, setLinkedOwnerLabel] = useState("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowser();
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session) {
          setError("로그인 세션이 없습니다.");
          return;
        }

        setUserId(session.user.id);
        setUserEmail(session.user.email ?? "");

        const [profileRes, childrenRes] = await Promise.all([
          authedFetch("/api/profile", { cache: "no-store" }),
          authedFetch("/api/children", { cache: "no-store" }),
        ]);
        if (profileRes.ok) {
          const json = (await profileRes.json()) as ProfileResponseDto;
          setProfileName(json.profile?.name ?? "");
          if (!session.user.email && json.profile?.email) {
            setUserEmail(json.profile.email);
          }
        }
        if (childrenRes.ok) {
          const json = (await childrenRes.json()) as ChildrenResponseDto;
          const children = json.children ?? [];
          setChildCount(children.length);
          const primary = children.find((child) => child.isPrimary) ?? children[0];
          if (primary) {
            setPrimaryChildId(primary.id);
            setBabyName(primary.name);
            setBabyMonthsOld(String(primary.monthsOld));
          }
          const nextLinkedMode = Boolean(json.linkedMode);
          setLinkedMode(nextLinkedMode);
          setFamilyMemberCount(nextLinkedMode ? 2 : 1);
          setLinkedOwnerLabel(json.linkedInfo?.ownerName || json.linkedInfo?.ownerEmail || "");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "내 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const saveProfile = async () => {
    try {
      setSaving(true);
      const res = await authedFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as ProfileResponseDto;
      if (!res.ok) {
        throw new Error(json.message ?? "내 정보 저장에 실패했습니다.");
      }
      if (json.profile?.name) {
        setProfileName(json.profile.name);
      }
      toast.success("내 정보를 저장했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "내 정보 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const saveBabyProfile = async () => {
    if (!primaryChildId) {
      toast.error("대표 아기 정보를 찾지 못했습니다.");
      return;
    }
    const months = Number.parseInt(babyMonthsOld, 10);
    if (!Number.isInteger(months) || months < 0) {
      toast.error("개월 수는 0 이상의 정수여야 합니다.");
      return;
    }
    try {
      setBabySaving(true);
      const res = await authedFetch("/api/children", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: primaryChildId,
          name: babyName.trim(),
          monthsOld: months,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as ApiMessageResponseDto;
      if (!res.ok) {
        throw new Error(json.message ?? "아기 정보 저장에 실패했습니다.");
      }
      toast.success("아기 정보를 저장했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "아기 정보 저장에 실패했습니다.");
    } finally {
      setBabySaving(false);
    }
  };

  const logout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  return {
    loading,
    saving,
    babySaving,
    userId,
    userEmail,
    profileName,
    setProfileName,
    babyName,
    setBabyName,
    babyMonthsOld,
    setBabyMonthsOld,
    childCount,
    familyMemberCount,
    linkedMode,
    linkedOwnerLabel,
    error,
    saveProfile,
    saveBabyProfile,
    logout,
    openFamilyPage: () => router.push("/children"),
  };
}
