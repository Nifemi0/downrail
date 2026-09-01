import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Docs",
  description: "Learn how Downrail plans, reviews, executes, and settles testnet protection positions.",
};

const sections = [
  ["overview", "Overview"],
  ["quick-start", "Quick start"],
  ["demo", "Demo mode"],
  ["testnet", "Shannon testnet"],
  ["mechanics", "How protection works"],
  ["execution", "Execution"],
  ["settlement", "Settlement & claims"],
  ["risks", "Risks"],
  ["architecture", "Architecture"],
  ["troubleshooting", "Troubleshooting"],
  ["faq", "FAQ"],
] as const;

export default function DocsPage() {
  return (
    <main className="docs-shell">
      <aside className="docs-sidebar" aria-label="Documentation navigation">
        <p className="eyebrow">Documentation</p>
        <nav>{sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
      </aside>

      <article className="docs-article">
        <header className="docs-hero" id="overview">
          <p className="eyebrow">Downrail docs</p>
          <h1>Learn how to guard the downside.</h1>
          <p>Downrail builds budget-capped, scenario-dependent protection plans using existing DreamDEX DOWN contracts on Somnia Shannon.</p>
          <div className="docs-callout"><strong>Downrail is not insurance.</strong><span>A payout depends on the exact Event Contract outcome, available liquidity, and the order confirmed in your wallet.</span></div>
        </header>

        <section className="docs-section" id="quick-start">
          <p className="eyebrow">Quick start</p>
          <h2>From exposure to review in three steps.</h2>
          <div className="docs-steps">
            <article><span>01</span><strong>Define exposure</strong><p>Choose BTC or ETH, enter the portfolio value, loss scenario, budget, and protection horizon.</p></article>
            <article><span>02</span><strong>Read both outcomes</strong><p>Compare current cost, conditional payout, and the combined portfolio scenario.</p></article>
            <article><span>03</span><strong>Review exact calls</strong><p>On testnet, inspect every call before your wallet asks for confirmation.</p></article>
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
          <h2>DOWN contracts create a separate conditional payout.</h2>
          <p>Downrail does not sell or custody the asset you already own. It estimates how many DOWN outcome units fit inside your maximum spend and shows the combined scenario if that contract resolves YES or NO.</p>
          <div className="docs-outcomes">
            <article className="win"><span>DOWN resolves YES</span><strong>Outcome units may pay conditional collateral.</strong></article>
            <article className="loss"><span>DOWN resolves NO</span><strong>The paid premium becomes the hedge result.</strong></article>
          </div>
        </section>

        <section className="docs-section" id="execution">
          <p className="eyebrow">Execution</p>
          <h2>Downrail cannot sign for you.</h2>
          <p>A testnet review binds the account, market, limit price, quantity, maximum cost, and expiry into a fingerprint. You acknowledge that review, then your wallet confirms each call.</p>
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
          <p>The app verifies DreamDEX candidates on Shannon, reads executable depth, builds a bounded plan, creates decoded unsigned calls, and reconciles confirmed transactions against indexed fills and live balances.</p>
          <div className="architecture-flow" aria-label="Downrail architecture flow"><span>DreamDEX discovery</span><ArrowRight aria-hidden="true" /><span>Planner validation</span><ArrowRight aria-hidden="true" /><span>Unsigned review</span><ArrowRight aria-hidden="true" /><span>Wallet confirmation</span><ArrowRight aria-hidden="true" /><span>Settlement scan</span></div>
        </section>

        <section className="docs-section" id="troubleshooting">
          <p className="eyebrow">Troubleshooting</p>
          <h2>Common setup problems.</h2>
          <details><summary>The wallet will not switch networks</summary><p>Add Somnia Shannon manually with chain ID 50312 and RPC <code>https://dream-rpc.somnia.network</code>.</p></details>
          <details><summary>The order review is disabled</summary><p>Connect a wallet, switch to Shannon, keep the pilot budget within the displayed safety cap, and ensure a live executable window exists.</p></details>
          <details><summary>I do not have TESDC</summary><p>Open the app, switch to Testnet mode, and use “Request test collateral” after connecting to Shannon.</p></details>
        </section>

        <section className="docs-section" id="faq">
          <p className="eyebrow">FAQ</p>
          <h2>Frequently asked questions.</h2>
          <details><summary>Is Downrail a prediction market?</summary><p>No. Downrail uses existing DreamDEX Event Contracts as building blocks for a portfolio-protection workflow.</p></details>
          <details><summary>Can Downrail access my funds?</summary><p>No. Your wallet signs every transaction and Downrail cannot sign on your behalf.</p></details>
          <details><summary>Does a plan guarantee my portfolio loss is covered?</summary><p>No. The payout is conditional on the selected market&apos;s exact result and may only offset part of the modeled loss.</p></details>
          <Link className="primary-action docs-action" href="/app">Open Downrail <ArrowUpRight aria-hidden="true" /></Link>
        </section>
      </article>
    </main>
  );
}
