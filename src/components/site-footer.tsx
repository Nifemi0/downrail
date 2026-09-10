"use client";

import { Fingerprint, RadioTower, WalletCards } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  const landingPrefix = pathname === "/" ? "" : "/";

  return (
    <footer className="dr-footer">
      <div className="dr-wrap dr-footer-main">
        <div className="dr-footer-brand">
          <span><Image src="/brand/downrail-logo.svg" alt="Downrail" width={143} height={32} /></span>
          <h2>Keep the asset.<br />Read the contract.</h2>
          <p>Downrail compares live DreamDEX NO positions with your modeled loss, then shows the exact conditional cash flows before wallet review.</p>
        </div>
        <nav aria-label="Explore Downrail"><strong>Explore</strong><Link href={`${landingPrefix}#product`}>Product</Link><Link href={`${landingPrefix}#payouts`}>Payout mechanics</Link><Link href={`${landingPrefix}#proof`}>Proof rail</Link></nav>
        <nav aria-label="Learn about Downrail"><strong>Learn</strong><Link href={`${landingPrefix}#product`}>Protection example</Link><Link href="/docs">Read the field guide</Link><Link href={`${landingPrefix}#story`}>Follow Maya&apos;s story</Link></nav>
        <aside className="dr-footer-status">
          <div><i /> Shannon testnet</div>
          <ul>
            <li><RadioTower aria-hidden="true" />Live DreamDEX market reads</li>
            <li><Fingerprint aria-hidden="true" />Inspectable call fingerprints</li>
            <li><WalletCards aria-hidden="true" />Wallet-only transaction signing</li>
          </ul>
        </aside>
      </div>
      <div className="dr-wrap dr-footer-bottom"><span>© 2026 Downrail</span><p>Partial, scenario-dependent hedging—not insurance or guaranteed protection. Outcomes depend on liquidity, fills, fees, and market settlement.</p><b>Somnia × DreamDEX</b></div>
    </footer>
  );
}
