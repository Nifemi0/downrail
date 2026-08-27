# Shared UI Components

## HedgePreview
- Path: `src/components/hedge-preview.tsx`
- Description: Interactive asset, exposure, budget, and downside-scenario hedge preview.

```tsx
"use client";

import { useMemo, useState } from "react";

import { calculateSingleLegHedge } from "@/features/hedge-planner/calculate-single-leg";
import type { HedgeAsset, MarketBoardRow } from "@/lib/dreamdex/market-board";

function dollarsToRaw(value: number) {
  return BigInt(Math.max(0, Math.round(value * 1_000_000)));
}

function formatUsd(raw: bigint) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(raw) / 1_000_000);
}

export function HedgePreview({ markets }: { markets: MarketBoardRow[] }) {
  const [asset, setAsset] = useState<HedgeAsset>("ETH");
  const [exposure, setExposure] = useState(2_000);
  const [budget, setBudget] = useState(20);
  const [dropPercent, setDropPercent] = useState(5);
  const quotedMarket = markets.find(
    (market) => market.asset === asset && market.bestNoAskRaw !== null,
  );

  const plan = useMemo(() => {
    if (!quotedMarket?.bestNoAskRaw || exposure <= 0 || budget <= 0) return null;
    return calculateSingleLegHedge({
      exposureRaw: dollarsToRaw(exposure),
      budgetRaw: dollarsToRaw(budget),
      downsideMoveBps: BigInt(Math.max(1, Math.round(dropPercent * 100))),
      downAskRaw: BigInt(quotedMarket.bestNoAskRaw),
      quoteDecimals: quotedMarket.quoteDecimals,
      outcomeDecimals: 6,
      lotSizeRaw: 1n,
      minQuantityRaw: 1n,
    });
  }, [budget, dropPercent, exposure, quotedMarket]);

  return (
    <section className="planner-card" aria-labelledby="planner-title">
      <div className="section-heading">
        <div><p className="eyebrow">Indicative hedge</p><h2 id="planner-title">Shape your protection</h2></div>
        <span className="phase-pill">Read only</span>
      </div>
      <div className="planner-grid">
        <div className="input-stack">
          <fieldset className="asset-switch">
            <legend className="sr-only">Asset</legend>
            {(["BTC", "ETH"] as const).map((option) => (
              <button className={asset === option ? "active" : ""} key={option} onClick={() => setAsset(option)} type="button">{option}</button>
            ))}
          </fieldset>
          <label><span>Exposure</span><div className="money-input"><span>$</span><input min="1" onChange={(event) => setExposure(Number(event.target.value))} type="number" value={exposure} /></div></label>
          <label><span>Maximum budget</span><div className="money-input"><span>$</span><input min="1" onChange={(event) => setBudget(Number(event.target.value))} type="number" value={budget} /></div></label>
          <label><span>Downside scenario</span><div className="range-row"><input max="25" min="1" onChange={(event) => setDropPercent(Number(event.target.value))} type="range" value={dropPercent} /><strong>{dropPercent}%</strong></div></label>
        </div>
        <div className="result-panel">
          {plan && quotedMarket ? (
            <><p className="result-kicker">{asset} · {quotedMarket.intervalLabel} window</p><div className="coverage-value"><strong>{Number(plan.coverageBps) / 100}%</strong><span>scenario coverage</span></div><dl className="result-list"><div><dt>Estimated cost</dt><dd>{formatUsd(plan.estimatedCostRaw)}</dd></div><div><dt>Loss in scenario</dt><dd>{formatUsd(plan.scenarioPortfolioLossRaw)}</dd></div><div><dt>Net protection if DOWN wins</dt><dd>{formatUsd(plan.netWinningProtectionRaw)}</dd></div><div><dt>Current DOWN ask</dt><dd>{quotedMarket.bestNoAskDisplay}</dd></div></dl></>
          ) : (
            <div className="empty-result"><span>◇</span><h3>No executable DOWN quote yet</h3><p>The market feed is live, but this asset currently has no resting top-of-book quote in the selected venue.</p></div>
          )}
        </div>
      </div>
      <p className="planner-note">Preview only. It uses the live top-of-book price without depth, slippage, settlement fees, or receipt validation. Transaction execution remains intentionally disabled during Phase 0.</p>
    </section>
  );
}

```

