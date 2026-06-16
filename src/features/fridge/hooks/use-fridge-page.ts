"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authedFetch, authedJson } from "@/lib/authed-fetch";
import {
  FRIDGE_CATEGORY_LABEL,
  FRIDGE_CATEGORY_TEXT_COLOR,
  FRIDGE_SECTION_META,
  FRIDGE_SECTION_ORDER,
  FridgeCategory,
  FridgeItem,
  FridgeSection,
  FridgeSectionKey,
  sectionFromFridgeItem,
} from "@/features/fridge/lib/fridge-types";
import {
  buildFridgePayloadName,
  selectAddableDraftIngredients,
  selectNewDraftIngredients,
} from "@/features/fridge/lib/fridge-duplicates";

export type { FridgeCategory, FridgeItem, FridgeSection, FridgeSectionKey };

export interface ReceiptCandidate {
  tempId: string;
  name: string;
  category: FridgeCategory;
  confidence: number;
}

export type ReceiptStage = "capture" | "scanning" | "result" | "error";
export type ReceiptScanPhase = "uploading" | "analyzing" | "finalizing";
export type AddPopupStage = "input" | "review";

export interface DraftIngredient {
  id: string;
  name: string;
  type: FridgeSectionKey;
}

export const SECTION_ORDER = FRIDGE_SECTION_ORDER;
export const SECTION_META = FRIDGE_SECTION_META;
export const CATEGORY_LABEL = FRIDGE_CATEGORY_LABEL;
export const CATEGORY_TEXT_COLOR = FRIDGE_CATEGORY_TEXT_COLOR;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useFridgePage() {
  const router = useRouter();
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | FridgeSectionKey>("all");
  const [keyword, setKeyword] = useState("");
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);
  const [isReceiptPopupOpen, setIsReceiptPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientType, setNewIngredientType] = useState<FridgeSectionKey>("cube");
  const [addPopupStage, setAddPopupStage] = useState<AddPopupStage>("input");
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>([]);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [receiptStage, setReceiptStage] = useState<ReceiptStage>("capture");
  const [receiptScanPhase, setReceiptScanPhase] =
    useState<ReceiptScanPhase>("uploading");
  const [receiptScanId, setReceiptScanId] = useState("");
  const [receiptCandidates, setReceiptCandidates] = useState<ReceiptCandidate[]>([]);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set());
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [receiptScanProgress, setReceiptScanProgress] = useState(0);
  const [receiptErrorMessage, setReceiptErrorMessage] = useState("");
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isScanningReceipt) {
      setReceiptScanProgress(0);
      return;
    }

    const target =
      receiptScanPhase === "uploading"
        ? 26
        : receiptScanPhase === "analyzing"
          ? 78
          : 96;

    const timer = window.setInterval(() => {
      setReceiptScanProgress((current) => {
        if (current >= target) {
          window.clearInterval(timer);
          return current;
        }

        const next = current + Math.max(1, Math.ceil((target - current) / 6));
        return Math.min(next, target);
      });
    }, 90);

    return () => window.clearInterval(timer);
  }, [isScanningReceipt, receiptScanPhase]);

  const loadFridgeItems = async () => {
    try {
      setIsLoading(true);
      const json = await authedJson<{
        items?: FridgeItem[];
        message?: string;
      }>("/api/fridge/items");
      setFridgeItems(json.items ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "냉장고 데이터를 불러오지 못했습니다.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFridgeItems();
  }, []);

  const inputLines = useMemo(
    () =>
      newIngredientName
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    [newIngredientName]
  );

  const filteredSections = useMemo(() => {
    const q = keyword.trim();
    const grouped = new Map<FridgeSectionKey, FridgeItem[]>();
    for (const key of SECTION_ORDER) grouped.set(key, []);

    const filtered = fridgeItems.filter((item) => {
      const sectionKey = sectionFromFridgeItem(item);
      if (activeFilter !== "all" && sectionKey !== activeFilter) return false;
      if (q && !item.name.includes(q)) return false;
      return true;
    });

    for (const item of filtered) {
      const sectionKey = sectionFromFridgeItem(item);
      grouped.get(sectionKey)?.push(item);
    }

    return SECTION_ORDER.map((key) => ({
      key,
      label: SECTION_META[key].label,
      emoji: SECTION_META[key].emoji,
      chipLabel: SECTION_META[key].chipLabel,
      items: grouped.get(key) ?? [],
    })).filter((section) => section.items.length > 0);
  }, [activeFilter, fridgeItems, keyword]);

  const filterOptions = useMemo(
    () => [
      { key: "all", label: "전체" },
      ...SECTION_ORDER.map((key) => ({ key, label: SECTION_META[key].chipLabel })),
    ],
    []
  );

  const openAddPopup = () => {
    setIsAddPopupOpen(true);
    setAddPopupStage("input");
    setDraftIngredients([]);
    setNewIngredientName("");
    setNewIngredientType("cube");
  };

  const closeAddPopup = () => {
    setIsAddPopupOpen(false);
    setAddPopupStage("input");
    setDraftIngredients([]);
    setNewIngredientName("");
    setNewIngredientType("cube");
  };

  const openReceiptPopup = () => {
    setIsAddPopupOpen(false);
    setIsReceiptPopupOpen(true);
    setReceiptStage("capture");
    setReceiptScanPhase("uploading");
    setReceiptScanId("");
    setReceiptCandidates([]);
    setSelectedReceiptIds(new Set());
    setReceiptErrorMessage("");
  };

  const openReceiptCamera = () => {
    setIsAddPopupOpen(false);
    setIsReceiptPopupOpen(true);
    setReceiptStage("capture");
    setReceiptScanPhase("uploading");
    setReceiptScanId("");
    setReceiptCandidates([]);
    setSelectedReceiptIds(new Set());
    setReceiptErrorMessage("");
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    cameraInputRef.current?.click();
  };

  const moveToReviewStage = () => {
    if (inputLines.length === 0) return;
    const selection = selectNewDraftIngredients({
      lines: inputLines,
      type: newIngredientType,
      existingItems: fridgeItems,
      idPrefix: `draft-${Date.now()}`,
    });

    if (selection.drafts.length === 0) {
      toast.warning("이미 냉장고에 있는 재료예요.");
      return;
    }
    if (selection.skippedExisting.length > 0 || selection.skippedRepeated.length > 0) {
      toast.warning("중복 재료는 제외했어요.");
    }

    setDraftIngredients(selection.drafts);
    setAddPopupStage("review");
  };

  const addDraftIngredients = async () => {
    if (draftIngredients.length === 0) return;

    const selection = selectAddableDraftIngredients({
      drafts: draftIngredients,
      existingItems: fridgeItems,
    });
    if (selection.drafts.length === 0) {
      toast.warning("이미 냉장고에 있는 재료예요.");
      return;
    }
    if (selection.skippedExisting.length > 0 || selection.skippedRepeated.length > 0) {
      toast.warning("중복 재료는 제외했어요.");
    }

    try {
      setIsAdding(true);
      for (const ingredient of selection.drafts) {
        const effectiveType = ingredient.type;
        const category = effectiveType === "cube" ? "other" : effectiveType;
        const payloadName = buildFridgePayloadName(ingredient.name, effectiveType);
        const res = await authedFetch("/api/fridge/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: payloadName, category }),
        });
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) throw new Error(json.message ?? "재료 추가에 실패했습니다.");
      }

      await loadFridgeItems();
      setActiveFilter("all");
      closeAddPopup();
    } catch (error) {
      const message = error instanceof Error ? error.message : "재료 추가에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("파일을 읽지 못했습니다."));
      };
      reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
      reader.readAsDataURL(file);
    });

  const handleReceiptFile = async (file: File | null) => {
    if (!file) return;

    let analyzeTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      setIsScanningReceipt(true);
      setReceiptStage("scanning");
      setReceiptScanPhase("uploading");
      analyzeTimer = setTimeout(() => {
        setReceiptScanPhase((current) =>
          current === "uploading" ? "analyzing" : current
        );
      }, 700);
      const imageDataUrl = await fileToDataUrl(file);
      setReceiptScanPhase("analyzing");

      const scanRes = await authedFetch("/api/fridge/receipt-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          fileName: file.name,
        }),
      });
      if (analyzeTimer) {
        clearTimeout(analyzeTimer);
        analyzeTimer = null;
      }
      const scanJson = (await scanRes.json().catch(() => ({}))) as {
        scanId?: string;
        candidates?: ReceiptCandidate[];
        message?: string;
      };
      if (!scanRes.ok || !scanJson.scanId) {
        throw new Error(scanJson.message ?? "영수증 스캔에 실패했습니다.");
      }
      setReceiptScanPhase("finalizing");
      await wait(250);

      const candidates = scanJson.candidates ?? [];
      if (candidates.length === 0) {
        setReceiptErrorMessage("인식된 항목이 없어요. 영수증 전체가 보이도록 다시 촬영해주세요.");
        setReceiptStage("error");
        return;
      }
      setReceiptScanId(scanJson.scanId);
      setReceiptCandidates(candidates);
      setSelectedReceiptIds(new Set(candidates.map((c) => c.tempId)));
      setReceiptStage("result");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "영수증 스캔 처리에 실패했습니다.";
      setReceiptErrorMessage(message);
      setReceiptStage("error");
    } finally {
      if (analyzeTimer) {
        clearTimeout(analyzeTimer);
      }
      setIsScanningReceipt(false);
      setReceiptScanPhase("uploading");
      if (albumInputRef.current) albumInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const closeReceiptPopup = () => {
    setIsReceiptPopupOpen(false);
    setReceiptStage("capture");
    setReceiptScanPhase("uploading");
    setReceiptScanId("");
    setReceiptCandidates([]);
    setSelectedReceiptIds(new Set());
    setReceiptErrorMessage("");
  };

  const resetReceiptToCapture = () => {
    setReceiptStage("capture");
    setReceiptScanId("");
    setReceiptCandidates([]);
    setSelectedReceiptIds(new Set());
    setReceiptErrorMessage("");
  };

  const toggleReceiptCandidate = (tempId: string) => {
    setSelectedReceiptIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId);
      else next.add(tempId);
      return next;
    });
  };

  const updateReceiptCandidate = (
    tempId: string,
    patch: Partial<Pick<ReceiptCandidate, "name" | "category">>
  ) => {
    setReceiptCandidates((prev) =>
      prev.map((candidate) =>
        candidate.tempId === tempId ? { ...candidate, ...patch } : candidate
      )
    );
  };

  const confirmSelectedReceiptItems = async () => {
    if (!receiptScanId) return;
    const selected = receiptCandidates
      .filter((candidate) => selectedReceiptIds.has(candidate.tempId))
      .map((candidate) => ({
        tempId: candidate.tempId,
        name: candidate.name.trim(),
        category: candidate.category,
      }));

    if (selected.length === 0) {
      toast.error("추가할 재료를 1개 이상 선택해주세요.");
      return;
    }
    if (selected.some((candidate) => candidate.name.length === 0)) {
      toast.error("선택한 재료명을 확인해주세요.");
      return;
    }

    try {
      setIsConfirmingReceipt(true);
      const confirmRes = await authedFetch("/api/fridge/receipt-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanId: receiptScanId,
          selected,
        }),
      });
      const confirmJson = (await confirmRes.json().catch(() => ({}))) as {
        addedCount?: number;
        message?: string;
      };
      if (!confirmRes.ok) {
        throw new Error(confirmJson.message ?? "영수증 항목 추가에 실패했습니다.");
      }
      await loadFridgeItems();
      closeReceiptPopup();
      toast.success(`${confirmJson.addedCount ?? selected.length}개 항목을 추가했습니다.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "영수증 항목 추가에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsConfirmingReceipt(false);
    }
  };

  const receiptStageLabel =
    receiptScanPhase === "uploading"
      ? "사진 업로드 중"
      : receiptScanPhase === "analyzing"
        ? "재료 인식 중"
        : "결과 정리 중";

  const receiptStageDescription =
    receiptScanPhase === "uploading"
      ? "선택한 사진을 안전하게 보내고 있어요."
      : receiptScanPhase === "analyzing"
        ? "영수증에서 식재료 이름만 골라내고 있어요."
        : "추가하기 전에 고칠 수 있도록 정리하고 있어요.";

  const showEmptyFridgeCta = !isLoading && fridgeItems.length === 0;

  return {
    router,
    fridgeItems,
    activeFilter,
    setActiveFilter,
    keyword,
    setKeyword,
    isAddPopupOpen,
    isReceiptPopupOpen,
    isLoading,
    isAdding,
    newIngredientName,
    setNewIngredientName,
    newIngredientType,
    setNewIngredientType,
    addPopupStage,
    setAddPopupStage,
    draftIngredients,
    setDraftIngredients,
    isScanningReceipt,
    receiptStage,
    setReceiptStage,
    receiptScanPhase,
    receiptScanId,
    receiptCandidates,
    setReceiptCandidates,
    selectedReceiptIds,
    isConfirmingReceipt,
    receiptScanProgress,
    receiptErrorMessage,
    albumInputRef,
    cameraInputRef,
    inputLines,
    filteredSections,
    filterOptions,
    openAddPopup,
    closeAddPopup,
    openReceiptPopup,
    openReceiptCamera,
    moveToReviewStage,
    addDraftIngredients,
    handleReceiptFile,
    closeReceiptPopup,
    resetReceiptToCapture,
    toggleReceiptCandidate,
    updateReceiptCandidate,
    confirmSelectedReceiptItems,
    receiptStageLabel,
    receiptStageDescription,
    showEmptyFridgeCta,
  };
}
