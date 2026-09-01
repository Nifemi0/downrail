import Image from "next/image";

import { HedgePreview } from "@/components/hedge-preview";
import { SettlementInbox } from "@/components/settlement-inbox";
import { WalletControl } from "@/components/wallet-control";
import { WalletSessionProvider } from "@/components/wallet-session";
import { getMarketBoardSnapshot } from "@/lib/dreamdex/market-board";

export const dynamic = "force-dynamic";

function shortId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function timeUntil(expiryUnixSeconds: number) {
  const seconds = Math.max(0, expiryUnixSeconds - Math.floor(Date.now() / 1_000));
  if (seconds >= 86_400) return `${Math.floor(seconds / 86_400)}d ${Math.floor((seconds % 86_400) / 3_600)}h`;
  if (seconds >= 3_600) return `${Math.floor(seconds / 3_600)}h ${Math.floor((seconds % 3_600) / 60)}m`;
  return `${Math.floor(seconds / 60)}m`;
}

export default async function Home() {
  const snapshot = await getMarketBoardSnapshot();

  return (
    <WalletSessionProvider><main id="top">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Downrail home">
          <Image src="/brand/downrail-logo.svg" alt="Downrail" width={143} height={32} priority />
        </a>
        <div className="product-nav">
          <a href="#planner">Protect</a>
          <a href="#portfolio">Portfolio</a>
          <a href="#windows">Markets</a>
        </div>
        <div className="nav-status">
          <span className="network-chip"><i className={snapshot.ok ? "live" : ""} /> Shannon · {snapshot.ok ? "live" : "degraded"}</span>
          <WalletControl />
        </div>
      </nav>

      <div className="page-shell">
        <header className="product-intro">
          <div>
            <p className="eyebrow">Downside protection, without selling</p>
            <h1>Build a guardrail around the assets you already own.</h1>
          </div>
          <div className="product-intro-copy">
            <p>Downrail turns live DreamDEX DOWN contracts into a budget-capped protection plan for BTC or ETH. Start in demo mode, then move to Shannon when the numbers make sense.</p>
            <div className="intro-proof" aria-label="Product guarantees">
              <span><i /> Live market depth</span>
              <span><i /> Spend capped by you</span>
              <span><i /> Wallet confirms every call</span>
            </div>
          </div>
        </header>

        <div id="planner"><HedgePreview /></div>

        <div id="portfolio" className="portfolio-shell"><SettlementInbox /></div>

        <details id="windows" className="windows-section market-disclosure">
          <summary className="secondary-section-heading">
            <div>
              <p className="eyebrow">Market inventory</p>
              <h2 id="windows-title">Inspect the live protection windows.</h2>
            </div>
            <span>{snapshot.markets.length} windows · snapshot {new Date(snapshot.generatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}<b>View markets</b></span>
          </summary>
          <div className="market-disclosure-body" aria-labelledby="windows-title">
            {snapshot.error ? (
              <div className="feed-error"><strong>Protection feed unavailable</strong><p>{snapshot.error}</p></div>
            ) : (
              <div className="market-table">
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
          </div>
        </details>

        <footer>
          <p>Downrail provides partial, scenario-dependent hedging—not insurance or guaranteed protection.</p>
          <span>Budget bounded · Depth aware · Chain verified</span>
          <span>Built on Somnia × DreamDEX</span>
        </footer>
      </div>
    </main></WalletSessionProvider>
  );
}
