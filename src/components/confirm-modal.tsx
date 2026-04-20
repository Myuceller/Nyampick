import { AppButton } from "@/components/app-button";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
}

export function ConfirmModal({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  cancelLabel = "아니요",
  confirmLabel = "네",
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/35 px-4">
      <div className="flex h-[250px] w-full max-w-[360px] flex-col rounded-[28px] bg-[#f6f7f6] px-4 pb-6 pt-7">
        <div className="flex flex-1 flex-col items-center justify-center">
          <h3 className="text-center text-[25px] font-semibold text-[#1f2725]">{title}</h3>
          <p className="mt-3 text-center text-[20px] font-normal text-[#7b8581]">{description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <AppButton
            label={cancelLabel}
            onClick={onCancel}
            bgClassName="bg-[#e5e7e6]"
            textClassName="text-[#7f8885]"
            className="h-12"
          />
          <AppButton
            label={confirmLabel}
            onClick={onConfirm}
            className="h-12"
          />
        </div>
      </div>
    </div>
  );
}
