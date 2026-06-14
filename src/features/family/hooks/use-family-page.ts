"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";

export interface FamilyMember {
  id: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
  role: "owner" | "member";
  roleLabel: string;
  linkedAt?: string;
}

export const RELATIONSHIP_OPTIONS = ["배우자", "가족", "친구", "도우미"];

interface FamilyResponse {
  viewerRole?: "owner" | "member";
  linkedMode?: boolean;
  members?: FamilyMember[];
  childCount?: number;
  message?: string;
}

export function useFamilyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [childCount, setChildCount] = useState(0);
  const [viewerRole, setViewerRole] = useState<"owner" | "member">("owner");
  const [linkedMode, setLinkedMode] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [relationshipLabel, setRelationshipLabel] = useState(RELATIONSHIP_OPTIONS[0]);
  const [isJoining, setIsJoining] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [unlinkingMemberId, setUnlinkingMemberId] = useState<string | null>(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const loadFamily = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/family", { cache: "no-store" });
      const json = (await res.json()) as FamilyResponse;
      if (!res.ok) throw new Error(json.message ?? "가족 정보를 불러오지 못했습니다.");
      setMembers(json.members ?? []);
      setChildCount(json.childCount ?? 0);
      setViewerRole(json.viewerRole ?? "owner");
      setLinkedMode(Boolean(json.linkedMode));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "가족 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFamily();
  }, []);

  const createInviteCode = async () => {
    if (isCreatingCode) return;
    setIsCreatingCode(true);
    try {
      const res = await authedFetch("/api/children/invite-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as { code?: string; message?: string };
      if (!res.ok || !json.code) {
        throw new Error(json.message ?? "가족 코드를 만들지 못했습니다.");
      }
      setInviteCode(json.code);
      await navigator.clipboard.writeText(json.code);
      toast.success("가족 코드를 복사했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "가족 코드를 만들지 못했습니다.");
    } finally {
      setIsCreatingCode(false);
    }
  };

  const copyInviteCode = async () => {
    if (!inviteCode) {
      await createInviteCode();
      return;
    }
    await navigator.clipboard.writeText(inviteCode);
    toast.success("가족 코드를 복사했습니다.");
  };

  const joinFamily = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    try {
      const res = await authedFetch("/api/children/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, relationshipLabel }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "가족 참여에 실패했습니다.");
      setJoinCode("");
      setInviteCode("");
      setIsJoinOpen(false);
      toast.success("가족에 참여했습니다.");
      await loadFamily();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "가족 참여에 실패했습니다.");
    } finally {
      setIsJoining(false);
    }
  };

  const unlinkFamily = async () => {
    setIsUnlinking(true);
    try {
      const res = await authedFetch("/api/children/unlink", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "가족 연결 해제에 실패했습니다.");
      toast.success("가족 연결이 해제되었습니다.");
      await loadFamily();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "가족 연결 해제에 실패했습니다.");
    } finally {
      setIsUnlinking(false);
    }
  };

  const unlinkFamilyMember = async (guestUserId: string) => {
    if (unlinkingMemberId) return;
    setUnlinkingMemberId(guestUserId);
    try {
      const res = await authedFetch("/api/family", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestUserId }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "가족 연결 해제에 실패했습니다.");
      toast.success("가족 연결을 끊었습니다.");
      await loadFamily();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "가족 연결 해제에 실패했습니다.");
    } finally {
      setUnlinkingMemberId(null);
    }
  };

  return {
    childCount,
    copyInviteCode,
    createInviteCode,
    inviteCode,
    isCreatingCode,
    isJoinOpen,
    isJoining,
    isUnlinking,
    unlinkingMemberId,
    joinCode,
    joinFamily,
    linkedMode,
    loadFamily,
    loading,
    members,
    router,
    setIsJoinOpen,
    setJoinCode,
    relationshipLabel,
    setRelationshipLabel,
    unlinkFamily,
    unlinkFamilyMember,
    viewerRole,
  };
}
