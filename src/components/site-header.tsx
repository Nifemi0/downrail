"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { WalletControl } from "@/components/wallet-control";

export function SiteHeader() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <nav className={`topbar ${isLanding ? "dr-topbar" : "dr-workspace-topbar"}`} aria-label="Primary navigation">
      <Link className="brand" href="/" aria-label="Downrail home">
        <Image src="/brand/downrail-logo.svg" alt="Downrail" width={143} height={32} priority />
      </Link>
      <div className="primary-nav">
        {isLanding ? (
          <>
            <Link href="#product">Product</Link>
            <Link href="#payouts">How payouts work</Link>
            <Link href="/docs">Docs</Link>
          </>
        ) : (
          <>
            <Link className={pathname === "/app" ? "active" : ""} href="/app">App</Link>
            <Link className={pathname.startsWith("/docs") ? "active" : ""} href="/docs">Docs</Link>
          </>
        )}
      </div>
      <div className="nav-status">
        <span className="network-chip"><i className="live" /> Shannon testnet</span>
        {isLanding ? null : <WalletControl />}
      </div>
    </nav>
  );
}
