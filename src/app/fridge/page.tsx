"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { FridgeAddModal } from "@/components/features/fridge/fridge-add-modal";
import { FridgeMainContent } from "@/components/features/fridge/fridge-main-content";
import { ReceiptScanModal } from "@/components/features/fridge/receipt-scan-modal";
import { useFridgePage } from "@/features/fridge/hooks/use-fridge-page";

export default function FridgePage() {
  const vm = useFridgePage();

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-[#eef3f0] pb-24">
      <FridgeMainContent vm={vm} />
      <FridgeAddModal vm={vm} />
      <ReceiptScanModal vm={vm} />
      <BottomNav />
    </div>
  );
}
