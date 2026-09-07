import type { Metadata } from "next";

import { HedgePreview } from "@/components/hedge-preview";
import { SettlementInbox } from "@/components/settlement-inbox";
import { MarketInventory } from "@/components/market-inventory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "App",
  description: "Build, review, and monitor a Downrail protection plan on Somnia Shannon.",
};

export default function AppPage() {

  return (
    <main className="app-page-shell">
      <header className="app-intro">
        <div><p className="eyebrow">Downrail app</p><h1>Build protection.</h1></div>
        <p>Choose a live DreamDEX window, define your exposure, and review every outcome before your wallet opens.</p>
      </header>

      <div className="app-layout">
        <div className="app-main">
          <MarketInventory />

          <div id="planner"><HedgePreview /></div>
        </div>

        <aside className="portfolio-sidebar" aria-label="Portfolio and settlement">
          <div className="portfolio-sidebar-heading">
            <p className="eyebrow">Portfolio</p>
            <h2>Your protection.</h2>
            <p>Connected-account positions, settlement state, and claims stay beside the planner.</p>
          </div>
          <SettlementInbox compact />
          <p className="portfolio-sidebar-note">Test collateral and exact order review remain inside the planner so funding and execution stay attached to the plan they affect.</p>
        </aside>
      </div>
    </main>
  );
}
