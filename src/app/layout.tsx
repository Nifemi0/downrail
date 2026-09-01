import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WalletSessionProvider } from "@/components/wallet-session";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const publicOrigin =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(publicOrigin),
  title: {
    default: "Downrail — Keep the upside. Guard the downside.",
    template: "%s · Downrail",
  },
  description:
    "Build transparent, capped-risk BTC and ETH protection plans with DreamDEX Event Contracts on Somnia.",
  openGraph: {
    type: "website",
    title: "Downrail — Keep the upside. Guard the downside.",
    description:
      "Depth-aware BTC and ETH downside protection powered by DreamDEX Event Contracts on Somnia.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Downrail — Keep the upside. Guard the downside.",
    description:
      "Depth-aware BTC and ETH downside protection powered by DreamDEX Event Contracts on Somnia.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WalletSessionProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </WalletSessionProvider>
      </body>
    </html>
  );
}
