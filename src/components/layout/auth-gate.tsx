"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AUTH_REQUIRED_EVENT } from "@/lib/auth-events";
import { buildAuthRedirectPath } from "@/lib/auth-redirect";
import {
  getCachedHasSession,
  resolveCachedHasSession,
  setCachedHasSession,
} from "@/lib/auth-session-cache";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type GateStatus = "checking" | "ready" | "env-missing";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const lastAuthRequiredToastAtRef = useRef(0);
  const isPublicPath = useMemo(
    () =>
      pathname === "/" ||
      pathname?.startsWith("/auth") ||
      pathname?.startsWith("/landing") ||
      pathname?.startsWith("/about") ||
      pathname?.startsWith("/guide") ||
      pathname?.startsWith("/privacy") ||
      pathname?.startsWith("/terms"),
    [pathname]
  );
  const currentPath = pathname ?? "/";
  const [status, setStatus] = useState<GateStatus>(() => {
    if (isPublicPath || getCachedHasSession()) return "ready";
    return "checking";
  });

  useEffect(() => {
    if (isPublicPath) {
      setStatus("ready");
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | null = null;
    const getAuthRedirectPath = () => buildAuthRedirectPath(`${currentPath}${window.location.search}`);

    try {
      const supabase = getSupabaseBrowser();

      void resolveCachedHasSession(async () => {
        const { data } = await supabase.auth.getSession();
        return Boolean(data.session);
      }).then((hasSession) => {
        if (!active) return;
        if (hasSession) {
          setStatus("ready");
          return;
        }
        router.replace(getAuthRedirectPath());
      });

      const listener = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        const hasSession = Boolean(session);
        setCachedHasSession(hasSession);
        if (hasSession) {
          setStatus("ready");
          return;
        }
        setStatus("checking");
        router.replace(getAuthRedirectPath());
      });
      unsubscribe = () => listener.data.subscription.unsubscribe();
    } catch {
      setStatus("env-missing");
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [currentPath, isPublicPath, router]);

  useEffect(() => {
    if (isPublicPath) return;

    const onAuthRequired = () => {
      const now = Date.now();
      if (now - lastAuthRequiredToastAtRef.current > 2_000) {
        toast.warning("세션이 만료되어 다시 로그인해주세요.");
        lastAuthRequiredToastAtRef.current = now;
      }
      setCachedHasSession(false);
      setStatus("checking");
      router.replace(buildAuthRedirectPath(`${currentPath}${window.location.search}`));
    };

    window.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
  }, [currentPath, isPublicPath, router]);

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
