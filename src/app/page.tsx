import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <main id="top">
      <div className="page-shell landing-shell">
        <header className="hero landing-hero">
          <div className="hero-copy">
            <p className="eyebrow">Portfolio protection</p>
            <h1>Keep the upside.<span>Guard the downside.</span></h1>
            <p className="hero-text">Downrail uses existing DreamDEX DOWN contracts to add a conditional payout alongside BTC or ETH you already own.</p>
            <p className="category-note"><span>Not insurance.</span> You choose the exposure, horizon, and maximum spend; every payout still depends on the selected contract&apos;s exact result.</p>
            <div className="hero-actions">
              <Link className="primary-action" href="/app">Open Downrail <ArrowUpRight aria-hidden="true" /></Link>
              <Link className="text-action" href="/docs">Learn how it works <ArrowUpRight aria-hidden="true" /></Link>
            </div>
          </div>

          <div className="hero-visual" aria-label="Illustration comparing a one hundred dollar portfolio loss with a separate conditional DOWN contract payout">
            <span className="visual-caption">Illustrative mechanics · not guaranteed coverage</span>
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

        <section className="landing-process" aria-labelledby="process-title">
          <div className="section-intro">
            <div><p className="eyebrow">How it works</p><h2 id="process-title">From exposure to review in three steps.</h2></div>
            <p>The landing page explains the product. The app handles every live market and wallet interaction.</p>
          </div>
          <div className="trust-strip landing-steps">
            <article><span>01</span><div><h3>Define the risk</h3><p>Choose BTC or ETH, enter the exposure, downside scenario, budget, and horizon.</p></div></article>
            <article><span>02</span><div><h3>Compare outcomes</h3><p>See maximum cost and the combined portfolio result if the DOWN contract resolves either way.</p></div></article>
            <article><span>03</span><div><h3>Review exact calls</h3><p>Start with a wallet-free demo, then inspect every Shannon call before confirming testnet execution.</p></div></article>
          </div>
        </section>

        <section className="landing-story" aria-labelledby="story-title">
          <div className="section-intro">
            <div><p className="eyebrow">A concrete example</p><h2 id="story-title">Maya keeps her ETH. Here is what $10 can—and cannot—protect.</h2></div>
            <p>Illustration, not a live quote. She buys a hedge for $10 that pays $20 only if its exact DOWN condition wins.</p>
          </div>
          <div className="story-frame">
            <article className="story-persona">
              <div className="story-persona-top"><span className="story-avatar">M</span><span className="story-label">Maya&apos;s example plan</span></div>
              <h3>&ldquo;I want to keep my ETH. How much of a drop could a small hedge offset?&rdquo;</h3>
              <dl className="story-facts">
                <div><dt>ETH exposure</dt><dd>$1,000</dd></div>
                <div><dt>Hedge purchase cost</dt><dd>$10</dd></div>
                <div><dt>Payout if DOWN wins</dt><dd>$20</dd></div>
              </dl>
            </article>
            <div className="story-journey" aria-label="Maya's protection journey">
              <article className="story-step"><span className="story-icon"><ShieldCheck aria-hidden="true" /></span><div><strong>She chooses her limit</strong><p>Downrail checks the live order book. Actual cost and payout depend on the contracts that fill.</p></div></article>
              <ArrowRight aria-hidden="true" />
              <article className="story-step"><span className="story-icon"><ArrowDownRight aria-hidden="true" /></span><div><strong>She checks the condition</strong><p>The selected contract&apos;s result and expiry decide the payout—not her overall portfolio loss.</p></div></article>
              <ArrowRight aria-hidden="true" />
              <article className="story-step"><span className="story-icon"><ShieldCheck aria-hidden="true" /></span><div><strong>She decides with context</strong><p>Her wallet confirms only the exact bounded calls she has reviewed.</p></div></article>
            </div>
            <div className="story-outcomes">
              <article className="story-outcome upside"><div><TrendingUp aria-hidden="true" /><span>DOWN condition wins</span></div><strong>$100 ETH loss → $90 combined loss</strong><p>Her ETH falls from $1,000 to $900. The $20 payout minus the $10 purchase cost offsets $10 of that loss.</p><p>$900 ETH + $20 payout − $10 cost = $910, relative to her starting $1,000.</p></article>
              <article className="story-outcome downside"><div><TrendingDown aria-hidden="true" /><span>DOWN condition loses</span></div><strong>$100 ETH loss → $110 combined loss</strong><p>If her ETH is worth $900 but the selected condition loses, there is no payout. She also loses the $10 hedge cost.</p><p>$900 ETH + $0 payout − $10 cost = $890. A different measurement window can produce this mismatch.</p></article>
            </div>
          </div>
          <p className="story-footnote">Where does the payout come from? Event Contract collateral, distributed under the market&apos;s settlement rules—not money created by Downrail. If ETH rises, Maya still owns it, but the hedge cost reduces her combined return. All figures exclude fees and use illustrative dollar-equivalent values; the live prototype uses Shannon test tokens. This is partial, conditional hedging—not insurance or guaranteed coverage.</p>
        </section>

        <section className="landing-principles" aria-labelledby="principles-title">
          <div><p className="eyebrow">Built for clarity</p><h2 id="principles-title">A protection workflow—not a prediction terminal.</h2></div>
          <div className="principle-list">
            <article><strong>Budget bounded</strong><p>The proposed maximum cost cannot exceed the spend you enter.</p></article>
            <article><strong>Depth aware</strong><p>Plans consume live resting liquidity instead of assuming an infinite top quote.</p></article>
            <article><strong>Wallet controlled</strong><p>Downrail builds and decodes calls, but your wallet confirms every transaction.</p></article>
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="landing-cta-title">
          <div><p className="eyebrow">Ready to explore?</p><h2 id="landing-cta-title">Build a live protection plan.</h2><p>Try the complete flow without a wallet, or connect to Somnia Shannon when you are ready.</p></div>
          <Link className="primary-action" href="/app">Open the app <ArrowUpRight aria-hidden="true" /></Link>
        </section>
      </div>
    </main>
  );
}
