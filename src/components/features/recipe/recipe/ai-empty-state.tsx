import { Sparkles } from "lucide-react";

interface AiEmptyStateProps {
  onRecommend: () => void;
}

export function AiEmptyState({ onRecommend }: AiEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-start pt-20 text-center">
      <div className="flex h-36 w-36 items-center justify-center rounded-full bg-[#e6dbef]">
        <Sparkles className="h-14 w-14 text-[#8f24e8]" />
      </div>
      <h2 className="mt-9 text-[22px] font-semibold leading-tight text-[#202624]">
        냉장고 재료로 뭘 만들까요?
      </h2>
      <p className="mt-2 text-[16px] font-medium text-[#7d8682]">
        AI가 우리 아이를 위한 레시피를 추천해요
      </p>
      <button
        type="button"
        onClick={onRecommend}
        className="mt-6 rounded-[16px] bg-gradient-to-r from-[#9740ff] to-[#f13693] px-10 py-3 text-[18px] font-semibold text-white"
      >
        레시피 추천받기
      </button>
    </div>
  );
}
