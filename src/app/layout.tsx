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
  title: "MatchaDB",
  description: "A research database and comparison tool for matcha products.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-green-800 dark:text-green-400 text-lg">
            MatchaDB
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/browse" className="hover:underline">
              Browse
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
