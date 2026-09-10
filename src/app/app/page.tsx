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
    <main className="app-page-shell dr-workspace">
      <header className="app-intro">
        <div><p className="eyebrow">Live contract planner</p><h1>Keep the asset. Check the downside.</h1></div>
        <p>Your BTC or ETH never enters Downrail. We check live DreamDEX contracts and show whether a separate, fixed-payout position meaningfully reduces the loss scenario you choose.</p>
      </header>

      <div className="app-layout">
        <div className="app-main">
          <div id="planner"><HedgePreview /></div>

          <MarketInventory />
        </div>

        <aside className="portfolio-sidebar" aria-label="Portfolio and settlement">
          <div className="portfolio-sidebar-heading">
            <p className="eyebrow">Portfolio</p>
            <h2>Your positions.</h2>
            <p>Connected-account outcomes, settlement state, and claims stay beside the decision workspace.</p>
          </div>
          <SettlementInbox compact />
          <p className="portfolio-sidebar-note">Test collateral and exact order review remain inside the planner so funding and execution stay attached to the plan they affect.</p>
        </aside>
      </div>
    </main>
  );
}
