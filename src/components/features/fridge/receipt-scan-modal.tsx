"use client";

import { Camera, Check, X } from "lucide-react";
import {
  CATEGORY_LABEL,
  CATEGORY_TEXT_COLOR,
  type useFridgePage,
} from "@/features/fridge/hooks/use-fridge-page";
import { cn } from "@/lib/utils";

type FridgePageViewModel = ReturnType<typeof useFridgePage>;

interface ReceiptScanModalProps {
  vm: FridgePageViewModel;
}

export function ReceiptScanModal({ vm }: ReceiptScanModalProps) {
  const albumInputId = "receipt-album-input";
  const cameraInputId = "receipt-camera-input";

  return (
    <>
      <input
        id={albumInputId}
        ref={vm.albumInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          void vm.handleReceiptFile(file);
        }}
      />
      <input
        id={cameraInputId}
        ref={vm.cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          void vm.handleReceiptFile(file);
        }}
      />

      {vm.isReceiptPopupOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#6b716e]/65 px-4 py-4">
          <div className="mx-auto w-full max-w-[480px] rounded-[28px] bg-[#f6f7f6] px-4 pb-5 pt-4">
            {vm.receiptStage === "capture" ? (
              <ReceiptCaptureStep
                vm={vm}
                albumInputId={albumInputId}
                cameraInputId={cameraInputId}
              />
            ) : null}
            {vm.receiptStage === "scanning" ? <ReceiptScanningStep vm={vm} /> : null}
            {vm.receiptStage === "result" ? <ReceiptResultStep vm={vm} /> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function ReceiptCaptureStep({
  vm,
  albumInputId,
  cameraInputId,
}: ReceiptScanModalProps & {
  albumInputId: string;
  cameraInputId: string;
}) {
  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <span className="w-6" />
        <h3 className="text-[20px] font-bold text-[#1f2725]">영수증 스캔</h3>
        <button
          type="button"
          onClick={vm.closeReceiptPopup}
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
        <p className="text-[22px] font-bold text-[#1f2725]">영수증 사진을 찍어주세요</p>
        <p className="mt-1 text-[16px] text-[#8a9491]">장 본 내역을 자동으로 인식해요</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label
          htmlFor={albumInputId}
          aria-disabled={vm.isScanningReceipt}
          className={cn(
            "flex h-12 items-center justify-center rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]",
            vm.isScanningReceipt ? "pointer-events-none opacity-60" : "cursor-pointer"
          )}
        >
          {vm.isScanningReceipt ? "처리 중..." : "앨범에서"}
        </label>
        <label
          htmlFor={cameraInputId}
          aria-disabled={vm.isScanningReceipt}
          className={cn(
            "flex h-12 items-center justify-center rounded-2xl bg-[#57bf8e] text-[16px] font-semibold text-white",
            vm.isScanningReceipt ? "pointer-events-none opacity-60" : "cursor-pointer"
          )}
        >
          {vm.isScanningReceipt ? "처리 중..." : "촬영하기"}
        </label>
      </div>
    </>
  );
}

function ReceiptScanningStep({ vm }: ReceiptScanModalProps) {
  return (
    <>
      <div className="mb-5 flex items-center justify-end">
        <button
          type="button"
          onClick={vm.closeReceiptPopup}
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
        <p className="text-[22px] font-bold text-[#1f2725]">{vm.receiptStageLabel}</p>
        <p className="mt-1 text-[16px] text-[#8a9491]">{vm.receiptStageDescription}</p>
        <div className="mt-6 w-full max-w-[260px]">
          <div className="h-2.5 overflow-hidden rounded-full bg-[#dce8e2]">
            <div
              className="h-full rounded-full bg-[#57bf8e] transition-[width] duration-300 ease-out"
              style={{ width: `${vm.receiptScanProgress}%` }}
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
  );
}

function ReceiptResultStep({ vm }: ReceiptScanModalProps) {
  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <span className="w-6" />
        <h3 className="text-[20px] font-semibold text-[#1f2725] underline decoration-[1px] underline-offset-4">
          스캔 결과 확인
        </h3>
        <button
          type="button"
          onClick={vm.closeReceiptPopup}
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
        {vm.receiptCandidates.map((candidate) => {
          const selected = vm.selectedReceiptIds.has(candidate.tempId);
          return (
            <button
              key={candidate.tempId}
              type="button"
              onClick={() => vm.toggleReceiptCandidate(candidate.tempId)}
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
          onClick={vm.resetReceiptToCapture}
          disabled={vm.isConfirmingReceipt}
          className="h-12 rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]"
        >
          다시 촬영하기
        </button>
        <button
          type="button"
          onClick={() => void vm.confirmSelectedReceiptItems()}
          disabled={vm.isConfirmingReceipt}
          className="h-12 rounded-2xl bg-[#57bf8e] text-[17px] font-semibold text-white disabled:opacity-60"
        >
          {vm.isConfirmingReceipt ? "추가중..." : "추가하기"}
        </button>
      </div>
    </>
  );
}
