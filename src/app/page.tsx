import Image from "next/image";

import { HedgePreview } from "@/components/hedge-preview";
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
          <span className="read-only-chip">Read only · Phase 1</span>
          <span className="network-chip"><i className={snapshot.ok ? "live" : ""} /> Shannon · {snapshot.ok ? "live" : "degraded"}</span>
          <WalletControl />
        </div>
      </nav>

      <div className="page-shell">
        <header className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Portfolio protection / 01</p>
            <h1>Keep the upside.<span>Guard the downside.</span></h1>
            <p className="hero-text">Downrail uses existing DreamDEX DOWN contracts to soften a defined BTC or ETH loss while you keep the asset you already own.</p>
            <p className="category-note"><span>Not a prediction market.</span> You choose the exposure, horizon, and maximum spend; Downrail builds the protection plan.</p>
            <div className="hero-actions">
              <a className="primary-action" href="#planner">Plan protection <span aria-hidden="true">↘</span></a>
              <a className="text-action" href="#windows">Inspect live windows <span aria-hidden="true">↗</span></a>
            </div>
          </div>

          <div className="hero-visual" aria-label="Illustration showing a one hundred dollar portfolio loss intercepted by a protection payout, leaving a smaller residual loss">
            <span className="visual-caption">Illustrative scenario · ETH / 5% move</span>
            <div className="visual-frame" />
            <div className="loss-plane">
              <span>Portfolio exposure</span><b>−$100</b>
              <strong>UNHEDGED<br />LOSS</strong>
            </div>
            <div className="protection-plane">
              <span>Down contract · protection rail</span>
              <strong>+$78.50</strong><b>Hedge payout</b>
            </div>
            <div className="residual-marker"><span>Residual loss</span><strong>−$21.50</strong></div>
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
            <div className="market-table" role="table" aria-label="Live DreamDEX protection windows">
              <div className="market-row market-header" role="row"><span>Asset</span><span>Window</span><span>Closes in</span><span>DOWN ask</span><span>Contract ID</span></div>
              {snapshot.markets.map((market) => (
                <div className="market-row" role="row" key={market.marketId}>
                  <span className={`asset-badge ${market.asset.toLowerCase()}`}>{market.asset}</span>
                  <span>{market.intervalLabel}</span>
                  <span className="mono">{timeUntil(market.expiryUnixSeconds)}</span>
                  <span className={market.bestNoAskDisplay ? "quote-value" : "muted-value"}>{market.bestNoAskDisplay ?? "No quote"}</span>
                  <span className="mono" title={market.marketId}>{shortId(market.marketId)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="trust-strip" aria-label="Downrail operating principles">
          <article><span>01</span><div><h3>Budget bounded</h3><p>The proposed maximum cost cannot exceed the spend you enter.</p></div></article>
          <article><span>02</span><div><h3>Depth aware</h3><p>Plans consume live resting liquidity instead of assuming an infinite top quote.</p></div></article>
          <article><span>03</span><div><h3>Chain checked</h3><p>Market state, expiry, decimal scale, tick, lot, and minimum size are verified.</p></div></article>
        </section>

        <footer><p>Downrail provides partial, scenario-dependent hedging—not insurance or guaranteed protection.</p><span>Built on Somnia × DreamDEX</span></footer>
      </div>
    </main></WalletSessionProvider>
  );
}
