import { Ellipsis, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASTE_STYLES } from "./constants";
import { RecipeItem } from "./types";

interface RecipeListProps {
  isLoading: boolean;
  recipes: RecipeItem[];
  openActionMenuId: string | null;
  onOpenDetail: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleActionMenu: (id: string) => void;
  onOpenEdit: (recipe: RecipeItem) => void;
  onDelete: (id: string) => void;
}

export function RecipeList({
  isLoading,
  recipes,
  openActionMenuId,
  onOpenDetail,
  onToggleFavorite,
  onToggleActionMenu,
  onOpenEdit,
  onDelete,
}: RecipeListProps) {
  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="rounded-[14px] border border-dashed border-[#bfc6c3] bg-[#f3f4f3] px-4 py-10 text-center text-[16px] font-semibold text-[#6e7774]">
          저장된 레시피를 불러오는 중...
        </div>
      ) : null}

      {recipes.map((recipe) => (
        <article
          key={recipe.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpenDetail(recipe.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenDetail(recipe.id);
            }
          }}
          className="rounded-[14px] border border-[#c7cdca] bg-white px-4 py-4 text-left"
        >
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h2 className="text-[17px] font-extrabold leading-tight text-[#232927]">{recipe.title}</h2>
              <p className="mt-1 text-[15px] font-medium text-[#79827f]">{recipe.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(recipe.id);
                }}
                className="rounded-full p-1"
                aria-label="즐겨찾기"
              >
                <Heart
                  className={cn(
                    "h-5 w-5",
                    recipe.favorite ? "fill-[#ff3858] text-[#ff3858]" : "text-[#2a2f2d]"
                  )}
                />
              </button>
              <div className="relative">
                <button
                  type="button"
                  className="rounded-full p-1"
                  aria-label="더보기"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleActionMenu(recipe.id);
                  }}
                >
                  <Ellipsis className="h-5 w-5 text-[#252b29]" />
                </button>
                {openActionMenuId === recipe.id ? (
                  <div className="absolute right-0 top-8 z-10 w-28 rounded-[12px] border border-[#d7dcda] bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenEdit(recipe);
                      }}
                      className="w-full rounded-[8px] px-2 py-2 text-left text-[14px] font-semibold text-[#242a28] hover:bg-[#f0f3f2]"
                    >
                      수정하기
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(recipe.id);
                      }}
                      className="w-full rounded-[8px] px-2 py-2 text-left text-[14px] font-semibold text-[#ef4c5e] hover:bg-[#fff0f3]"
                    >
                      삭제하기
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[15px] font-extrabold",
                TASTE_STYLES[recipe.taste]
              )}
            >
              {recipe.taste}
            </span>

            {recipe.source === "ai" ? (
              <span className="rounded-full bg-[#eee5fb] px-3 py-1 text-[15px] font-extrabold text-[#8f42ff]">
                AI 추천
              </span>
            ) : null}

            {recipe.ctaLabel && recipe.link?.trim() ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  window.open(recipe.link, "_blank", "noopener,noreferrer");
                }}
                className="rounded-full bg-[#e8eeff] px-3 py-1 text-[15px] font-extrabold text-[#2a48ff]"
              >
                {recipe.ctaLabel}
              </button>
            ) : null}
          </div>
        </article>
      ))}

      {recipes.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[#bfc6c3] bg-[#f3f4f3] px-4 py-10 text-center text-[16px] font-semibold text-[#6e7774]">
          조건에 맞는 레시피가 없어요.
        </div>
      ) : null}
    </div>
  );
}
