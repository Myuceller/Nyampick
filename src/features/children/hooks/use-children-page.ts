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
  photoUrl?: string;
}

export function useChildrenPage() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newMonthsOld, setNewMonthsOld] = useState("0");
  const [linkedMode, setLinkedMode] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildName, setEditingChildName] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [updatingPhotoChildId, setUpdatingPhotoChildId] = useState<string | null>(null);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/children", { cache: "no-store" });
      const json = (await res.json()) as {
        children?: ChildProfile[];
        linkedMode?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(json.message ?? "아이 정보를 불러오지 못했습니다.");
      setChildren(json.children ?? []);
      setLinkedMode(Boolean(json.linkedMode));
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

  const deleteChild = async (childId: string) => {
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

  const saveChildPhoto = async (childId: string, photoUrl: string) => {
    setUpdatingPhotoChildId(childId);
    try {
      const res = await authedFetch("/api/children", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: childId, photoUrl }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "프로필 사진 저장에 실패했습니다.");
      toast.success("아이 사진을 등록했습니다.");
      await loadChildren();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "프로필 사진 저장에 실패했습니다.");
    } finally {
      setUpdatingPhotoChildId(null);
    }
  };

  return {
    addChild,
    cancelEditChildName,
    children,
    deleteChild,
    deletingChildId,
    editingChildId,
    editingChildName,
    isSubmitting,
    isUpdatingName,
    updatingPhotoChildId,
    linkedMode,
    loadChildren,
    loading,
    newMonthsOld,
    newName,
    router,
    saveChildName,
    saveChildPhoto,
    setEditingChildName,
    setNewMonthsOld,
    setNewName,
    setPrimaryChild,
    startEditChildName,
  };
}
