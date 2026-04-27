"use client";
import { MyPage } from "@/components/features/mypage/my-page";

export default function MyPageRoute() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-white">
      <MyPage />
    </div>
  );
}
