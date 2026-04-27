"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type GateStatus = "checking" | "ready" | "env-missing";

let cachedHasSession: boolean | null = null;
let sessionBootstrapPromise: Promise<boolean> | null = null;

async function resolveHasSession() {
  if (cachedHasSession !== null) return cachedHasSession;
  if (sessionBootstrapPromise) return sessionBootstrapPromise;

  sessionBootstrapPromise = (async () => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase.auth.getSession();
    cachedHasSession = Boolean(data.session);
    return cachedHasSession;
  })();

  try {
    return await sessionBootstrapPromise;
  } finally {
    sessionBootstrapPromise = null;
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPath = useMemo(
    () => pathname?.startsWith("/auth") || pathname?.startsWith("/landing"),
    [pathname]
  );
  const [status, setStatus] = useState<GateStatus>(() => {
    if (isPublicPath || cachedHasSession) return "ready";
    return "checking";
  });

  useEffect(() => {
    if (isPublicPath) {
      setStatus("ready");
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | null = null;

    try {
      const supabase = getSupabaseBrowser();

      void resolveHasSession().then((hasSession) => {
        if (!active) return;
        if (hasSession) {
          setStatus("ready");
          return;
        }
        router.replace("/auth");
      });

      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        if (session) {
          cachedHasSession = true;
          setStatus("ready");
          return;
        }
        cachedHasSession = false;
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
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] items-center justify-center bg-[rgb(243,248,244)] px-6 text-center">
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
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] items-center justify-center bg-[rgb(243,248,244)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b8c5bf] border-t-[#57bf8e]" />
    </main>
  );
}
