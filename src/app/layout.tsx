import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteFooter from "@/components/site-footer";
import ToastContainer from "@/components/ui/toast";
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
  title: "DashPersona — Creator Intelligence Engine",
  description:
    "Data-agnostic creator intelligence engine. Analyze your social media presence across Douyin, TikTok, and Red Note with deterministic, AI-free algorithms.",
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: "DashPersona — Creator Intelligence Engine",
    description:
      "Analyze your social media presence across Douyin, TikTok, and Red Note with deterministic, AI-free algorithms.",
    type: "website",
    url: "https://dash-persona.vercel.app",
    siteName: "DashPersona",
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DashPersona — Creator Intelligence Engine",
    description:
      "Analyze your social media presence across Douyin, TikTok, and Red Note with deterministic, AI-free algorithms.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[var(--accent-green)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
          style={{ color: 'var(--bg-primary)' }}
        >
          Skip to main content
        </a>
        <div id="main" className="flex-1">{children}</div>
        <SiteFooter />
        <ToastContainer />
      </body>
    </html>
  );
}
