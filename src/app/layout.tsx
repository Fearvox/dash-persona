import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  openGraph: {
    title: "DashPersona — Creator Intelligence Engine",
    description:
      "Analyze your social media presence across Douyin, TikTok, and Red Note with deterministic, AI-free algorithms.",
    type: "website",
    url: "https://dash-persona.vercel.app",
    siteName: "DashPersona",
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
        <footer
          className="flex items-center justify-center gap-6 px-6 py-4 text-xs"
          style={{ color: 'var(--text-subtle)', borderTop: '1px solid var(--border-subtle)' }}
        >
          <Link
            href="/"
            className="transition-colors hover:opacity-80"
            style={{ color: 'var(--text-subtle)' }}
          >
            Home
          </Link>
          <Link
            href="/settings"
            className="transition-colors hover:opacity-80"
            style={{ color: 'var(--text-subtle)' }}
          >
            Settings
          </Link>
          <span>DashPersona v0.1.0</span>
        </footer>
      </body>
    </html>
  );
}
