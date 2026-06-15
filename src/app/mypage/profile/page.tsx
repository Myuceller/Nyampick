"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, SquarePen, X } from "lucide-react";
import { toast } from "sonner";
import { AppButton } from "@/components/ui/app-button";
import { authedFetch } from "@/lib/authed-fetch";
import { fileToResizedImageDataUrl } from "@/lib/client-image";
import type { ProfileResponseDto } from "@/lib/dto/profile";

function getInitial(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1) : fallback;
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mx-auto mt-12 h-[136px] w-[136px] rounded-[42px] bg-[#dce9e3]" />
      <div className="mx-auto mt-7 h-7 w-28 rounded-full bg-[#e5ebe8]" />
      <div className="mt-9 h-2 bg-[#f5f6f6]" />
      <section className="px-4 py-8">
        <div className="h-7 w-24 rounded-full bg-[#e5ebe8]" />
        <div className="mt-8 space-y-7">
          <div className="h-6 w-40 rounded-full bg-[#e5ebe8]" />
          <div className="h-6 w-52 rounded-full bg-[#e5ebe8]" />
          <div className="h-6 w-64 rounded-full bg-[#e5ebe8]" />
        </div>
      </section>
    </div>
  );
}

export default function GuardianProfilePage() {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [email, setEmail] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [error, setError] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await authedFetch("/api/profile", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ProfileResponseDto;

        if (!res.ok) {
          throw new Error(json.message ?? "프로필 정보를 불러오지 못했습니다.");
        }

        const nextName = json.profile?.name ?? "";
        setName(nextName);
        setDraftName(nextName);
        setEmail(json.profile?.email ?? "");
        setProfileImageUrl(json.profile?.profileImageUrl ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "프로필 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const displayName = name.trim() || "보호자";
  const displayEmail = email.trim() || "이메일 없음";
  const initial = useMemo(() => getInitial(displayName, "보"), [displayName]);

  const openNameEditor = () => {
    setDraftName(name.trim());
    setIsEditingName(true);
  };

  const saveName = async () => {
    const nextName = draftName.trim();
    if (!nextName) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    try {
      setIsSavingName(true);
      const res = await authedFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const json = (await res.json().catch(() => ({}))) as ProfileResponseDto;

      if (!res.ok) {
        throw new Error(json.message ?? "이름을 저장하지 못했습니다.");
      }

      const savedName = json.profile?.name ?? nextName;
      setName(savedName);
      setDraftName(savedName);
      setIsEditingName(false);
      toast.success("이름을 변경했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이름을 저장하지 못했습니다.");
    } finally {
      setIsSavingName(false);
    }
  };

  const saveProfilePhoto = async (file: File | null | undefined) => {
    if (!file) return;

    try {
      setIsSavingPhoto(true);
      const nextImageUrl = await fileToResizedImageDataUrl(file);
      const res = await authedFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImageUrl: nextImageUrl }),
      });
      const json = (await res.json().catch(() => ({}))) as ProfileResponseDto;
      if (!res.ok) {
        throw new Error(json.message ?? "프로필 사진을 저장하지 못했습니다.");
      }
      setProfileImageUrl(json.profile?.profileImageUrl ?? nextImageUrl);
      toast.success("프로필 사진을 등록했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "프로필 사진을 저장하지 못했습니다.");
    } finally {
      setIsSavingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[480px] bg-white text-[#202725]">
      <header className="relative flex h-[calc(72px+env(safe-area-inset-top))] items-center justify-center px-4 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full active:bg-[#eef1ef]"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-[17px] font-extrabold leading-[1.32]">보호자 프로필</h1>
      </header>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void saveProfilePhoto(event.target.files?.[0])}
      />

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <>
          <section className="flex flex-col items-center pb-8 pt-7">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isSavingPhoto}
              className="flex h-[136px] w-[136px] items-center justify-center overflow-hidden rounded-[42px] bg-[#aaddc6] text-[64px] font-medium leading-none text-[#202725] disabled:opacity-70"
              style={
                profileImageUrl
                  ? {
                      backgroundImage: `url(${profileImageUrl})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }
                  : undefined
              }
              aria-label="프로필 사진 등록"
            >
              {profileImageUrl ? null : initial}
            </button>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isSavingPhoto}
              className="mt-3 text-[13px] font-bold text-[#10b98f] disabled:text-[#8aa89d]"
            >
              {isSavingPhoto ? "사진 저장 중..." : "프로필 사진 등록"}
            </button>
            <div className="mt-7 flex items-center gap-2">
              <p className="text-[22px] font-extrabold leading-[1.28]">{displayName}</p>
              <button
                type="button"
                onClick={openNameEditor}
                className="flex h-8 w-8 items-center justify-center rounded-md active:bg-[#eef1ef]"
                aria-label="보호자 이름 수정"
              >
                <SquarePen className="h-[22px] w-[22px]" strokeWidth={2.5} />
              </button>
            </div>
          </section>

          <div className="h-2 bg-[#f5f6f6]" />

          <section className="px-4 py-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[23px] font-extrabold leading-[1.28]">내 정보</h2>
              <button
                type="button"
                onClick={openNameEditor}
                className="flex h-9 w-9 items-center justify-center rounded-md active:bg-[#eef1ef]"
                aria-label="내 정보 수정"
              >
                <SquarePen className="h-[23px] w-[23px]" strokeWidth={2.5} />
              </button>
            </div>

            <dl className="mt-7 space-y-6 text-[19px]">
              <div className="grid grid-cols-[96px_1fr] items-center gap-4">
                <dt className="font-semibold text-[#7d8984]">이름</dt>
                <dd className="font-semibold">{displayName}</dd>
              </div>
              <div className="grid grid-cols-[96px_1fr] items-center gap-4">
                <dt className="font-semibold text-[#7d8984]">이메일 주소</dt>
                <dd className="min-w-0 break-words font-semibold">{displayEmail}</dd>
              </div>
            </dl>

            {error ? (
              <div className="mt-6 rounded-xl border border-[#f0c7c7] bg-[#fff6f6] p-3 text-[13px] text-[#bf5555]">
                {error}
              </div>
            ) : null}
          </section>

          <div className="h-2 bg-[#f5f6f6]" />

          <section className="px-4 py-8">
            <h2 className="text-[23px] font-extrabold leading-[1.28]">계정 관리</h2>
            <button
              type="button"
              onClick={() => toast.message("비밀번호 변경은 준비 중입니다.")}
              className="mt-6 block py-3 text-left text-[16px] font-extrabold"
            >
              비밀번호 변경
            </button>
          </section>
        </>
      )}

      {!loading && error ? (
        <div className="px-4 pb-8">
          <AppButton
            label="다시 시도"
            onClick={() => window.location.reload()}
            className="h-12 rounded-full"
          />
        </div>
      ) : null}

      {isEditingName ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#6b716e]/55 px-4 pb-4 pt-16">
          <div className="w-full max-w-[480px] rounded-[24px] bg-white p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-extrabold leading-[1.32]">이름 변경</h2>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md active:bg-[#eef1ef]"
                aria-label="닫기"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="mt-5 h-[52px] w-full rounded-[14px] border border-[#d1d8d5] bg-[#f8f9f8] px-4 text-[18px] font-semibold outline-none focus:border-[#57bf8e]"
              autoFocus
            />

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                disabled={isSavingName}
                className="h-12 rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void saveName()}
                disabled={isSavingName}
                className="h-12 rounded-2xl bg-[#57bf8e] text-[17px] font-semibold text-white disabled:opacity-60"
              >
                {isSavingName ? "저장중..." : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
