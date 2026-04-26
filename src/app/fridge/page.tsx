"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppButton } from "@/components/ui/app-button";
import { CategoryChipFilter } from "@/components/ui/category-chip-filter";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FridgePageSkeleton } from "@/components/features/fridge/fridge-page-skeleton";
import { authedFetch } from "@/lib/authed-fetch";
import { cn } from "@/lib/utils";

type FridgeSectionKey =
  | "cube"
  | "protein"
  | "vegetable"
  | "fruit"
  | "dairy"
  | "grain"
  | "other";

interface FridgeItem {
  id: string;
  name: string;
  category: Exclude<FridgeSectionKey, "cube">;
  quantity?: string;
  expiresAt?: string;
  addedAt: string;
  source: "manual" | "receipt";
}

interface FridgeSection {
  key: FridgeSectionKey;
  label: string;
  emoji: string;
  chipLabel: string;
  items: FridgeItem[];
}

interface ReceiptCandidate {
  tempId: string;
  name: string;
  category: Exclude<FridgeSectionKey, "cube">;
  confidence: number;
}

type ReceiptStage = "capture" | "scanning" | "result";
type ReceiptScanPhase = "uploading" | "analyzing" | "finalizing";
type AddPopupStage = "input" | "review";

interface DraftIngredient {
  id: string;
  name: string;
  type: FridgeSectionKey;
}

const SECTION_ORDER: FridgeSectionKey[] = [
  "cube",
  "protein",
  "vegetable",
  "fruit",
  "dairy",
  "grain",
  "other",
];

const SECTION_META: Record<FridgeSectionKey, { label: string; emoji: string; chipLabel: string }> = {
  cube: { label: "큐브", emoji: "🧊", chipLabel: "큐브" },
  protein: { label: "단백질", emoji: "🥩", chipLabel: "단백질" },
  vegetable: { label: "채소", emoji: "🥦", chipLabel: "채소" },
  fruit: { label: "과일", emoji: "🍎", chipLabel: "과일" },
  dairy: { label: "유제품", emoji: "🥛", chipLabel: "유제품" },
  grain: { label: "곡물", emoji: "🌾", chipLabel: "곡물" },
  other: { label: "기타", emoji: "🍽️", chipLabel: "기타" },
};

const CATEGORY_LABEL: Record<Exclude<FridgeSectionKey, "cube">, string> = {
  protein: "단백질",
  vegetable: "채소",
  fruit: "과일",
  dairy: "유제품",
  grain: "곡물",
  other: "기타",
};

