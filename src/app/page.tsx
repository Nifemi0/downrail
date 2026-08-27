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
        <div className="nav-status">
          <span className="read-only-chip">Planner live · signing locked</span>
          <span className="network-chip"><i className={snapshot.ok ? "live" : ""} /> Shannon · {snapshot.ok ? "live" : "degraded"}</span>
          <WalletControl />
        </div>
      </nav>

      <div className="page-shell">
        <header className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Portfolio protection / 01</p>
            <h1>Keep the upside.<span>Guard the downside.</span></h1>
            <p className="hero-text">Downrail uses existing DreamDEX DOWN contracts to add a conditional payout alongside BTC or ETH you already own.</p>
            <p className="category-note"><span>Not insurance.</span> You choose the exposure, horizon, and maximum spend; every payout still depends on the selected contract&apos;s exact result.</p>
            <div className="hero-actions">
              <a className="primary-action" href="#planner">Plan protection <span aria-hidden="true">↘</span></a>
              <a className="text-action" href="#windows">Inspect live windows <span aria-hidden="true">↗</span></a>
            </div>
          </div>

          <div className="hero-visual" aria-label="Illustration comparing a one hundred dollar portfolio loss with a separate conditional DOWN contract payout">
            <span className="visual-caption">Illustrative mechanics · not guaranteed coverage</span>
            <div className="visual-frame" />
            <div className="loss-plane">
              <span>Portfolio exposure</span><b>−$100</b>
              <strong>UNHEDGED<br />LOSS</strong>
            </div>
            <div className="protection-plane">
              <span>If the selected DOWN contract wins</span>
              <strong>+$78.50</strong><b>Conditional net payout</b>
            </div>
            <div className="residual-marker"><span>Contract outcome decides</span><strong>Not guaranteed</strong></div>
          </div>
        </header>

        <div id="planner"><HedgePreview /></div>

        <section id="windows" className="windows-section" aria-labelledby="windows-title">
          <div className="section-intro">
            <div><p className="eyebrow">DreamDEX inventory / 03</p><h2 id="windows-title">Live protection windows.</h2></div>
            <p>Snapshot {new Date(snapshot.generatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}</p>
          </div>
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
        </section>

        <SettlementInbox />

        <section className="trust-strip" aria-label="Downrail operating principles">
          <article><span>01</span><div><h3>Budget bounded</h3><p>The proposed maximum cost cannot exceed the spend you enter.</p></div></article>
          <article><span>02</span><div><h3>Depth aware</h3><p>Plans consume live resting liquidity instead of assuming an infinite top quote.</p></div></article>
          <article><span>03</span><div><h3>Candidate checked</h3><p>Every planned leg verifies market state, expiry, decimal scale, tick, lot, and minimum size.</p></div></article>
        </section>

        <footer><p>Downrail provides partial, scenario-dependent hedging—not insurance or guaranteed protection.</p><span>Built on Somnia × DreamDEX</span></footer>
      </div>
    </main></WalletSessionProvider>
  );
}
