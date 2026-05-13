import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setCachedHasSession } from "@/lib/auth-session-cache";
import { authedJson } from "@/lib/authed-fetch";
import type { ChildrenResponseDto } from "@/lib/dto/children";
import type { ProfileResponseDto } from "@/lib/dto/profile";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface FamilyAvatarSummary {
  id: string;
  name: string;
  profileImageUrl?: string;
}

export function useMyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [babyName, setBabyName] = useState("");
  const [babyMonthsOld, setBabyMonthsOld] = useState("0");
  const [babyPhotoUrl, setBabyPhotoUrl] = useState("");
  const [childCount, setChildCount] = useState(0);
  const [familyMemberCount, setFamilyMemberCount] = useState(0);
  const [familyAvatars, setFamilyAvatars] = useState<FamilyAvatarSummary[]>([]);
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

        const [profileResult, childrenResult, familyResult] = await Promise.allSettled([
          authedJson<ProfileResponseDto>("/api/profile"),
          authedJson<ChildrenResponseDto>("/api/children"),
          authedJson<{ members?: FamilyAvatarSummary[] }>("/api/family"),
        ]);

        if (profileResult.status === "fulfilled") {
          setProfileName(profileResult.value.profile?.name ?? "");
          setProfileImageUrl(profileResult.value.profile?.profileImageUrl ?? "");
        }

        if (childrenResult.status === "fulfilled") {
          const children = childrenResult.value.children ?? [];
          setChildCount(children.length);
          const primary = children.find((child) => child.isPrimary) ?? children[0];
          if (primary) {
            setBabyName(primary.name);
            setBabyMonthsOld(String(primary.monthsOld));
            setBabyPhotoUrl(primary.photoUrl ?? "");
          }
        }

        if (familyResult.status === "fulfilled") {
          setFamilyMemberCount(familyResult.value.members?.length ?? 0);
          setFamilyAvatars(familyResult.value.members ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "내 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const logout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    setCachedHasSession(false);
    toast.success("로그아웃되었습니다.");
    router.replace("/auth");
  };

  return {
    loading,
    profileName,
    profileImageUrl,
    babyName,
    babyMonthsOld,
    babyPhotoUrl,
    childCount,
    familyMemberCount,
    familyAvatars,
    error,
    logout,
    openGuardianProfilePage: () => router.push("/mypage/profile"),
    openChildrenPage: () => router.push("/children"),
    openFamilyPage: () => router.push("/family"),
  };
}
