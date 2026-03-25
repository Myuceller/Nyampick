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

export function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [profileName, setProfileName] = useState<string>("");
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

        const res = await authedFetch("/api/profile", { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as ProfileResponse;
          setProfileName(json.profile?.name ?? "");
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
    router.replace("/auth");
  };

  return (
    <main className="flex-1 px-4 pb-28 pt-4">
      <div className="rounded-2xl border border-[#cbd5d1] bg-white p-4">
        <h2 className="text-[22px] font-bold text-[#1f2725]">내 정보 (임시)</h2>
        {loading ? (
          <p className="mt-3 text-[15px] text-[#6f7875]">불러오는 중...</p>
        ) : (
          <div className="mt-3 space-y-2 text-[15px] text-[#2a312f]">
            <p>
              로그인 상태: <span className="font-semibold text-[#2f8d68]">로그인됨</span>
            </p>
            <p>이름: {profileName || "-"}</p>
            <p>이메일: {userEmail || "-"}</p>
            <p className="break-all">유저 ID: {userId || "-"}</p>
            {error ? <p className="text-[#d34a4a]">오류: {error}</p> : null}
          </div>
        )}
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
