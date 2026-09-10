"use client";

import { useEffect, useState } from "react";
import type { MarketBoardSnapshot } from "@/lib/dreamdex/market-board";
import { useLiveClock } from "@/lib/use-live-clock";

export function MarketInventory() {
  const [snapshot, setSnapshot] = useState<MarketBoardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const now = useLiveClock();
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/market-board", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        const body = await response.json();
        if (!response.ok || !body.ok) throw new Error("DreamDEX inventory is temporarily unavailable. Retry when the service recovers.");
        if (!controller.signal.aborted) setSnapshot(body);
      } catch {
        if (!controller.signal.aborted) setError("DreamDEX inventory is temporarily unavailable. Planning and portfolio controls remain available below.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  function retry() { setError(null); setSnapshot(null); setLoading(true); setAttempt((value) => value + 1); }
  const markets = snapshot?.markets ?? [];
  const isExpired = (expiryUnixSeconds: number) => Boolean(now && expiryUnixSeconds <= now);
  const liveMarkets = markets.filter((market) => !isExpired(market.expiryUnixSeconds));
  const visibleMarkets = expanded ? markets : liveMarkets.slice(0, 5);
  return (
    <section id="markets" className="app-market-section" aria-labelledby="markets-title" aria-busy={loading}>
      <div className="section-intro compact-intro">
        <div><p className="eyebrow">Live inventory</p><h2 id="markets-title">Protection windows.</h2></div>
        <p>{snapshot ? `${liveMarkets.length} live · ${markets.length} indexed · snapshot ${new Date(snapshot.generatedAt).toLocaleTimeString()}` : "Live DreamDEX inventory"}</p>
      </div>
      {loading ? <div className="plan-message" role="status">Loading protection windows… The planner is available below.</div> : error ? (
        <div className="feed-error" role="status"><strong>Protection feed unavailable</strong><p>{error}</p><button className="text-action" type="button" onClick={retry}>Retry inventory</button></div>
      ) : snapshot ? (
        <>
          <div className="market-table app-market-table"><table>
            <caption className="sr-only">Live DreamDEX protection windows</caption>
            <thead><tr className="market-row market-header"><th>Asset</th><th>Window</th><th>Closes in</th><th>DOWN ask</th><th>Contract ID</th></tr></thead>
            <tbody>{visibleMarkets.map((market) => {
              const expired = isExpired(market.expiryUnixSeconds);
              return <tr className={`market-row${expired ? " expired" : ""}`} key={market.marketId}>
              <td data-label="Asset"><span className={`asset-badge ${market.asset.toLowerCase()}`}>{market.asset}</span></td>
              <td data-label="Window">{market.intervalLabel}</td><td className="mono" data-label="Closes in">{expired ? "Expired" : `${Math.max(0, Math.ceil((market.expiryUnixSeconds - now) / 60))}m`}</td>
              <td className={!expired && market.bestNoAskDisplay ? "quote-value" : "muted-value"} data-label="DOWN ask">{expired ? "Closed" : market.bestNoAskDisplay ?? "No quote"}</td>
              <td className="mono" data-label="Contract ID" title={market.marketId}>{market.marketId.slice(0, 8)}…{market.marketId.slice(-6)}</td>
            </tr>})}</tbody>
          </table></div>
          {snapshot.markets.length === 0 && <p>No live windows were returned. No protection has been purchased.</p>}
          <div className="market-actions">
            <button className="text-action" type="button" onClick={retry}>Refresh inventory</button>
            {markets.length > visibleMarkets.length && <button className="text-action" type="button" onClick={() => setExpanded(true)}>View all {markets.length} windows</button>}
            {expanded && <button className="text-action" type="button" onClick={() => setExpanded(false)}>Show live shortlist</button>}
          </div>
        </>
      ) : null}
    </section>
  );
}
