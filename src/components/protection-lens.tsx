"use client";

import { useState } from "react";

const dollarFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function dollars(value: number) {
  return dollarFormatter.format(value);
}

export function ProtectionLens() {
  const exposure = 1_000;
  const contractCost = 5;
  const grossPayout = 10;
  const [downsidePercent, setDownsidePercent] = useState(10);
  const [contractWins, setContractWins] = useState(true);

  const positionLoss = exposure * (downsidePercent / 100);
  const contractResult = contractWins ? grossPayout - contractCost : -contractCost;
  const combinedLoss = positionLoss - contractResult;
  const coveragePercent = Math.round(((grossPayout - contractCost) / positionLoss) * 100);
  const endValue = exposure - positionLoss;

  const chartEndY = 58 + downsidePercent * 8.8;
  const areaPath = `M0 45 L110 60 L210 49 L320 86 L430 76 L535 121 L630 ${Math.max(150, chartEndY - 38)} L710 ${Math.max(190, chartEndY - 12)} L800 ${chartEndY} L800 320 L0 320 Z`;
  const linePath = `M0 45 L110 60 L210 49 L320 86 L430 76 L535 121 L630 ${Math.max(150, chartEndY - 38)} L710 ${Math.max(190, chartEndY - 12)} L800 ${chartEndY}`;

  return (
    <div className="dr-demo-board">
      <div className="dr-chart">
        <div className="dr-board-top"><span>Illustrative ETH move</span><span>Your ETH stays in your wallet</span></div>
        <svg aria-label={`Illustrative ETH fall of ${downsidePercent}%`} role="img" viewBox="0 0 800 320" preserveAspectRatio="none">
          <defs><linearGradient id="dr-drop-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff513f" stopOpacity=".34" /><stop offset="1" stopColor="#ff513f" stopOpacity="0" /></linearGradient></defs>
          <path className="dr-drop-area" d={areaPath} />
          <path className="dr-drop-line" d={linePath} />
        </svg>
        <span className="dr-chart-start">$1,000</span><span className="dr-chart-end">{dollars(endValue)}</span>
        <div className="dr-scenario-control"><div><label htmlFor="landing-downside">Model the ETH fall</label><output htmlFor="landing-downside">−{downsidePercent}%</output></div><input id="landing-downside" type="range" min="2" max="20" value={downsidePercent} onChange={(event) => setDownsidePercent(Number(event.target.value))} /></div>
      </div>
      <div className="dr-ledger">
        <header>
          <p className="dr-label">Fixed binary example · not a live quote</p>
          <h3>See both possible outcomes.</h3>
          <div className="dr-outcome-toggle" aria-label="Contract result">
            <button aria-pressed={contractWins} className={contractWins ? "active" : ""} onClick={() => setContractWins(true)} type="button">NO wins</button>
            <button aria-pressed={!contractWins} className={!contractWins ? "active" : ""} onClick={() => setContractWins(false)} type="button">YES wins</button>
          </div>
        </header>
        <div className="loss"><span>Modeled ETH loss</span><strong>−{dollars(positionLoss)}</strong><small>$1,000 → {dollars(endValue)}</small></div>
        <div className="offset"><span>Contract cash returned</span><strong>{contractWins ? dollars(grossPayout) : "$0"}</strong><small>{contractWins ? `${dollars(grossPayout)} gross − ${dollars(contractCost)} premium = +${dollars(contractResult)} net` : `${dollars(contractCost)} premium is lost`}</small></div>
        <div className={`net ${contractWins ? "target_met" : "partial_offset"}`}><span>Combined modeled result</span><strong>−{dollars(combinedLoss)}</strong><small>{contractWins ? `${coveragePercent}% of this loss scenario offset` : "The contract adds its premium to the portfolio loss"}. The payout is fixed; a larger ETH drop does not increase it.</small></div>
      </div>
    </div>
  );
}
