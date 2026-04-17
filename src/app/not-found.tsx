import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col items-center justify-center bg-[#dce3e0] px-6 text-center">
      <p className="text-sm font-medium text-[#6f7875]">404 Not Found</p>
      <h1 className="mt-2 text-3xl font-extrabold text-[#1f2725]">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-3 text-sm text-[#6f7875]">
        주소가 잘못되었거나 삭제된 페이지예요.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-[#57bf8e] px-5 py-2.5 text-sm font-semibold text-white"
      >
        홈으로 이동
      </Link>
    </main>
  );
}
