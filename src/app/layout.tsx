import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: '맘마노트',
  description: '가정 음식 메뉴와 아이 이유식 추천 서비스',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
