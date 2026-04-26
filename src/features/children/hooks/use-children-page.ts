"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";

interface ChildProfile {
  id: string;
  name: string;
  monthsOld: number;
  isPrimary: boolean;
}

interface LinkedInfo {
  ownerUserId: string;
  childId: string;
  linkedAt: string;
  ownerName?: string;
  ownerEmail?: string;
  childName?: string;
}

export function useChildrenPage() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);
  const [codeChildId, setCodeChildId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newMonthsOld, setNewMonthsOld] = useState("0");
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [inviteCodeByChildId, setInviteCodeByChildId] = useState<Record<string, string>>({});
  const [linkedMode, setLinkedMode] = useState(false);
  const [viewerEmail, setViewerEmail] = useState<string>("");
  const [viewerId, setViewerId] = useState<string>("");
  const [linkedInfo, setLinkedInfo] = useState<LinkedInfo | null>(null);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildName, setEditingChildName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/children", { cache: "no-store" });
      const json = (await res.json()) as {
        children?: ChildProfile[];
        linkedMode?: boolean;
        viewer?: {
          id: string;
          email: string | null;
        };
        linkedInfo?: LinkedInfo | null;
        message?: string;
      };
      if (!res.ok) throw new Error(json.message ?? "아이 정보를 불러오지 못했습니다.");
      setChildren(json.children ?? []);
      setLinkedMode(Boolean(json.linkedMode));
      setViewerEmail(json.viewer?.email ?? "");
      setViewerId(json.viewer?.id ?? "");
      setLinkedInfo(json.linkedInfo ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "아이 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChildren();
  }, []);

  const addChild = async () => {
    const name = newName.trim();
    const monthsOld = Number.parseInt(newMonthsOld, 10);
    if (!name) return;
    if (!Number.isInteger(monthsOld) || monthsOld < 0) {
      toast.error("개월 수는 0 이상의 정수여야 합니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authedFetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, monthsOld }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "아이 추가에 실패했습니다.");
      setNewName("");
      setNewMonthsOld("0");
      await loadChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "아이 추가에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPrimaryChild = async (childId: string) => {
    try {
      const res = await authedFetch("/api/children", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: childId, isPrimary: true }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "대표 아이 설정에 실패했습니다.");
      await loadChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "대표 아이 설정에 실패했습니다.");
    }
  };

  const deleteChild = async (childId: string, childName: string) => {
    if (!confirm(`"${childName}" 아기 정보를 삭제할까요?`)) return;
    setDeletingChildId(childId);
    try {
      const res = await authedFetch("/api/children", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: childId }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "아기 삭제에 실패했습니다.");
      await loadChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "아기 삭제에 실패했습니다.");
    } finally {
      setDeletingChildId(null);
    }
  };

  const startEditChildName = (child: ChildProfile) => {
    setEditingChildId(child.id);
    setEditingChildName(child.name);
  };

  const cancelEditChildName = () => {
    setEditingChildId(null);
    setEditingChildName("");
  };

  const saveChildName = async () => {
    if (!editingChildId) return;
    const name = editingChildName.trim();
    if (!name) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    setIsUpdatingName(true);
    try {
      const res = await authedFetch("/api/children", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingChildId, name }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "이름 변경에 실패했습니다.");
      cancelEditChildName();
      await loadChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이름 변경에 실패했습니다.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const createInviteCode = async (childId: string) => {
    if (codeChildId) return;
    setCodeChildId(childId);
    try {
      const res = await authedFetch("/api/children/invite-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });
      const json = (await res.json()) as {
        code?: string;
        message?: string;
      };
      if (!res.ok || !json.code) {
        throw new Error(json.message ?? "초대코드 생성에 실패했습니다.");
      }
      const inviteCode = json.code;
      setInviteCodeByChildId((prev) => ({ ...prev, [childId]: inviteCode }));
      await navigator.clipboard.writeText(inviteCode);
      toast.success("초대코드를 복사했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "초대코드 생성에 실패했습니다.");
    } finally {
      setCodeChildId(null);
    }
  };

  const joinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setIsJoining(true);
    try {
      const res = await authedFetch("/api/children/join-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "초대코드 연결에 실패했습니다.");
      setJoinCode("");
      toast.success("가족 데이터에 연결되었습니다.");
      await loadChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "초대코드 연결에 실패했습니다.");
    } finally {
      setIsJoining(false);
    }
  };

  const unlinkFamily = async () => {
    if (!confirm("가족 연결을 끊을까요?")) return;
    setIsUnlinking(true);
    try {
      const res = await authedFetch("/api/children/unlink", {
        method: "POST",
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "가족 연결 해제에 실패했습니다.");
      toast.success("가족 연결이 해제되었습니다.");
      await loadChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "가족 연결 해제에 실패했습니다.");
    } finally {
      setIsUnlinking(false);
    }
  };

  return {
    addChild,
    cancelEditChildName,
    children,
    codeChildId,
    createInviteCode,
    deleteChild,
    deletingChildId,
    editingChildId,
    editingChildName,
    inviteCodeByChildId,
    isJoining,
    isSubmitting,
    isUnlinking,
    isUpdatingName,
    joinByCode,
    joinCode,
    linkedInfo,
    linkedMode,
    loadChildren,
    loading,
    newMonthsOld,
    newName,
    router,
    saveChildName,
    setEditingChildName,
    setJoinCode,
    setNewMonthsOld,
    setNewName,
    setPrimaryChild,
    startEditChildName,
    unlinkFamily,
    viewerEmail,
    viewerId,
  };
}
