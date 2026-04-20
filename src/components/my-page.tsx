"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/lib/authed-fetch";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface ProfileResponse {
  profile?: {
    id: string;
    name: string;
    babyName: string;
    babyMonthsOld: number;
    email?: string;
  };
}

interface ChildSummary {
  id: string;
  name: string;
  monthsOld: number;
  isPrimary: boolean;
}

interface ChildrenResponse {
  children?: ChildSummary[];
  linkedMode?: boolean;
  linkedInfo?: {
    ownerName?: string;
    ownerEmail?: string;
    childName?: string;
  } | null;
}

export function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [babySaving, setBabySaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [babyName, setBabyName] = useState("");
  const [babyMonthsOld, setBabyMonthsOld] = useState("0");
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
          const json = (await profileRes.json()) as ProfileResponse;
          setProfileName(json.profile?.name ?? "");
          if (!session.user.email && json.profile?.email) {
            setUserEmail(json.profile.email);
          }
        }
        if (childrenRes.ok) {
          const json = (await childrenRes.json()) as ChildrenResponse;
          const children = json.children ?? [];
          const primary = children.find((child) => child.isPrimary) ?? children[0];
          if (primary) {
            setPrimaryChildId(primary.id);
            setBabyName(primary.name);
            setBabyMonthsOld(String(primary.monthsOld));
          }
          setLinkedMode(Boolean(json.linkedMode));
          setLinkedOwnerLabel(
            json.linkedInfo?.ownerName ||
              json.linkedInfo?.ownerEmail ||
              ""
          );
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
      const json = (await res.json().catch(() => ({}))) as {
        profile?: {
          name?: string;
        };
        message?: string;
      };
      if (!res.ok) {
        throw new Error(json.message ?? "내 정보 저장에 실패했습니다.");
      }
      if (json.profile?.name) {
        setProfileName(json.profile.name);
      }
      alert("내 정보를 저장했습니다.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "내 정보 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const saveBabyProfile = async () => {
    if (!primaryChildId) {
      alert("대표 아기 정보를 찾지 못했습니다.");
      return;
    }
    const months = Number.parseInt(babyMonthsOld, 10);
    if (!Number.isInteger(months) || months < 0) {
      alert("개월 수는 0 이상의 정수여야 합니다.");
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
      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        throw new Error(json.message ?? "아기 정보 저장에 실패했습니다.");
      }
      alert("아기 정보를 저장했습니다.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "아기 정보 저장에 실패했습니다.");
    } finally {
      setBabySaving(false);
    }
  };

  const logout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  return (
    <main className="flex-1 px-4 pb-28 pt-4">
      <div className="space-y-3">
        <div className="rounded-2xl border border-[#cbd5d1] bg-white p-4">
          <h2 className="text-[18px] font-bold text-[#1f2725]">내 정보</h2>
          {loading ? (
            <p className="mt-3 text-[15px] text-[#6f7875]">불러오는 중...</p>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="block text-[13px] font-semibold text-[#6a7471]">보호자 이름</label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#d4ddda] px-3 text-[15px] outline-none"
              />
              <p className="text-[13px] text-[#6f7875]">로그인 이메일: {userEmail || "-"}</p>
              <p className="break-all text-[12px] text-[#85908c]">계정 ID: {userId || "-"}</p>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={saving || loading}
                className="mt-2 h-11 w-full rounded-xl bg-[#57bf8e] text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {saving ? "저장 중..." : "내 정보 저장"}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#cbd5d1] bg-white p-4">
          <h2 className="text-[18px] font-bold text-[#1f2725]">우리 아기</h2>
          {loading ? (
            <p className="mt-3 text-[15px] text-[#6f7875]">불러오는 중...</p>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="block text-[13px] font-semibold text-[#6a7471]">아기 이름</label>
              <input
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                disabled={linkedMode}
                className="h-11 w-full rounded-xl border border-[#d4ddda] px-3 text-[15px] outline-none disabled:bg-[#f2f4f3]"
              />
              <label className="block text-[13px] font-semibold text-[#6a7471]">개월 수</label>
              <input
                value={babyMonthsOld}
                onChange={(e) => setBabyMonthsOld(e.target.value)}
                disabled={linkedMode}
                inputMode="numeric"
                className="h-11 w-full rounded-xl border border-[#d4ddda] px-3 text-[15px] outline-none disabled:bg-[#f2f4f3]"
              />
              <button
                type="button"
                onClick={() => void saveBabyProfile()}
                disabled={babySaving || loading || linkedMode}
                className="mt-2 h-11 w-full rounded-xl bg-[#57bf8e] text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {babySaving ? "저장 중..." : "아기 정보 저장"}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#cbd5d1] bg-white p-4">
          <h2 className="text-[18px] font-bold text-[#1f2725]">가족 연결</h2>
          <p className="mt-2 text-[14px] text-[#6f7875]">
            {linkedMode
              ? `연결됨${linkedOwnerLabel ? ` · ${linkedOwnerLabel}` : ""}`
              : "연결 안됨"}
          </p>
          <button
            type="button"
            onClick={() => router.push("/children")}
            className="mt-3 h-11 w-full rounded-xl border border-[#b8d6c7] bg-[#edf7f2] text-[15px] font-semibold text-[#2f8d68]"
          >
            아기/가족 관리 열기
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-[#f0c7c7] bg-[#fff6f6] p-3 text-[13px] text-[#bf5555]">
            {error}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => void logout()}
        className="mt-4 h-12 w-full rounded-2xl bg-[#1f2725] text-[16px] font-semibold text-white"
      >
        로그아웃
      </button>
    </main>
  );
}
