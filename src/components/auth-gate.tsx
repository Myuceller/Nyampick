"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "env-missing">(
    "checking"
  );

  const isPublicPath = useMemo(() => pathname?.startsWith("/auth"), [pathname]);

  useEffect(() => {
    if (isPublicPath) {
      setStatus("ready");
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | null = null;

    try {
      const supabase = getSupabaseBrowser();

      void supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        if (data.session) {
          setStatus("ready");
          return;
        }
        router.replace("/auth");
      });

      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        if (session) {
          setStatus("ready");
          return;
        }
        router.replace("/auth");
      });
      unsubscribe = () => listener.data.subscription.unsubscribe();
    } catch {
      setStatus("env-missing");
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [isPublicPath, router]);

  if (isPublicPath || status === "ready") {
    return <>{children}</>;
  }

  if (status === "env-missing") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-[rgb(243,248,244)] px-6 text-center">
        <p className="text-[16px] leading-relaxed text-[#27312e]">
          인증 설정이 누락되었습니다.
          <br />
          `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를
          추가해주세요.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-[rgb(243,248,244)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b8c5bf] border-t-[#57bf8e]" />
    </main>
  );
}
