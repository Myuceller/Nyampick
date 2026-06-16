"use client";

import { AlertTriangle, Camera, Check, RotateCcw, X } from "lucide-react";
import {
  CATEGORY_LABEL,
  CATEGORY_TEXT_COLOR,
  type FridgeCategory,
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
            {vm.receiptStage === "error" ? (
              <ReceiptErrorStep
                vm={vm}
                albumInputId={albumInputId}
                cameraInputId={cameraInputId}
              />
            ) : null}
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
        <p className="text-center text-[22px] font-bold leading-[1.32] text-[#1f2725]">
          영수증 사진을 찍어주세요
        </p>
        <p className="mt-2 max-w-[260px] text-center text-[15px] leading-[1.55] text-[#7f8a86]">
          글자가 흐리지 않게 영수증 전체를 화면 안에 맞춰주세요.
        </p>
      </div>

      <div className="mb-5 rounded-[16px] bg-white px-4 py-3 text-[13px] leading-[1.55] text-[#6f7875]">
        스캔 후 인식된 재료명과 종류를 직접 고칠 수 있어요.
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
        <p className="text-center text-[22px] font-bold leading-[1.32] text-[#1f2725]">
          {vm.receiptStageLabel}
        </p>
        <p className="mt-2 max-w-[280px] text-center text-[15px] leading-[1.55] text-[#7f8a86]">
          {vm.receiptStageDescription}
        </p>
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
  const selectedCount = vm.selectedReceiptIds.size;

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <span className="w-6" />
        <h3 className="text-[20px] font-bold leading-[1.32] text-[#1f2725]">
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

      <div className="mb-4 rounded-[16px] bg-white px-4 py-3">
        <p className="text-[17px] font-bold leading-[1.32] text-[#1f2725]">
          추가할 재료를 확인해주세요
        </p>
        <p className="mt-1 text-[13px] leading-[1.55] text-[#7f8a86]">
          잘못 인식된 이름이나 종류는 추가 전에 바로 수정할 수 있어요.
        </p>
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {vm.receiptCandidates.map((candidate) => {
          const selected = vm.selectedReceiptIds.has(candidate.tempId);
          return (
            <div
              key={candidate.tempId}
              className={cn(
                "rounded-[16px] border p-3",
                selected
                  ? "border-[#57bf8e] bg-[#eef8f3]"
                  : "border-[#d5dbd8] bg-[#f7f8f7]"
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => vm.toggleReceiptCandidate(candidate.tempId)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      selected ? "bg-[#57bf8e] text-white" : "bg-[#d5dbd8] text-transparent"
                    )}
                    aria-hidden="true"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 truncate text-[15px] font-bold leading-[1.4] text-[#1f2725]">
                    {selected ? "추가할 항목" : "추가하지 않음"}
                  </span>
                </button>
                <span
                  className={cn(
                    "shrink-0 text-[13px] font-bold",
                    CATEGORY_TEXT_COLOR[candidate.category]
                  )}
                >
                  {CATEGORY_LABEL[candidate.category]}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_112px] gap-2">
                <input
                  value={candidate.name}
                  onChange={(event) =>
                    vm.updateReceiptCandidate(candidate.tempId, {
                      name: event.target.value,
                    })
                  }
                  disabled={!selected || vm.isConfirmingReceipt}
                  className="h-11 min-w-0 rounded-[12px] border border-[#d1d8d5] bg-white px-3 text-[16px] font-semibold text-[#1f2725] outline-none focus:border-[#57bf8e] disabled:bg-[#edf0ef] disabled:text-[#9aa39f]"
                  aria-label={`${candidate.name} 재료명 수정`}
                />
                <select
                  value={candidate.category}
                  onChange={(event) =>
                    vm.updateReceiptCandidate(candidate.tempId, {
                      category: event.target.value as FridgeCategory,
                    })
                  }
                  disabled={!selected || vm.isConfirmingReceipt}
                  className="h-11 rounded-[12px] border border-[#d1d8d5] bg-white px-2 text-[14px] font-semibold text-[#2a312f] outline-none focus:border-[#57bf8e] disabled:bg-[#edf0ef] disabled:text-[#9aa39f]"
                  aria-label={`${candidate.name} 종류 수정`}
                >
                  {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[13px] font-semibold leading-[1.55] text-[#6f7875]">
        선택된 재료 {selectedCount}개를 냉장고에 추가합니다.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={vm.resetReceiptToCapture}
          disabled={vm.isConfirmingReceipt}
          className="h-12 rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]"
        >
          다시 촬영
        </button>
        <button
          type="button"
          onClick={() => void vm.confirmSelectedReceiptItems()}
          disabled={vm.isConfirmingReceipt || selectedCount === 0}
          className="h-12 rounded-2xl bg-[#57bf8e] text-[17px] font-semibold text-white disabled:opacity-60"
        >
          {vm.isConfirmingReceipt ? "추가 중..." : "추가하기"}
        </button>
      </div>
    </>
  );
}

function ReceiptErrorStep({
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
        <h3 className="text-[20px] font-bold leading-[1.32] text-[#1f2725]">
          스캔 실패
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

      <div className="mb-6 flex flex-col items-center py-8">
        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[20px] bg-[#fff3e0] text-[#f59e0b]">
          <AlertTriangle className="h-10 w-10" strokeWidth={2.4} />
        </div>
        <p className="text-center text-[21px] font-bold leading-[1.32] text-[#1f2725]">
          다시 시도해주세요
        </p>
        <p className="mt-2 max-w-[300px] text-center text-[14px] leading-[1.55] text-[#7f8a86]">
          {vm.receiptErrorMessage || "영수증을 인식하지 못했어요."}
        </p>
      </div>

      <div className="mb-5 rounded-[16px] bg-white px-4 py-3 text-[13px] leading-[1.55] text-[#6f7875]">
        밝은 곳에서 영수증 전체가 나오게 찍으면 인식률이 좋아져요.
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label
          htmlFor={albumInputId}
          className="flex h-12 cursor-pointer items-center justify-center rounded-2xl bg-[#e5e7e6] text-[16px] font-semibold text-[#7f8885]"
        >
          앨범에서
        </label>
        <label
          htmlFor={cameraInputId}
          className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#57bf8e] text-[16px] font-semibold text-white"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
          다시 촬영
        </label>
      </div>
    </>
  );
}
