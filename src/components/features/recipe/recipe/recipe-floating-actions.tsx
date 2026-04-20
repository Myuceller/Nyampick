import { AppButton } from "@/components/ui/app-button";

interface RecipeFloatingActionsProps {
  onAiClick: () => void;
  onAddClick: () => void;
}

export function RecipeFloatingActions({
  onAiClick,
  onAddClick,
}: RecipeFloatingActionsProps) {
  return (
    <div className="fixed bottom-[calc(86px+env(safe-area-inset-bottom))] left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 gap-3 px-4">
      <AppButton
        label="AI 추천"
        onClick={onAiClick}
        bgClassName="bg-gradient-to-r from-[#7000ff] to-[#bb18ff]"
        className="h-[50px] flex-1 rounded-full text-[18px] font-semibold shadow-[0_8px_22px_rgba(119,30,235,0.35)]"
      />
      <AppButton
        label="레시피 추가"
        onClick={onAddClick}
        className="h-[50px] flex-1 rounded-full text-[18px] font-semibold shadow-[0_8px_22px_rgba(87,191,142,0.3)]"
      />
    </div>
  );
}
