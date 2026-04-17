"use client";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { MyPage } from "@/components/my-page";

export default function MyPageRoute() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-background pb-24">
      <AppHeader />
      <MyPage />
      <BottomNav />
    </div>
  );
}
