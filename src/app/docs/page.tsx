import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Fingerprint, ReceiptText, ScanLine, SlidersHorizontal, WalletCards } from "lucide-react";

export const metadata: Metadata = {
  title: "Docs",
  description: "Learn how Downrail compares, reviews, executes, and settles testnet DOWN positions.",
};

const sections = [
  ["overview", "Overview"],
  ["quick-start", "Quick start"],
  ["demo", "Demo mode"],
  ["testnet", "Shannon testnet"],
  ["mechanics", "Contract fit"],
  ["execution", "Execution"],
  ["settlement", "Settlement & claims"],
  ["risks", "Risks"],
  ["architecture", "Architecture"],
  ["troubleshooting", "Troubleshooting"],
  ["faq", "FAQ"],
] as const;

const architectureNodes = [
  ["Discovery", "Live market reads", "DreamDEX windows and executable depth", ScanLine],
  ["Planning", "Route comparison", "Expiry fit, payout, order grid, and liquidity", SlidersHorizontal],
  ["Review", "Unsigned fingerprint", "Exact calls before the wallet opens", Fingerprint],
  ["Confirmation", "Wallet execution", "Your account confirms each call", WalletCards],
  ["Settlement", "Reconciliation", "Fills, balances, claims, and receipts", ReceiptText],
] as const;

