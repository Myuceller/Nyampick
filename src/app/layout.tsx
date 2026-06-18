import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import { AuthGate } from "@/components/layout/auth-gate";
import { PwaRegister } from "@/components/layout/pwa-register";
import { getAppUrl } from "@/lib/app-url";
import "./globals.css";

const appUrl = getAppUrl();
const brandName = "냠픽";
const brandAlternateNames = ["Nyampick", "nyampick", "냠픽 Nyampick"];
const brandDescription =
  "냠픽(Nyampick)은 아이 식단 기록, 냉장고 재료 관리, 영수증 스캔, AI 유아식 레시피 추천을 한 번에 관리하는 모바일 식단 도우미입니다.";
const brandJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": `${appUrl}/#webapp`,
  name: brandName,
  alternateName: brandAlternateNames,
  url: appUrl,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web, Android",
  inLanguage: "ko-KR",
  description: brandDescription,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
  },
  publisher: {
    "@type": "Organization",
    name: brandName,
    alternateName: brandAlternateNames,
    url: appUrl,
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "냠픽 Nyampick | 아이 식단 기록과 냉장고 기반 AI 레시피 추천",
    template: "%s | 냠픽",
  },
  description: brandDescription,
  applicationName: "냠픽 Nyampick",
  keywords: [
    "냠픽",
    "Nyampick",
    "nyampick",
    "냠픽 Nyampick",
    "아이 식단",
    "아기 식단",
    "이유식",
    "유아식",
    "냉장고 관리",
    "AI 레시피 추천",
    "식단 기록",
  ],
  manifest: "/manifest.webmanifest",
  other: {
    google: "notranslate",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "냠픽 Nyampick | 아이 식단 기록과 냉장고 기반 AI 레시피 추천",
    description: brandDescription,
    url: "/",
    siteName: "냠픽 Nyampick",
    type: "website",
    locale: "ko_KR",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "냠픽 Nyampick" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "냠픽 Nyampick | 아이 식단 기록과 냉장고 기반 AI 레시피 추천",
    description: brandDescription,
    images: ["/og-image.svg"],
  },
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
    <html lang="ko" translate="no">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(brandJsonLd) }}
        />
        <PwaRegister />
        <AuthGate>{children}</AuthGate>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
