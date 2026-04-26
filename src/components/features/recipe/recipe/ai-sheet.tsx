import {
  Bookmark,
  Check,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppSearchInput } from "@/components/ui/app-search-input";
import { cn } from "@/lib/utils";
import type { AiGenerationStage } from "./use-recipe-page";
import { FridgeSection, GeneratedRecipe } from "./types";

interface AiSheetProps {
  open: boolean;
  view: "select" | "result";
  isGeneratingAi: boolean;
  aiGenerationStage: AiGenerationStage;
  isLoadingFridge: boolean;
  ingredientKeyword: string;
  ingredientSections: FridgeSection[];
  selectedIngredientIds: Set<string>;
  selectedIngredientCount: number;
  isAllDisplayedSelected: boolean;
  generatedRecipes: GeneratedRecipe[];
  savedGeneratedIds: Set<string>;
  onClose: () => void;
  onKeywordChange: (value: string) => void;
  onToggleSelectAllDisplayed: () => void;
  onToggleSection: (section: FridgeSection) => void;
  onToggleOneIngredient: (id: string) => void;
  onBackToSelect: () => void;
  onRequestRecommend: () => void;
  onSaveGeneratedRecipe: (item: GeneratedRecipe) => void;
}

export function AiSheet({
  open,
  view,
  isGeneratingAi,
  aiGenerationStage,
  isLoadingFridge,
  ingredientKeyword,
  ingredientSections,
  selectedIngredientIds,
  selectedIngredientCount,
  isAllDisplayedSelected,
  generatedRecipes,
  savedGeneratedIds,
  onClose,
  onKeywordChange,
  onToggleSelectAllDisplayed,
  onToggleSection,
  onToggleOneIngredient,
  onBackToSelect,
  onRequestRecommend,
  onSaveGeneratedRecipe,
}: AiSheetProps) {
  const [aiProgress, setAiProgress] = useState(0);

  useEffect(() => {
    if (!isGeneratingAi) {
      setAiProgress(0);
      return;
    }

    const target =
      aiGenerationStage === "requesting"
        ? 28
        : aiGenerationStage === "analyzing"
          ? 76
          : 96;

    const timer = window.setInterval(() => {
      setAiProgress((current) => {
        if (current >= target) {
          window.clearInterval(timer);
          return current;
        }

        const next = current + Math.max(1, Math.ceil((target - current) / 6));
        return Math.min(next, target);
      });
    }, 90);

    return () => window.clearInterval(timer);
  }, [aiGenerationStage, isGeneratingAi]);

  if (!open) return null;

  const aiStageLabel =
    aiGenerationStage === "requesting"
      ? "요청 전송중"
      : aiGenerationStage === "analyzing"
        ? "재료 분석중"
        : "결과 정리중";

  const aiStageDescription =
    aiGenerationStage === "requesting"
      ? "추천 요청을 서버로 보내고 있어요"
      : aiGenerationStage === "analyzing"
        ? "선택한 재료로 레시피를 분석하고 있어요"
        : "추천 결과를 화면에 맞게 정리하고 있어요";

  return (
    <div className="sheet-backdrop-in fixed inset-0 z-[80] bg-black/35">
      <div className="sheet-up absolute bottom-0 left-1/2 flex h-[88dvh] w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-[28px] bg-[#f2f3f2] px-4 pb-6 pt-5">
        <div className="mb-3 flex items-center justify-center">
          <h3 className="text-[18px] font-extrabold text-[#1f2423]">AI 레시피 추천</h3>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 rounded-full p-1"
            aria-label="추천 시트 닫기"
            disabled={isGeneratingAi}
          >
            <X className="h-7 w-7 text-[#1f2423]" />
          </button>
        </div>

        {isGeneratingAi ? (
          <div className="flex h-[calc(88dvh-96px)] flex-col items-center justify-center text-center">
            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-[#e6dbef]">
              <LoaderCircle className="h-16 w-16 animate-spin text-[#8f24e8]" />
            </div>
            <h4 className="mt-10 text-[36px] font-black text-[#202624]">{aiStageLabel}</h4>
            <p className="mt-2 text-[15px] font-medium text-[#7d8682]">{aiStageDescription}</p>
            <div className="mt-6 w-full max-w-[260px]">
              <div className="h-2.5 overflow-hidden rounded-full bg-[#dfd4f5]">
                <div
                  className="h-full rounded-full bg-[#8d27f3] transition-[width] duration-300 ease-out"
                  style={{ width: `${aiProgress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[13px] font-semibold text-[#7e5cb0]">
                <span>요청</span>
                <span>분석</span>
                <span>정리</span>
              </div>
            </div>
          </div>
        ) : view === "result" ? (
          <>
            <h4 className="text-[20px] font-bold text-[#212726]">
              레시피 추천 결과가 나왔어요!
            </h4>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[16px] font-semibold text-[#1f2523]">재료 다시 선택</span>
              <button
                type="button"
                onClick={onBackToSelect}
                className="flex items-center gap-1 text-[16px] font-extrabold text-[#8f24e8]"
              >
                <RefreshCw className="h-4 w-4" />
                다시 추천
              </button>
            </div>

            <div className="mt-3 max-h-[calc(88dvh-220px)] space-y-3 overflow-y-auto pr-1">
              {generatedRecipes.map((item) => {
                const saved = savedGeneratedIds.has(item.id);
                return (
                  <article
                    key={item.id}
                    className="rounded-[14px] border border-[#c7cdca] bg-white px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-[17px] font-extrabold text-[#232927]">
                          {item.title}
                        </h5>
                        <p className="mt-1 text-[15px] font-medium text-[#79827f]">
                          {item.subtitle}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSaveGeneratedRecipe(item)}
                        disabled={saved}
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-[14px] font-bold text-white",
                          saved ? "bg-[#9f8adf]" : "bg-[#8d27f3]"
                        )}
                      >
                        <Bookmark className="h-4 w-4" />
                        {saved ? "저장됨" : "저장"}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.ingredients.map((ingredient) => (
                        <span
                          key={`${item.id}-${ingredient}`}
                          className="rounded-full bg-[#eee5fb] px-3 py-1 text-[13px] font-bold text-[#8f42ff]"
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>

                    <ol className="mt-4 list-decimal space-y-1 pl-5 text-[14px] font-medium text-[#6f7875]">
                      {item.steps.map((step) => (
                        <li key={`${item.id}-${step}`}>{step}</li>
                      ))}
                    </ol>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <h4 className="text-[20px] font-bold text-[#212726]">내 냉장고 재료</h4>
            <AppSearchInput
              value={ingredientKeyword}
              onChange={onKeywordChange}
              placeholder="재료 검색"
              wrapperClassName="mt-3"
              inputClassName="bg-[#e9ebea] focus:border-[#7c35f2]"
            />

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={onToggleSelectAllDisplayed}
                className="mb-4 flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border",
                      isAllDisplayedSelected
                        ? "border-transparent bg-[#8729f2]"
                        : "border-transparent bg-[#cfd4d3]"
                    )}
                  >
                    {isAllDisplayedSelected ? <Check className="h-4 w-4 text-white" /> : null}
                  </span>
                  <span className="text-[15px] font-bold text-[#1f2523]">전체 선택</span>
                </div>
                <span className="text-[15px] font-medium text-[#1f2523]">
                  {selectedIngredientCount}개 선택됨
                </span>
              </button>

              {isLoadingFridge ? (
                <p className="py-8 text-center text-[16px] font-semibold text-[#6f7875]">
                  냉장고 재료를 불러오는 중...
                </p>
              ) : null}

              {!isLoadingFridge && ingredientSections.length === 0 ? (
                <p className="py-8 text-center text-[16px] font-semibold text-[#6f7875]">
                  선택 가능한 재료가 없습니다.
                </p>
              ) : null}

              {!isLoadingFridge
                ? ingredientSections.map((section) => {
                    const ids = section.items.map((item) => item.id);
                    const sectionSelected =
                      ids.length > 0 && ids.every((id) => selectedIngredientIds.has(id));

                    return (
                      <div key={section.key} className="mb-4">
                        <button
                          type="button"
                          onClick={() => onToggleSection(section)}
                          className="mb-2 flex items-center gap-2"
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full border",
                              sectionSelected
                                ? "border-transparent bg-[#8729f2]"
                                : "border-transparent bg-[#cfd4d3]"
                            )}
                          >
                            {sectionSelected ? <Check className="h-4 w-4 text-white" /> : null}
                          </span>
                          <span className="text-[16px] font-extrabold text-[#2f6953]">
                            {section.emoji} {section.label}
                          </span>
                        </button>

                        <div className="ml-8 flex flex-wrap gap-2">
                          {section.items.map((item) => {
                            const selected = selectedIngredientIds.has(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => onToggleOneIngredient(item.id)}
                                className={cn(
                                  "rounded-full px-4 py-1.5 text-[16px] font-semibold",
                                  selected
                                    ? "bg-[#8d27f3] text-white"
                                    : "bg-[#e1e3e2] text-[#7e8683]"
                                )}
                              >
                                {item.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                : null}
            </div>

            <button
              type="button"
              onClick={onRequestRecommend}
              disabled={selectedIngredientCount === 0 || isGeneratingAi}
              className={cn(
                "mt-4 h-12 w-full shrink-0 rounded-full text-[18px] font-semibold text-white",
                selectedIngredientCount > 0 && !isGeneratingAi
                  ? "bg-gradient-to-r from-[#9640ff] to-[#f13693]"
                  : "bg-[#c9cecc]"
              )}
            >
              {isGeneratingAi ? "추천 생성 중..." : "레시피 추천받기"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
