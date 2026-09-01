"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { WalletControl } from "@/components/wallet-control";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <nav className="topbar" aria-label="Primary navigation">
      <Link className="brand" href="/" aria-label="Downrail home">
        <Image src="/brand/downrail-logo.svg" alt="Downrail" width={143} height={32} priority />
      </Link>
      <div className="primary-nav">
        <Link className={pathname === "/app" ? "active" : ""} href="/app">App</Link>
        <Link className={pathname.startsWith("/docs") ? "active" : ""} href="/docs">Docs</Link>
      </div>
      <div className="nav-status">
        <span className="network-chip"><i className="live" /> Shannon · testnet</span>
        <WalletControl />
      </div>
    </nav>
  );
}