export default function DocsPage() {
  return (
    <main className="docs-shell dr-docs">
      <aside className="docs-sidebar" aria-label="Documentation navigation">
        <p className="eyebrow">Documentation</p>
        <nav>{sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
      </aside>

      <article className="docs-article">
        <header className="docs-hero" id="overview">
          <p className="eyebrow">Downrail docs</p>
          <h1>Know what a DOWN contract can—and cannot—cover.</h1>
          <p>Downrail compares live DreamDEX NO positions with a loss scenario you enter, then exposes the exact contract and cash flows before your wallet opens.</p>
          <div className="docs-callout"><strong>Downrail is not insurance.</strong><span>You keep your BTC or ETH. The separate binary contract pays only when its exact market question settles in favor of the NO position you bought.</span></div>
        </header>

        <section className="docs-section" id="quick-start">
          <p className="eyebrow">Quick start</p>
          <h2>From a loss scenario to an exact contract review.</h2>
          <div className="docs-steps">
            <article><span>01</span><strong>Describe what you hold</strong><p>Choose BTC or ETH, enter its approximate value, and select how long you are concerned. Spending and scenario assumptions stay under Advanced.</p></article>
            <article><span>02</span><strong>Read the result</strong><p>Downrail translates the NO position into its below-opening-price trigger and shows cost, possible return, profit and remaining modeled loss.</p></article>
            <article><span>03</span><strong>Review only a qualifying route</strong><p>Weak or mismatched routes stop before the wallet. A qualifying testnet route can produce decoded unsigned calls for confirmation.</p></article>
          </div>
          <Link className="primary-action docs-action" href="/app">Open the app <ArrowUpRight aria-hidden="true" /></Link>
        </section>

        <section className="docs-section" id="demo">
          <p className="eyebrow">Demo mode</p>
          <h2>Start without a wallet.</h2>
          <p>Demo mode uses the live market snapshot to build a simulated review. It never opens a wallet or sends a transaction. Use it to understand the plan before touching testnet funds.</p>
        </section>

        <section className="docs-section" id="testnet">
          <p className="eyebrow">Shannon testnet</p>
          <h2>What you need for a test order.</h2>
          <dl className="docs-definition-list">
            <dt>Wallet</dt><dd>An EIP-6963 compatible browser wallet.</dd>
            <dt>Network</dt><dd>Somnia Shannon, chain ID 50312.</dd>
            <dt>STT</dt><dd>A small amount of Somnia test tokens for gas.</dd>
            <dt>TESDC</dt><dd>Test collateral available from the faucet inside the Downrail app.</dd>
          </dl>
        </section>

        <section className="docs-section" id="mechanics">
          <p className="eyebrow">Mechanics</p>
          <h2>A DOWN label alone does not make useful protection.</h2>
          <p>Downrail does not sell or custody the asset you own. It estimates an executable NO route, translates that side as “closes below the window&apos;s opening price,” subtracts the premium from the fixed winning return, and compares that net gain with your modeled loss. The comparison does not predict which outcome will win.</p>
          <div className="docs-outcomes">
            <article className="win"><span>The asset closes below the window opening</span><strong>The selected NO position wins and returns fixed test collateral.</strong></article>
            <article className="loss"><span>The asset closes at or above the window opening</span><strong>The selected position returns nothing and the premium is lost.</strong></article>
          </div>
        </section>

        <section className="docs-section">
          <p className="eyebrow">Scenario labels</p>
          <h2>The verdict is a deterministic safety gate.</h2>
          <dl className="docs-definition-list">
            <dt>Worth reviewing</dt><dd>The possible net gain reaches the selected loss-offset target and is at least the premium at risk. This permits review; it does not predict a win.</dd>
            <dt>Skip this route</dt><dd>The route misses the target, returns too little for its cost, or is oversized for the scenario. Wallet review stays closed.</dd>
            <dt>Unavailable</dt><dd>No eligible market can produce an executable order with the current inputs.</dd>
          </dl>
          <div className="docs-callout"><strong>Entry-price gap</strong><span>The current markets settle against their own window rules, not the price where you bought your BTC or ETH. Your asset and the NO contract can both lose.</span></div>
        </section>

        <section className="docs-section" id="execution">
          <p className="eyebrow">Execution</p>
          <h2>Execution starts with an exact unsigned review.</h2>
          <p>A qualifying executable route can produce a testnet order review. That review binds the account, market, limit price, quantity, maximum cost, and expiry into a fingerprint. The route is revalidated immediately before execution; you acknowledge it, then your wallet confirms each call.</p>
          <ol className="docs-checklist"><li>Connect the intended wallet.</li><li>Switch to Somnia Shannon.</li><li>Request TESDC if your test collateral is low.</li><li>Build and read the unsigned review.</li><li>Confirm the tiny pilot in your wallet.</li></ol>
        </section>

        <section className="docs-section" id="settlement">
          <p className="eyebrow">Settlement</p>
          <h2>Positions remain visible until finalized.</h2>
          <p>The portfolio sidebar reads the connected account&apos;s outcome balances. When a market is finalized and a position becomes claimable, Downrail can build an unsigned claim review for wallet confirmation.</p>
        </section>

        <section className="docs-section docs-risk" id="risks">
          <p className="eyebrow">Risks</p>
          <h2>Know what the plan cannot guarantee.</h2>
          <ul><li>Market liquidity and prices can change before confirmation.</li><li>A contract&apos;s exact resolution rule may not match your portfolio loss.</li><li>Future rollover markets are never selected automatically.</li><li>Testnet assets have no real monetary value.</li></ul>
        </section>

        <section className="docs-section" id="architecture">
          <p className="eyebrow">Architecture</p>
          <h2>Live discovery, bounded planning, wallet execution.</h2>
          <p>The app verifies DreamDEX candidates on Shannon, reads executable depth, compares the requested number of routes by their combined expiry and interval gap before using conditional payout as a tie-breaker, creates decoded unsigned calls for the selected executable plan, and reconciles confirmed transactions against indexed fills and live balances.</p>
          <div className="architecture-map" aria-label="Downrail architecture flow">
            {architectureNodes.map(([layer, title, detail, Icon], index) => (
              <div className="architecture-map-unit" key={layer}>
                <article className="architecture-node"><span><Icon aria-hidden="true" /></span><small>{layer}</small><strong>{title}</strong><p>{detail}</p></article>
                {index < architectureNodes.length - 1 && <ArrowRight className="architecture-map-arrow" aria-hidden="true" />}
              </div>
            ))}
          </div>
          <p className="architecture-caption">The control plane prepares and explains the route. The wallet remains the execution boundary.</p>
        </section>

        <section className="docs-section" id="troubleshooting">
          <p className="eyebrow">Troubleshooting</p>
          <h2>Common setup problems.</h2>
          <details><summary>The wallet will not switch networks</summary><p>Add Somnia Shannon manually with chain ID 50312 and RPC <code>https://dream-rpc.somnia.network</code>.</p></details>
          <details><summary>The order review is disabled</summary><p>Connect a wallet, switch to Shannon, keep the pilot budget within the displayed safety cap, and adjust the horizon or Advanced assumptions until the live route says “Worth reviewing.” Downrail intentionally blocks weak routes.</p></details>
          <details><summary>I do not have TESDC</summary><p>Open the app, switch to Testnet mode, and use “Request test collateral” after connecting to Shannon.</p></details>
        </section>

        <section className="docs-section" id="faq">
          <p className="eyebrow">FAQ</p>
          <h2>Frequently asked questions.</h2>
          <details><summary>Is Downrail a prediction market?</summary><p>Downrail does not create markets. It plans and reviews positions in existing DreamDEX binary Event Contracts.</p></details>
          <details><summary>Can Downrail access my funds?</summary><p>No. Your wallet signs every transaction and Downrail cannot sign on your behalf.</p></details>
          <details><summary>Can Downrail read how much BTC or ETH I own?</summary><p>Not reliably. Shannon wallet balances do not prove holdings on another chain or exchange, so the app asks you for an approximate dollar value instead of inventing exposure data.</p></details>
          <details><summary>Does a plan guarantee my portfolio loss is covered?</summary><p>No. The payout is conditional on the selected market&apos;s exact result and may only offset part of the modeled loss.</p></details>
          <Link className="primary-action docs-action" href="/app">Open Downrail <ArrowUpRight aria-hidden="true" /></Link>
        </section>
      </article>
    </main>
  );
}
