"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authedFetch } from "@/lib/authed-fetch";
import type { ChildSummaryDto } from "@/lib/dto/children";

export const commonAllergies = [
  "우유",
  "달걀",
  "밀",
  "땅콩",
  "대두",
  "견과류",
  "갑각류",
  "생선",
  "조개류",
  "참깨",
  "복숭아",
  "토마토",
  "돼지고기",
  "소고기",
  "닭고기",
  "메밀",
  "호두",
  "잣",
  "키위",
  "바나나",
  "딸기",
];

function normalizeAllergy(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueAllergies(values: string[]) {
  return Array.from(new Set(values.map(normalizeAllergy).filter(Boolean)));
}

function toAllergyErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  switch (error.message) {
    case "unauthorized":
      return "로그인 후 다시 시도해주세요.";
    case "linked member cannot edit child":
      return "가족으로 연결된 계정은 알레르기를 수정할 수 없습니다.";
    case "child not found":
      return "아기 정보를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.";
    default:
      return error.message || fallback;
  }
}

export function useAllergyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [linkedMode, setLinkedMode] = useState(false);
  const [child, setChild] = useState<ChildSummaryDto | null>(null);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedAllergies), [selectedAllergies]);

  const loadAllergies = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/children", { cache: "no-store" });
      const json = (await res.json()) as {
        children?: ChildSummaryDto[];
        linkedMode?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(json.message ?? "알레르기 정보를 불러오지 못했습니다.");

      const children = json.children ?? [];
      const primary = children.find((item) => item.isPrimary) ?? children[0] ?? null;
      setChild(primary);
      setSelectedAllergies(uniqueAllergies(primary?.allergies ?? []));
      setLinkedMode(Boolean(json.linkedMode));
    } catch (error) {
      toast.error(toAllergyErrorMessage(error, "알레르기 정보를 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAllergies();
  }, []);

  const saveAllergies = async (nextAllergies: string[]) => {
    if (!child) {
      toast.error("아기 정보를 찾지 못했습니다.");
      return;
    }
    if (linkedMode) {
      toast.error("가족으로 연결된 계정은 알레르기를 수정할 수 없습니다.");
      return;
    }

    const normalized = uniqueAllergies(nextAllergies);
    const previous = selectedAllergies;
    setSelectedAllergies(normalized);
    setIsSaving(true);

    try {
      const res = await authedFetch("/api/children", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: child.id,
          allergies: normalized,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "알레르기 저장에 실패했습니다.");
    } catch (error) {
      setSelectedAllergies(previous);
      toast.error(toAllergyErrorMessage(error, "알레르기 저장에 실패했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomAllergy = async () => {
    const value = normalizeAllergy(customAllergy);
    if (!value) {
      toast.error("추가할 알레르기를 입력해주세요.");
      return;
    }
    if (selectedSet.has(value)) {
      toast.message("이미 등록된 알레르기입니다.");
      setCustomAllergy("");
      return;
    }

    setCustomAllergy("");
    await saveAllergies([...selectedAllergies, value]);
  };

  const removeAllergy = async (allergy: string) => {
    await saveAllergies(selectedAllergies.filter((item) => item !== allergy));
  };

  const toggleCommonAllergy = async (allergy: string) => {
    if (selectedSet.has(allergy)) {
      await removeAllergy(allergy);
      return;
    }
    await saveAllergies([...selectedAllergies, allergy]);
  };

  return {
    addCustomAllergy,
    child,
    commonAllergies,
    customAllergy,
    isSaving,
    linkedMode,
    loading,
    removeAllergy,
    router,
    selectedAllergies,
    selectedSet,
    setCustomAllergy,
    toggleCommonAllergy,
  };
}