const CATEGORY_TEXT_COLOR: Record<Exclude<FridgeSectionKey, "cube">, string> = {
  protein: "text-[#ff3b30]",
  vegetable: "text-[#3fb68b]",
  fruit: "text-[#ff4fb5]",
  dairy: "text-[#5f8cff]",
  grain: "text-[#f5a524]",
  other: "text-[#7d8682]",
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function FridgePage() {
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
  const [receiptScanPhase, setReceiptScanPhase] = useState<ReceiptScanPhase>("uploading");
  const [receiptScanId, setReceiptScanId] = useState("");
  const [receiptCandidates, setReceiptCandidates] = useState<ReceiptCandidate[]>([]);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set());
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [receiptScanProgress, setReceiptScanProgress] = useState(0);
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
      const res = await authedFetch("/api/fridge/items", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        items?: FridgeItem[];
        message?: string;
      };
      if (!res.ok) throw new Error(json.message ?? "냉장고 데이터를 불러오지 못했습니다.");
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
      const sectionKey: FridgeSectionKey = item.name.includes("큐브")
        ? "cube"
        : item.category;
      if (activeFilter !== "all" && sectionKey !== activeFilter) return false;
      if (q && !item.name.includes(q)) return false;
      return true;
    });

    for (const item of filtered) {
      const sectionKey: FridgeSectionKey = item.name.includes("큐브")
        ? "cube"
        : item.category;
      grouped.get(sectionKey)!.push(item);
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

  const moveToReviewStage = () => {
    if (inputLines.length === 0) return;
    setDraftIngredients(
      inputLines.map((line, index) => ({
        id: `draft-${Date.now()}-${index}`,
        name: line,
        type: newIngredientType,
      }))
    );
    setAddPopupStage("review");
  };

  const addDraftIngredients = async () => {
    if (draftIngredients.length === 0) return;

    try {
      setIsAdding(true);
      for (const ingredient of draftIngredients) {
        const effectiveType = ingredient.type;
        const category = effectiveType === "cube" ? "other" : effectiveType;
        const payloadName =
          effectiveType === "cube" && !ingredient.name.includes("큐브")
            ? `${ingredient.name} 큐브`
            : ingredient.name;
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
      const message =
        error instanceof Error ? error.message : "재료 추가에 실패했습니다.";
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
        toast.error("인식된 항목이 없습니다.");
        setReceiptStage("capture");
        return;
      }
      setReceiptScanId(scanJson.scanId);
      setReceiptCandidates(candidates);
      setSelectedReceiptIds(new Set(candidates.map((c) => c.tempId)));
      setReceiptStage("result");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "영수증 스캔 처리에 실패했습니다.";
      toast.error(message);
      setReceiptStage("capture");
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
  };

  const toggleReceiptCandidate = (tempId: string) => {
    setSelectedReceiptIds((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
      }
      return next;
    });
  };

  const confirmSelectedReceiptItems = async () => {
    if (!receiptScanId) return;
    const selected = receiptCandidates
      .filter((c) => selectedReceiptIds.has(c.tempId))
      .map((c) => ({ tempId: c.tempId }));
    if (selected.length === 0) {
      toast.error("추가할 재료를 1개 이상 선택해주세요.");
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
      ? "요청 전송중"
      : receiptScanPhase === "analyzing"
        ? "영수증 분석 중"
        : "결과 정리중";

  const receiptStageDescription =
    receiptScanPhase === "uploading"
      ? "이미지를 업로드하고 있어요"
      : receiptScanPhase === "analyzing"
        ? "재료를 인식하고 있어요"
        : "스캔 결과를 정리하고 있어요";

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-white pb-24">
      <main className="flex-1 px-4 pt-12">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[#1f2725]">
            내 냉장고
          </h1>
          <button
            type="button"
            onClick={() => router.push("/fridge/edit")}
            className="text-[12px] font-semibold text-[#59C090]"
          >
            수정하기
          </button>
        </div>

        <AppSearchInput
          value={keyword}
          onChange={setKeyword}
          placeholder="재료 검색"
          inputClassName="border-transparent bg-[#eef0ef]"
        />

        <CategoryChipFilter
          options={filterOptions}
          activeKey={activeFilter}
          onChange={(key) => setActiveFilter(key as "all" | FridgeSectionKey)}
        />

        <div className="-mx-4 mt-4 px-4 pb-40 pt-5">
          {isLoading ? (
            <FridgePageSkeleton />
          ) : (
            <div className="space-y-7">
              {filteredSections.map((section) => (
              <section key={section.key}>
                <h2 className="mb-3 text-[16px] font-bold text-[#2a4a3c]">
                  {section.emoji} {section.label}
                </h2>
                <div className="space-y-2.5">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-[14px] border border-[#c8cfcd] bg-white px-4 py-3"
                    >
                      <span className="text-[18px] font-medium text-[#1f2725]">
                        {item.name}
                      </span>
                      {item.quantity ? (
                        <span className="text-[31px] font-semibold text-[#2f8d68]">
                          {item.quantity}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
              ))}
            </div>
          )}

          {!isLoading && filteredSections.length === 0 ? (
            <p className="mt-8 text-center text-[18px] text-[#6f7875]">
              검색 결과가 없습니다
            </p>
          ) : null}
        </div>
      </main>

      <div className="pointer-events-none fixed bottom-[calc(86px+env(safe-area-inset-bottom))] left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 px-4">
        <AppButton
          label="재료 추가"
          onClick={openAddPopup}
          className="pointer-events-auto mx-auto flex h-12 w-[230px] rounded-full shadow-[0_4px_12px_rgba(87,191,142,0.15)]"
        />
      </div>

      {isAddPopupOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#7f8783]/50 px-4 py-4">
          <div className="mx-auto flex max-h-[calc(100dvh-32px)] w-full max-w-[480px] flex-col overflow-y-auto rounded-[28px] bg-[#f6f7f6] p-4">
            <div className="mb-4 flex items-center justify-center relative">
              <h2 className="text-[18px] font-bold text-[#1f2725]">냉장고 재료 추가</h2>
              <button
                type="button"
                onClick={closeAddPopup}
                className="absolute right-0 rounded-md p-1 text-[#1f2725]"
                aria-label="팝업 닫기"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                closeAddPopup();
                setIsReceiptPopupOpen(true);
                setReceiptStage("capture");
                setReceiptScanId("");
                setReceiptCandidates([]);
                setSelectedReceiptIds(new Set());
              }}
              className="mb-4 flex w-full items-center gap-3 rounded-[16px] border border-dashed border-[#6bc89a] bg-[#eef5f1] px-4 py-4 text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#bde8d2]">
                <Camera className="h-6 w-6 text-[#2f7f59]" />
              </div>
              <div>
                <p className="text-[20px] font-bold text-[#2f7f59]">영수증 스캔</p>
                <p className="text-[15px] text-[#6f7875]">사진 찍고 선택해서 추가해요</p>
              </div>
            </button>

            <div className="mb-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-[#d4dbd8]" />
              <span className="text-[14px] font-semibold text-[#63bc8f]">또는 직접 입력</span>
              <div className="h-px flex-1 bg-[#d4dbd8]" />
            </div>

            {addPopupStage === "input" ? (
              <>
                <label className="text-[18px] font-bold text-[#1f2725]">재료명</label>
                <textarea
                  value={newIngredientName}
                  onChange={(event) => setNewIngredientName(event.target.value)}
                  placeholder={"예:\n브로콜리\n당근\n소고기"}
                  rows={4}
                  className="mb-2 mt-2 w-full resize-none rounded-[12px] border border-[#d1d8d5] bg-[#f8f9f8] px-4 py-3 text-[18px] leading-[1.5] outline-none placeholder:text-[#97a19e]"
                />
                <p className="mb-6 text-[13px] text-[#7f8a86]">
                  한 줄에 하나씩 입력하고 엔터로 줄바꿈하면 여러 재료를 한 번에 추가할 수 있어요.
                </p>

                <p className="mb-2 text-[18px] font-bold text-[#1f2725]">기본 종류</p>
                <div className="grid grid-cols-4 gap-2">
                  {SECTION_ORDER.map((key) => (
                    <button
                      key={`add-type-${key}`}
                      type="button"
                      onClick={() => setNewIngredientType(key)}
                      className={`rounded-[12px] border px-1 py-3 text-center ${
                        newIngredientType === key
                          ? "border-[#57bf8e] bg-[#eef8f3]"
                          : "border-[#d0d7d4] bg-[#f7f8f7]"
                      }`}
                    >
                      <div className="text-[18px]">{SECTION_META[key].emoji}</div>
                      <div className="mt-1 text-[16px] font-semibold text-[#2a312f]">
                        {SECTION_META[key].label}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-auto pt-4">
                  <button
                    type="button"
                    onClick={moveToReviewStage}
                    disabled={inputLines.length === 0}
                    className="h-12 w-full rounded-2xl bg-[#57bf8e] text-[20px] font-semibold text-white disabled:opacity-60"
                  >
                    다음
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3 text-[18px] font-bold text-[#1f2725]">추가할 재료 확인</p>
                <div className="mb-4 max-h-[260px] space-y-2 overflow-y-auto rounded-[14px] border border-[#d1d8d5] bg-[#f8f9f8] p-3">
                  {draftIngredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="flex items-center justify-between gap-2 rounded-[10px] border border-[#dde2df] bg-white px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-[16px] text-[#1f2725]">
                        {ingredient.name}
                      </span>
                      <select
                        value={ingredient.type}
                        onChange={(event) => {
                          const nextType = event.target.value as FridgeSectionKey;
                          setDraftIngredients((prev) =>
                            prev.map((item) =>
                              item.id === ingredient.id ? { ...item, type: nextType } : item
                            )
                          );
                        }}
                        className="h-9 rounded-[10px] border border-[#cfd6d3] bg-white px-2 text-[14px] text-[#2a312f] outline-none"
                      >
                        {SECTION_ORDER.map((key) => (
                          <option key={`draft-type-${ingredient.id}-${key}`} value={key}>
                            {SECTION_META[key].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="mb-4 text-[13px] text-[#7f8a86]">
                  각 항목의 종류를 확인한 뒤 한 번에 추가하세요.
                </p>

                <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddPopupStage("input")}
                    disabled={isAdding}
                    className="h-12 rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]"
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={addDraftIngredients}
                    disabled={isAdding || draftIngredients.length === 0}
                    className="h-12 rounded-2xl bg-[#57bf8e] text-[17px] font-semibold text-white disabled:opacity-60"
                  >
                    {isAdding ? "추가중..." : "추가하기"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {isReceiptPopupOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#6b716e]/65 px-4 py-4">
          <div className="mx-auto w-full max-w-[480px] rounded-[28px] bg-[#f6f7f6] px-4 pb-5 pt-4">
            <input
              ref={albumInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void handleReceiptFile(file);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void handleReceiptFile(file);
              }}
            />
            {receiptStage === "capture" ? (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <span className="w-6" />
                  <h3 className="text-[35px] font-bold text-[#1f2725]">영수증 스캔</h3>
                  <button
                    type="button"
                    onClick={closeReceiptPopup}
                    className="rounded-md p-1 text-[#1f2725]"
                    aria-label="닫기"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>

                <div className="mb-6 flex flex-col items-center py-7">
                  <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-[18px] bg-[#e8eeeb]">
                    <Camera className="h-10 w-10 text-[#3b7b5e]" />
                  </div>
                  <p className="text-[40px] font-bold text-[#1f2725]">영수증 사진을 찍어주세요</p>
                  <p className="mt-1 text-[16px] text-[#8a9491]">장 본 내역을 자동으로 인식해요</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => albumInputRef.current?.click()}
                    disabled={isScanningReceipt}
                    className="h-12 rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]"
                  >
                    {isScanningReceipt ? "처리 중..." : "앨범에서"}
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isScanningReceipt}
                    className="h-12 rounded-2xl bg-[#57bf8e] text-[16px] font-semibold text-white"
                  >
                    {isScanningReceipt ? "처리 중..." : "촬영하기"}
                  </button>
                </div>
              </>
            ) : null}

            {receiptStage === "scanning" ? (
              <>
                <div className="mb-5 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={closeReceiptPopup}
                    className="rounded-md p-1 text-[#1f2725]"
                    aria-label="닫기"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>

                <div className="mb-6 flex flex-col items-center py-14">
                  <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-[18px] bg-[#e8eeeb]">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#98aba2] border-t-[#57bf8e]" />
                  </div>
                  <p className="text-[35px] font-bold text-[#1f2725]">{receiptStageLabel}</p>
                  <p className="mt-1 text-[16px] text-[#8a9491]">{receiptStageDescription}</p>
                  <div className="mt-6 w-full max-w-[260px]">
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#dce8e2]">
                      <div
                        className="h-full rounded-full bg-[#57bf8e] transition-[width] duration-300 ease-out"
                        style={{ width: `${receiptScanProgress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[13px] font-semibold text-[#4f7f69]">
                      <span>업로드</span>
                      <span>분석</span>
                      <span>정리</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {receiptStage === "result" ? (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <span className="w-6" />
                  <h3 className="text-[31px] font-semibold text-[#1f2725] underline decoration-[1px] underline-offset-4">
                    스캔 결과 확인
                  </h3>
                  <button
                    type="button"
                    onClick={closeReceiptPopup}
                    className="rounded-md p-1 text-[#1f2725]"
                    aria-label="닫기"
                  >
                    <X className="h-7 w-7" />
                  </button>
                </div>

                <p className="mb-4 text-[19px] font-bold text-[#1f2725]">
                  추가할 재료를 선택해주세요
                </p>

                <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                  {receiptCandidates.map((candidate) => {
                    const selected = selectedReceiptIds.has(candidate.tempId);
                    return (
                      <button
                        key={candidate.tempId}
                        type="button"
                        onClick={() => toggleReceiptCandidate(candidate.tempId)}
                        className={cn(
                          "flex h-[52px] w-full items-center justify-between rounded-[12px] border px-4 text-left",
                          selected
                            ? "border-[#57bf8e] bg-[#f8faf9]"
                            : "border-[#d5dbd8] bg-[#f7f8f7]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[16px] font-semibold text-[#1f2725]">
                            {candidate.name}
                          </span>
                          <span
                            className={cn(
                              "text-[13px] font-semibold",
                              CATEGORY_TEXT_COLOR[candidate.category]
                            )}
                          >
                            {CATEGORY_LABEL[candidate.category]}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            selected ? "bg-[#57bf8e] text-white" : "bg-[#d5dbd8] text-transparent"
                          )}
                        >
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptStage("capture");
                      setReceiptScanId("");
                      setReceiptCandidates([]);
                      setSelectedReceiptIds(new Set());
                    }}
                    disabled={isConfirmingReceipt}
                    className="h-12 rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]"
                  >
                    다시 촬영하기
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmSelectedReceiptItems()}
                    disabled={isConfirmingReceipt}
                    className="h-12 rounded-2xl bg-[#57bf8e] text-[17px] font-semibold text-white disabled:opacity-60"
                  >
                    {isConfirmingReceipt ? "추가중..." : "추가하기"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      <BottomNav />
    </div>
  );
}
