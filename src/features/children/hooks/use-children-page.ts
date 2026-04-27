"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";

interface ChildProfile {
  id: string;
  name: string;
  monthsOld: number;
  allergies?: string[];
  isPrimary: boolean;
}

function toChildActionErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  switch (error.message) {
    case "unauthorized":
      return "로그인 후 다시 시도해주세요.";
    case "name is required":
      return "아기 이름을 입력해주세요.";
    case "monthsOld must be a non-negative integer":
      return "개월 수는 0 이상의 정수로 입력해주세요.";
    case "linked member cannot add child":
      return "가족으로 연결된 계정은 아기를 추가할 수 없습니다.";
    case "linked member cannot edit child":
      return "가족으로 연결된 계정은 아기 정보를 수정할 수 없습니다.";
    case "linked member cannot delete child":
      return "가족으로 연결된 계정은 아기 정보를 삭제할 수 없습니다.";
    case "child not found":
      return "아기 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.";
    default:
      return error.message || fallback;
  }
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
  const [editingChildMonthsOld, setEditingChildMonthsOld] = useState("");
  const [isUpdatingChild, setIsUpdatingChild] = useState(false);

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

  const addChild = async (): Promise<boolean> => {
    const name = newName.trim();
    const monthsOld = Number.parseInt(newMonthsOld, 10);
    if (!name) {
      toast.error("아기 이름을 입력해주세요.");
      return false;
    }
    if (!Number.isInteger(monthsOld) || monthsOld < 0) {
      toast.error("개월 수는 0 이상의 정수여야 합니다.");
      return false;
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
      toast.success("아기를 추가했습니다.");
      return true;
    } catch (error) {
      toast.error(toChildActionErrorMessage(error, "아이 추가에 실패했습니다."));
      return false;
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

  const startEditChild = (child: ChildProfile) => {
    setEditingChildId(child.id);
    setEditingChildName(child.name);
    setEditingChildMonthsOld(String(child.monthsOld));
  };

  const cancelEditChild = () => {
    setEditingChildId(null);
    setEditingChildName("");
    setEditingChildMonthsOld("");
  };

  const saveChild = async () => {
    if (!editingChildId) return;
    const name = editingChildName.trim();
    if (!name) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    const monthsOld = Number.parseInt(editingChildMonthsOld, 10);
    if (!Number.isInteger(monthsOld) || monthsOld < 0) {
      toast.error("개월 수는 0 이상의 정수여야 합니다.");
      return;
    }

    setIsUpdatingChild(true);
    try {
      const res = await authedFetch("/api/children", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingChildId,
          name,
          monthsOld,
        }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "아기 정보 수정에 실패했습니다.");
      cancelEditChild();
      await loadChildren();
      toast.success("아기 정보를 수정했습니다.");
    } catch (error) {
      toast.error(toChildActionErrorMessage(error, "아기 정보 수정에 실패했습니다."));
    } finally {
      setIsUpdatingChild(false);
    }
  };

  return {
    addChild,
    cancelEditChild,
    children,
    deleteChild,
    deletingChildId,
    editingChildId,
    editingChildMonthsOld,
    editingChildName,
    isSubmitting,
    isUpdatingChild,
    linkedMode,
    loadChildren,
    loading,
    newMonthsOld,
    newName,
    router,
    saveChild,
    setEditingChildMonthsOld,
    setEditingChildName,
    setNewMonthsOld,
    setNewName,
    setPrimaryChild,
    startEditChild,
  };
}
