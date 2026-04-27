"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";
import type { ChildSummaryDto, LinkedInfoDto } from "@/lib/dto/children";

function toFamilyErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  switch (error.message) {
    case "unauthorized":
      return "로그인 후 다시 시도해주세요.";
    case "childId is required":
      return "초대할 아기를 선택해주세요.";
    case "linked member cannot create invite code":
      return "가족으로 연결된 계정은 초대코드를 만들 수 없습니다.";
    case "invite code not found":
      return "초대코드를 찾을 수 없습니다.";
    case "invite code expired":
      return "만료된 초대코드입니다.";
    case "cannot join with own invite code":
      return "내가 만든 초대코드로는 연결할 수 없습니다.";
    case "no active family link":
      return "해제할 가족 연결이 없습니다.";
    default:
      return error.message || fallback;
  }
}

export function useFamilyPage() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildSummaryDto[]>([]);
  const [linkedInfo, setLinkedInfo] = useState<LinkedInfoDto | null>(null);
  const [linkedMode, setLinkedMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? children[0] ?? null,
    [children, selectedChildId]
  );

  const loadFamily = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/children", { cache: "no-store" });
      const json = (await res.json()) as {
        children?: ChildSummaryDto[];
        linkedMode?: boolean;
        linkedInfo?: LinkedInfoDto | null;
        message?: string;
      };
      if (!res.ok) throw new Error(json.message ?? "가족 정보를 불러오지 못했습니다.");

      const nextChildren = json.children ?? [];
      setChildren(nextChildren);
      setLinkedMode(Boolean(json.linkedMode));
      setLinkedInfo(json.linkedInfo ?? null);
      setSelectedChildId((current) => {
        if (current && nextChildren.some((child) => child.id === current)) return current;
        return nextChildren.find((child) => child.isPrimary)?.id ?? nextChildren[0]?.id ?? null;
      });
    } catch (error) {
      toast.error(toFamilyErrorMessage(error, "가족 정보를 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFamily();
  }, []);

  const createInviteCode = async () => {
    if (!selectedChild) {
      toast.error("초대할 아기를 선택해주세요.");
      return;
    }

    setIsCreatingCode(true);
    try {
      const res = await authedFetch("/api/children/invite-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: selectedChild.id }),
      });
      const json = (await res.json()) as {
        code?: string;
        message?: string;
      };
      if (!res.ok || !json.code) {
        throw new Error(json.message ?? "초대코드 생성에 실패했습니다.");
      }
      setInviteCode(json.code);
      await navigator.clipboard.writeText(json.code);
      toast.success("초대코드를 복사했습니다.");
    } catch (error) {
      toast.error(toFamilyErrorMessage(error, "초대코드 생성에 실패했습니다."));
    } finally {
      setIsCreatingCode(false);
    }
  };

  const joinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      toast.error("초대코드를 입력해주세요.");
      return;
    }

    setIsJoining(true);
    try {
      const res = await authedFetch("/api/children/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "가족 연결에 실패했습니다.");
      setJoinCode("");
      setInviteCode("");
      toast.success("가족 데이터에 연결되었습니다.");
      await loadFamily();
    } catch (error) {
      toast.error(toFamilyErrorMessage(error, "가족 연결에 실패했습니다."));
    } finally {
      setIsJoining(false);
    }
  };

  const unlinkFamily = async () => {
    setIsUnlinking(true);
    try {
      const res = await authedFetch("/api/children/unlink", {
        method: "POST",
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "가족 연결 해제에 실패했습니다.");
      toast.success("가족 연결이 해제되었습니다.");
      setInviteCode("");
      await loadFamily();
    } catch (error) {
      toast.error(toFamilyErrorMessage(error, "가족 연결 해제에 실패했습니다."));
    } finally {
      setIsUnlinking(false);
    }
  };

  return {
    children,
    createInviteCode,
    inviteCode,
    isCreatingCode,
    isJoining,
    isUnlinking,
    joinByCode,
    joinCode,
    linkedInfo,
    linkedMode,
    loading,
    router,
    selectedChild,
    selectedChildId,
    setJoinCode,
    setSelectedChildId,
    unlinkFamily,
  };
}
