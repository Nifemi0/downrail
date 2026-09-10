import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Fingerprint,
  ReceiptText,
  RefreshCw,
  ScanLine,
  SlidersHorizontal,
  TrendingDown,
  Wallet,
} from "lucide-react";

import { ProtectionLens } from "@/components/protection-lens";

const proofStops = [
  { label: "Find", title: "Live depth", detail: "Read the DreamDEX order book.", icon: ScanLine },
  { label: "Compare", title: "Exact cash flow", detail: "Show premium, gross return, and net result.", icon: SlidersHorizontal },
  { label: "Check", title: "Entry-price gap", detail: "Expose where the contract and portfolio can diverge.", icon: BadgeCheck },
  { label: "Review", title: "Exact calls", detail: "Inspect approval and order fingerprints.", icon: Fingerprint },
  { label: "Prove", title: "Receipts", detail: "Reconcile what happened onchain.", icon: ReceiptText },
  { label: "Continue", title: "Settle or roll", detail: "Claim a win or inspect the next window.", icon: RefreshCw },
] as const;

export default function Home() {
  return (
    <main className="dr-page" id="top">
      <section className="dr-hero" aria-labelledby="dr-hero-title">
        <div className="dr-hero-visual" aria-hidden="true">
          <div className="dr-risk-orb" />
          <div className="dr-risk-cut"><span>Market risk</span></div>
          <div className="dr-reeds" />
          <div className="dr-result-tag"><span>Contract fit</span><strong>Read the gap</strong><small>know exactly when the separate NO position wins</small></div>
        </div>

        <div className="dr-wrap dr-hero-inner">
          <div className="dr-hero-copy">
            <p className="dr-label">Conditional downside planning</p>
            <h1 id="dr-hero-title">Know what the contract<span>actually covers.</span></h1>
            <p>Keep your BTC or ETH. Downrail shows what a separate DreamDEX NO position costs, when it wins, what it returns, and where it can fail to match your loss.</p>
            <div className="dr-hero-actions">
              <Link className="dr-capsule" href="/app"><b>Explore Downrail</b><span><ArrowUpRight aria-hidden="true" /></span></Link>
              <a className="dr-text-link" href="#story">See the money move <ArrowRight aria-hidden="true" /></a>
            </div>
          </div>
        </div>

        <div className="dr-ticker" aria-label="Example protection plan">
          <div className="dr-wrap"><span>Your asset stays yours</span><span>Exact market question shown</span><span>Gross and net separated</span><span>Both outcomes visible</span></div>
        </div>
      </section>

      <section className="dr-explainer" id="how-it-works" aria-labelledby="explainer-title">
        <div className="dr-wrap">
          <header className="dr-section-head"><div><p className="dr-label">Downrail in plain English</p><h2 id="explainer-title">Keep the asset. Inspect the separate bet.</h2></div><p>Downrail is a planning and execution layer for live Event Contracts—not a vault, an insurer, or a promise that every loss gets paid back.</p></header>
          <div className="dr-explainer-grid">
            <article><span><Wallet aria-hidden="true" /></span><p>What stays yours</p><h3>Your BTC or ETH stays in your wallet.</h3><small>Downrail does not sell, move, or custody the position you already own.</small></article>
            <article><span><ScanLine aria-hidden="true" /></span><p>What Downrail measures</p><h3>The exact binary cash flow.</h3><small>It separates the premium, total winning return, net result, liquidity, and expiry.</small></article>
            <article><span><BadgeCheck aria-hidden="true" /></span><p>What Downrail checks</p><h3>Where the contract may not match.</h3><small>The market uses its own opening price and settlement rule—not the price where you bought your asset.</small></article>
          </div>
        </div>
      </section>

      <section className="dr-product" id="product" aria-labelledby="product-title">
        <div className="dr-wrap">
          <header className="dr-section-head">
            <div><p className="dr-label">The contract moment</p><h2 id="product-title">Pull ETH down. Switch between both outcomes.</h2></div>
            <p>This fixed example shows the portfolio loss and the separate binary contract together. The contract payout does not grow when the ETH loss grows.</p>
          </header>
          <ProtectionLens />
        </div>
      </section>

      <section className="dr-story" id="story" aria-labelledby="story-title">
        <div className="dr-wrap dr-story-layout">
          <header className="dr-story-intro"><p className="dr-label">One night. Two positions.</p><h2 id="story-title">Maya sees the contract without confusing it with her ETH.</h2><p>She keeps $1,000 of ETH and separately spends $5 on a NO position that returns $10 only if the exact market question settles NO.</p></header>
          <div className="dr-story-track">
            <article><span className="dr-story-icon"><Wallet aria-hidden="true" /></span><div><p>Before the drop</p><h3>Her ETH stays in her wallet</h3></div><strong>$1,000</strong></article>
            <article className="risk"><span className="dr-story-icon"><TrendingDown aria-hidden="true" /></span><div><p>ETH falls 10%</p><h3>The position loses value</h3></div><strong>−$100</strong></article>
            <article className="protected"><span className="dr-story-icon"><Boxes aria-hidden="true" /></span><div><p>The market answers NO</p><h3>The separate contract returns $10</h3></div><strong>+$5 net</strong></article>
            <article><span className="dr-story-icon"><BadgeCheck aria-hidden="true" /></span><div><p>After the $5 premium</p><h3>The winning contract offsets part of the loss</h3></div><strong>−$95 net</strong></article>
            <p className="dr-story-note">Illustrative test-collateral example, not a live quote. If the market answers YES, the contract returns nothing and Maya&apos;s combined modeled loss is $105. Her ETH remains in her wallet in both cases.</p>
          </div>
        </div>
      </section>

      <section className="dr-funding" id="payouts" aria-labelledby="payouts-title">
        <div className="dr-wrap">
          <p className="dr-label">No magic money</p>
          <h2 id="payouts-title">The payout has a source before the market moves.</h2>
          <div className="dr-funding-flow">
            <article><ArrowUpRight aria-hidden="true" /><span>Market participants</span><strong>UP-side collateral is committed</strong></article>
            <ArrowRight className="dr-flow-arrow" aria-hidden="true" />
            <article className="pool"><Boxes aria-hidden="true" /><span>DreamDEX Event Contract</span><strong>Prefunded collateral pool</strong></article>
            <ArrowRight className="dr-flow-arrow" aria-hidden="true" />
            <article><BadgeCheck aria-hidden="true" /><span>After settlement</span><strong>The winning outcome receives value</strong></article>
          </div>
          <div className="dr-funding-note"><strong>Downrail helps shape and review the route. It does not mint the difference.</strong><p>Actual cost and payout depend on the contracts that fill, market rules, settlement, fees, and available liquidity.</p></div>
        </div>
      </section>

      <section className="dr-proof" id="proof" aria-labelledby="proof-title">
        <div className="dr-wrap">
          <p className="dr-label">From risk to receipt</p>
          <h2 id="proof-title">A conditional position you can inspect end to end.</h2>
          <div className="dr-proof-rail">
            {proofStops.map(({ label, title, detail, icon: Icon }, index) => (
              <article className={index < 4 ? "active" : ""} key={title}>
                <span className="dr-proof-icon"><Icon aria-hidden="true" /></span>
                <small>{label}</small><h3>{title}</h3><p>{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dr-final" aria-labelledby="final-title">
        <div className="dr-wrap"><div className="dr-final-inner">
          <div><p className="dr-label">Check the route</p><h2 id="final-title">Read the contract before you sign it.</h2></div>
          <p>Start without a wallet. Compare both outcomes, inspect the entry-price gap, then review the exact testnet calls.</p>
          <Link className="dr-capsule" href="/app"><b>Launch testnet app</b><span><ArrowUpRight aria-hidden="true" /></span></Link>
        </div></div>
      </section>
    </main>
  );
}
