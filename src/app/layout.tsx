import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import { AuthGate } from "@/components/layout/auth-gate";
import { PwaRegister } from "@/components/layout/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "냠픽",
  description: "가정 음식 메뉴와 아이 이유식 추천 서비스",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "냠픽",
  },
  icons: {
    apple: "/icons/icon-192.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#57bf8e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <PwaRegister />
        <AuthGate>{children}</AuthGate>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
