"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosSafari() {
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  return isIos && isSafari;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt({ className = "" }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    const dismissedState = localStorage.getItem("nyampick:pwa-install-dismissed");
    if (dismissedState === "1") {
      setDismissed(true);
    }

    setInstalled(isStandalone());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem("nyampick:pwa-install-dismissed", "1");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const showIosHint = useMemo(() => {
    if (installed || dismissed) return false;
    return isIosSafari();
  }, [dismissed, installed]);

  const showInstallButton = useMemo(() => {
    if (installed || dismissed) return false;
    return !!deferredPrompt;
  }, [deferredPrompt, dismissed, installed]);

  const visible = showInstallButton || showIosHint;
  if (!visible) return null;

  const close = () => {
    setDismissed(true);
    localStorage.setItem("nyampick:pwa-install-dismissed", "1");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    localStorage.setItem("nyampick:pwa-install-dismissed", "1");
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[14px] bg-[#e7f4ec] px-3 py-2 ${className}`}
    >
      <p className="text-[13px] text-[#2a3a33]">
        {showInstallButton
          ? "냠픽를 앱처럼 설치해 빠르게 열어보세요."
          : "Safari 공유 버튼에서 '홈 화면에 추가'를 누르면 앱처럼 쓸 수 있어요."}
      </p>
      <div className="flex items-center gap-2">
        {showInstallButton ? (
          <button
            type="button"
            onClick={() => {
              void install();
            }}
            className="shrink-0 rounded-[10px] bg-[#57bf8e] px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            앱으로 다운로드
          </button>
        ) : null}
        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-[10px] px-2 py-1 text-[12px] text-[#5a6962]"
          aria-label="설치 배너 닫기"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
