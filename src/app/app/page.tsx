import type { Metadata } from "next";

import { HedgePreview } from "@/components/hedge-preview";
import { SettlementInbox } from "@/components/settlement-inbox";
import { getMarketBoardSnapshot } from "@/lib/dreamdex/market-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "App",
  description: "Build, review, and monitor a Downrail protection plan on Somnia Shannon.",
};

function shortId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function timeUntil(expiryUnixSeconds: number) {
  const seconds = Math.max(0, expiryUnixSeconds - Math.floor(Date.now() / 1_000));
  if (seconds >= 86_400) return `${Math.floor(seconds / 86_400)}d ${Math.floor((seconds % 86_400) / 3_600)}h`;
  if (seconds >= 3_600) return `${Math.floor(seconds / 3_600)}h ${Math.floor((seconds % 3_600) / 60)}m`;
  return `${Math.floor(seconds / 60)}m`;
}

export default async function AppPage() {
  const snapshot = await getMarketBoardSnapshot();

  return (
    <main className="app-page-shell">
      <header className="app-intro">
        <div><p className="eyebrow">Downrail app</p><h1>Build protection.</h1></div>
        <p>Choose a live DreamDEX window, define your exposure, and review every outcome before your wallet opens.</p>
      </header>

      <div className="app-layout">
        <div className="app-main">
          <section id="markets" className="app-market-section" aria-labelledby="markets-title">
            <div className="section-intro compact-intro">
              <div><p className="eyebrow">Live inventory / 01</p><h2 id="markets-title">Protection windows.</h2></div>
              <p>{snapshot.markets.length} verified · snapshot {new Date(snapshot.generatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}</p>
            </div>
            {snapshot.error ? (
              <div className="feed-error"><strong>Protection feed unavailable</strong><p>{snapshot.error}</p></div>
            ) : (
              <div className="market-table app-market-table">
                <table>
                  <caption className="sr-only">Live DreamDEX protection windows</caption>
                  <thead><tr className="market-row market-header"><th>Asset</th><th>Window</th><th>Closes in</th><th>DOWN ask</th><th>Contract ID</th></tr></thead>
                  <tbody>{snapshot.markets.map((market) => (
                    <tr className="market-row" key={market.marketId}>
                      <td><span className={`asset-badge ${market.asset.toLowerCase()}`}>{market.asset}</span></td>
                      <td>{market.intervalLabel}</td>
                      <td className="mono">{timeUntil(market.expiryUnixSeconds)}</td>
                      <td className={market.bestNoAskDisplay ? "quote-value" : "muted-value"}>{market.bestNoAskDisplay ?? "No quote"}</td>
                      <td className="mono" title={market.marketId}>{shortId(market.marketId)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>

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
