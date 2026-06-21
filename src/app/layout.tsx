import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "股票記帳軟體",
  description: "股票交易記帳與月報表系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50">
        <nav className="bg-white border-b border-zinc-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center gap-6">
            <Link href="/" className="font-bold text-lg text-zinc-900">
              股票記帳
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/" className="text-zinc-600 hover:text-zinc-900">
                儀表板
              </Link>
              <Link href="/transactions" className="text-zinc-600 hover:text-zinc-900">
                交易紀錄
              </Link>
              <Link href="/import" className="text-zinc-600 hover:text-zinc-900">
                匯入CSV
              </Link>
              <Link href="/report" className="text-zinc-600 hover:text-zinc-900">
                月報表
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
