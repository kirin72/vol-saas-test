/**
 * 루트 레이아웃
 * - PWA 메타데이터 설정 (Web App Manifest, Apple Web App)
 * - Service Worker 등록 컴포넌트 포함
 * - 한국어 기본 언어 설정
 */
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// PWA 메타데이터
export const metadata: Metadata = {
  title: "봉사자 관리",
  description: "성당 봉사자 관리 시스템",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "봉사자",
  },
  formatDetection: {
    telephone: false,
  },
};

// 뷰포트 설정 (PWA 테마 색상 포함)
export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* PWA Service Worker 등록 */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
