import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TasteLevel } from "./types";

interface RecipeFormSheetProps {
  open: boolean;
  title: string;
  closeAriaLabel: string;
  name: string;
  description: string;
  link: string;
  memo: string;
  taste: TasteLevel;
  submitLabel: string;
  submitDisabled?: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  onMemoChange: (value: string) => void;
  onTasteChange: (value: TasteLevel) => void;
  onSubmit: () => void;
}

export function RecipeFormSheet({
  open,
  title,
  closeAriaLabel,
  name,
  description,
  link,
  memo,
  taste,
  submitLabel,
  submitDisabled,
  onClose,
  onNameChange,
  onDescriptionChange,
  onLinkChange,
  onMemoChange,
  onTasteChange,
  onSubmit,
}: RecipeFormSheetProps) {
  if (!open) return null;

  return (
    <div className="sheet-backdrop-in fixed inset-0 z-[85] bg-black/35">
      <div className="sheet-up absolute bottom-0 left-1/2 flex h-[88dvh] w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-[28px] bg-[#f2f3f2] px-4 pb-5 pt-4">
        <div className="relative mb-4 flex items-center justify-center">
          <h3 className="text-[20px] font-extrabold text-[#1f2523]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 rounded-full p-1"
            aria-label={closeAriaLabel}
          >
            <X className="h-6 w-6 text-[#1f2523]" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
          <div>
            <p className="mb-1 text-[20px] font-bold text-[#212726]">메뉴명</p>
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="예: 브로콜리 소고기 미음"
              className="h-12 w-full rounded-[12px] border border-[#d3d9d6] bg-[#f2f3f2] px-4 text-[16px] text-[#1f2523] outline-none placeholder:text-[#8d9692] focus:border-[#6bc8a0]"
            />
          </div>

          <div>
            <p className="mb-1 text-[20px] font-bold text-[#212726]">
              간단 설명 <span className="text-[14px] font-semibold text-[#7a8380]">(선택)</span>
            </p>
            <input
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="한 줄 메모를 남겨보세요"
              className="h-12 w-full rounded-[12px] border border-[#d3d9d6] bg-[#f2f3f2] px-4 text-[16px] text-[#1f2523] outline-none placeholder:text-[#8d9692] focus:border-[#6bc8a0]"
            />
          </div>

          <div>
            <p className="mb-1 text-[20px] font-bold text-[#212726]">
              레시피 링크 <span className="text-[14px] font-semibold text-[#7a8380]">(선택)</span>
            </p>
            <input
              value={link}
              onChange={(event) => onLinkChange(event.target.value)}
              placeholder="유튜브, 인스타, 블로그 URL 붙여넣기"
              className="h-12 w-full rounded-[12px] border border-[#d3d9d6] bg-[#f2f3f2] px-4 text-[16px] text-[#1f2523] outline-none placeholder:text-[#8d9692] focus:border-[#6bc8a0]"
            />
          </div>

          <div>
            <p className="mb-1 text-[20px] font-bold text-[#212726]">
              레시피 메모 <span className="text-[14px] font-semibold text-[#7a8380]">(선택)</span>
            </p>
            <textarea
              value={memo}
              onChange={(event) => onMemoChange(event.target.value)}
              placeholder="나만의 레시피 메모를 작성해보세요"
              rows={4}
              className="w-full rounded-[12px] border border-[#d3d9d6] bg-[#f2f3f2] px-4 py-3 text-[16px] text-[#1f2523] outline-none placeholder:text-[#8d9692] focus:border-[#6bc8a0]"
            />
          </div>

          <div>
            <p className="mb-2 text-[20px] font-bold text-[#212726]">
              아기 반응{" "}
              <span className="text-[14px] font-semibold text-[#7a8380]">
                (나중에 수정 가능, 선택)
              </span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "좋아해요", emoji: "😊", label: "좋아해요" },
                { value: "보통이에요", emoji: "😐", label: "보통이에요" },
                { value: "싫어해요", emoji: "😣", label: "싫어해요" },
              ] as const).map((option) => {
                const selected = taste === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onTasteChange(option.value)}
                    className={cn(
                      "rounded-[12px] border px-2 py-3 text-center",
                      selected
                        ? "border-[#57bf8e] bg-[#e7f4ec]"
                        : "border-[#cfd5d2] bg-[#f2f3f2]"
                    )}
                  >
                    <div className="text-[18px]">{option.emoji}</div>
                    <div className="mt-1 text-[18px] font-medium text-[#222927]">
                      {option.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          className={cn(
            "h-12 w-full rounded-[14px] text-[18px] font-semibold text-white",
            submitDisabled ? "bg-[#a7d9c1]" : "bg-[#57bf8e]"
          )}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
