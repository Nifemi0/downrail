import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>Downrail provides partial, scenario-dependent hedging—not insurance or guaranteed protection.</p>
      <div><Link href="/app">App</Link><Link href="/docs">Docs</Link><span>Built on Somnia × DreamDEX</span></div>
    </footer>
  );
}
