import { ChevronLeft, Copy, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { TASTE_STYLES } from "./constants";
import { RecipeItem } from "./types";

interface RecipeDetailOverlayProps {
  recipe: RecipeItem | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
}

export function RecipeDetailOverlay({
  recipe,
  onClose,
  onToggleFavorite,
}: RecipeDetailOverlayProps) {
  if (!recipe) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#f2f3f2]">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[480px] px-4 pb-8 pt-6">
        <div className="mb-8 flex items-center justify-between">
          <button type="button" onClick={onClose} className="rounded-full p-1" aria-label="상세 닫기">
            <ChevronLeft className="h-7 w-7 text-[#1f2423]" />
          </button>
          <h3 className="text-[18px] font-extrabold text-[#232927]">레시피 상세</h3>
          <button
            type="button"
            onClick={() => onToggleFavorite(recipe.id)}
            className="rounded-full p-1"
            aria-label="즐겨찾기 토글"
          >
            <Heart
              className={cn(
                "h-6 w-6",
                recipe.favorite ? "fill-[#ff3858] text-[#ff3858]" : "text-[#7d8783]"
              )}
            />
          </button>
        </div>

        <h2 className="text-[42px] font-black leading-tight text-[#232927]">{recipe.title}</h2>
        {recipe.subtitle ? <p className="mt-2 text-[15px] font-medium text-[#7d8783]">{recipe.subtitle}</p> : null}

        <section className="mt-8">
          <h4 className="text-[20px] font-extrabold text-[#232927]">아기 반응</h4>
          <span
            className={cn(
              "mt-3 inline-flex rounded-full px-4 py-1.5 text-[16px] font-extrabold",
              TASTE_STYLES[recipe.taste]
            )}
          >
            {recipe.taste}
          </span>
        </section>

        <section className="mt-8">
          <h4 className="text-[20px] font-extrabold text-[#232927]">재료</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {(recipe.ingredients ?? []).length > 0 ? (
              recipe.ingredients!.map((ingredient) => (
                <span
                  key={`${recipe.id}-${ingredient}`}
                  className="rounded-full bg-[#eee5fb] px-3 py-1 text-[14px] font-extrabold text-[#8f42ff]"
                >
                  {ingredient}
                </span>
              ))
            ) : (
              <span className="text-[14px] font-semibold text-[#7d8783]">재료 정보가 없어요</span>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h4 className="text-[20px] font-extrabold text-[#232927]">
            참고자료 <span className="text-[14px] font-semibold text-[#8f9794]">누르면 해당 링크로 이동합니다</span>
          </h4>
          <div className="mt-3 flex items-center gap-2">
            <a
              href={recipe.link || "#"}
              target={recipe.link ? "_blank" : undefined}
              rel={recipe.link ? "noreferrer" : undefined}
              className={cn(
                "flex-1 truncate rounded-[12px] border border-[#cdd3d1] bg-[#f2f3f2] px-4 py-3 text-[15px] font-semibold",
                recipe.link ? "text-[#63706b]" : "text-[#9aa4a0]"
              )}
            >
              {recipe.link || "링크가 없어요"}
            </a>
            <button
              type="button"
              onClick={() => {
                if (!recipe.link) return;
                void navigator.clipboard.writeText(recipe.link);
              }}
              className="rounded-[12px] border border-[#cdd3d1] bg-[#f2f3f2] p-3"
              aria-label="링크 복사"
            >
              <Copy className="h-5 w-5 text-[#66736e]" />
            </button>
          </div>
        </section>

        <section className="mt-8">
          <h4 className="text-[20px] font-extrabold text-[#232927]">만드는 방법</h4>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[16px] font-medium text-[#2f3433]">
            {(recipe.steps ?? []).length > 0 ? (
              recipe.steps!.map((step) => (
                <li key={`${recipe.id}-detail-${step}`}>{step.replace(/^\d+\.\s*/, "")}</li>
              ))
            ) : (
              <li className="list-none pl-0 text-[14px] font-semibold text-[#7d8783]">조리 순서 정보가 없어요</li>
            )}
          </ol>
        </section>
      </div>
    </div>
  );
}
