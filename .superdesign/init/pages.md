# Page Dependency Trees

## / — HedgeFlow
Entry: `src/app/page.tsx`
Dependencies:
- `src/components/hedge-preview.tsx`
  - `src/features/hedge-planner/calculate-single-leg.ts`
- `src/lib/dreamdex/market-board.ts`
  - `src/lib/dreamdex/config.ts`
  - `src/lib/dreamdex/exchange.ts`
- `src/app/layout.tsx`
- `src/app/globals.css`

## Current page source

```tsx
import { HedgePreview } from "@/components/hedge-preview";
import { getMarketBoardSnapshot } from "@/lib/dreamdex/market-board";

export const dynamic = "force-dynamic";

function shortId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function timeUntil(expiryUnixSeconds: number) {
  const seconds = Math.max(0, expiryUnixSeconds - Math.floor(Date.now() / 1_000));
  if (seconds >= 3_600) return `${Math.floor(seconds / 3_600)}h ${Math.floor((seconds % 3_600) / 60)}m`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default async function Home() {
  const snapshot = await getMarketBoardSnapshot();

  return (
    <main>
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="HedgeFlow home">
          <span className="brand-mark">H</span><span>HedgeFlow</span>
        </a>
        <div className="network-chip">
          <span className={snapshot.ok ? "status-dot live" : "status-dot"} />
          Shannon testnet · {snapshot.ok ? "live" : "degraded"}
        </div>
      </nav>

      <div id="top" className="page-shell">
        <header className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Capped risk. Clear outcomes.</p>
            <h1>Keep your crypto.<span>Soften the downside.</span></h1>
            <p className="hero-text">HedgeFlow turns DreamDEX Event Contracts into transparent, short-duration BTC and ETH protection plans—priced live and kept inside your chosen budget.</p>
            <div className="hero-actions">
              <a className="primary-action" href="#planner">Preview a hedge</a>
              <a className="text-action" href="#markets">Inspect live markets →</a>
            </div>
          </div>
          <div className="hero-metric" aria-label="Project status">
            <div className="metric-orbit"><div><strong>Phase 0</strong><span>Integration validation</span></div></div>
            <ul><li><span>✓</span> Live indexer reads</li><li><span>✓</span> On-chain status probe</li><li><span>✓</span> Integer hedge math</li><li className="pending"><span>○</span> Wallet execution</li></ul>
          </div>
        </header>

        <div id="planner"><HedgePreview markets={snapshot.markets} /></div>

        <section id="markets" className="markets-section" aria-labelledby="markets-title">
          <div className="section-heading">
            <div><p className="eyebrow">DreamDEX signal</p><h2 id="markets-title">Live protection windows</h2></div>
            <p className="refresh-note">Snapshot {new Date(snapshot.generatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}</p>
          </div>
          {snapshot.error ? (
            <div className="feed-error"><strong>Market feed unavailable</strong><p>{snapshot.error}</p></div>
          ) : (
            <div className="market-table" role="table" aria-label="Live Event Contract markets">
              <div className="market-row market-header" role="row"><span>Asset</span><span>Window</span><span>Closes in</span><span>DOWN ask</span><span>Market</span></div>
              {snapshot.markets.map((market) => (
                <div className="market-row" role="row" key={market.marketId}>
                  <span className={`asset-badge ${market.asset.toLowerCase()}`}>{market.asset}</span>
                  <span>{market.intervalLabel}</span><span>{timeUntil(market.expiryUnixSeconds)}</span>
                  <span className="quote-value">{market.bestNoAskDisplay ?? "No quote"}</span>
                  <span className="mono">{shortId(market.marketId)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="principles">
          <article><span>01</span><h3>Budget bound</h3><p>Every proposed leg is calculated to stay inside the amount you approve.</p></article>
          <article><span>02</span><h3>Explainable math</h3><p>Prices, quantities, payouts, and residual risk remain visible before signing.</p></article>
          <article><span>03</span><h3>Chain verified</h3><p>Execution will recheck market state and receipts instead of trusting indexer timing.</p></article>
        </section>

        <footer><p>HedgeFlow provides partial, scenario-dependent hedging—not insurance or guaranteed protection.</p><span>Built on Somnia × DreamDEX</span></footer>
      </div>
    </main>
  );
}

```

