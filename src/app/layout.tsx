import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteFooter from "@/components/site-footer";
import ToastContainer from "@/components/ui/toast";
import { LocaleInitializer } from "@/components/locale-initializer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DashPersona — 创作者智能引擎",
  description:
    "数据驱动的创作者智能引擎。通过确定性、零 AI 算法分析你在抖音、TikTok 和小红书上的社媒表现。",
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: "DashPersona — 创作者智能引擎",
    description:
      "通过确定性、零 AI 算法分析你在抖音、TikTok 和小红书上的社媒表现。",
    type: "website",
    url: "https://dash-persona.vercel.app",
    siteName: "DashPersona",
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DashPersona — 创作者智能引擎",
    description:
      "通过确定性、零 AI 算法分析你在抖音、TikTok 和小红书上的社媒表现。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[var(--accent-green)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
          style={{ color: 'var(--bg-primary)' }}
        >
          Skip to main content
        </a>
        <LocaleInitializer>
          <main id="main-content" className="flex-1">{children}</main>
          <SiteFooter />
          <ToastContainer />
        </LocaleInitializer>
      </body>
    </html>
  );
}
