"use client";

import { useEffect, useId, useState } from "react";

import { useWalletSession } from "@/components/wallet-session";
import {
  PILOT_MAXIMUM_COST_RAW,
  runReviewedPilot,
  type ExecutedReviewedCall,
} from "@/features/execution/run-reviewed-calls";
import type { HedgeAsset } from "@/lib/dreamdex/market-board";
import type { LiveHedgePlanSnapshot } from "@/lib/dreamdex/hedge-plan-snapshot";

const HORIZONS = [
  { label: "15m", seconds: 15 * 60 },
  { label: "1h", seconds: 60 * 60 },
  { label: "4h", seconds: 4 * 60 * 60 },
  { label: "24h", seconds: 24 * 60 * 60 },
] as const;

type LoadState = "loading" | "ready" | "error";

type OrderPreflight = {
  mode: "UNSIGNED_REVIEW";
  account: string;
  chainId: number;
  quoteDecimals: number;
  fingerprint: string;
  generatedAt: string;
  plan: {
    asset: HedgeAsset;
    totalMaximumCostRaw: string;
    netWinningProtectionRaw: string;
    residualScenarioLossRaw: string;
    coverageBps: string;
  };
  legs: Array<{
    marketId: string;
    validUntil: string;
    calls: Array<{
      kind: "APPROVAL" | "ORDER";
      to: string;
      data: string;
      value: string;
      description: string;
    }>;
  }>;
  warnings: string[];
};

type StoredOrderPreflight = OrderPreflight & { intentKey: string };
type StoredPreflightError = { intentKey: string; message: string };
type ExecutionProgress = {
  fingerprint: string;
  message: string;
  completed?: ExecutedReviewedCall[];
  reconciliation?: ExecutionReconciliation;
  error?: boolean;
};

type ExecutionReconciliation = {
  fills: Array<{
    txHash: string;
    fillPriceRaw: string;
    quantityRaw: string;
    quoteQuantityRaw: string;
  }>;
  positions: Array<{
    outcome: "YES" | "NO";
    balanceRaw: string;
    quoteDecimals: number;
    status: string;
  }>;
  openOrders: Array<unknown>;
};

function formatRaw(raw: string, decimals: number, fractionDigits = 2) {
  const value = BigInt(raw);
  const scale = 10n ** BigInt(decimals);
  const displayScale = 10n ** BigInt(fractionDigits);
  const rounded = (value * displayScale + scale / 2n) / scale;
  const whole = rounded / displayScale;
  const fraction = (rounded % displayScale).toString().padStart(fractionDigits, "0");
  return `${whole.toLocaleString("en-US")}.${fraction}`;
}

function formatUsd(raw: string, decimals: number) {
  return `$${formatRaw(raw, decimals, 2)}`;
}

function formatProbability(raw: string, decimals: number) {
  const basisPoints = (BigInt(raw) * 10_000n) / 10n ** BigInt(decimals);
  return `${Number(basisPoints) / 100}%`;
}

function formatWindow(seconds: number) {
  if (seconds >= 86_400) return `${Math.round(seconds / 86_400)}d`;
  if (seconds >= 3_600) return `${Math.round(seconds / 3_600)}h`;
  return `${Math.round(seconds / 60)}m`;
}

function formatExpiry(unixSeconds: number) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(unixSeconds * 1_000));
}

function shortId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export function HedgePreview() {
  const { account, chainId, provider } = useWalletSession();
  const exposureId = useId();
  const budgetId = useId();
  const downsideId = useId();
  const [asset, setAsset] = useState<HedgeAsset>("ETH");
  const [exposure, setExposure] = useState("2000");
  const [budget, setBudget] = useState("20");
  const [dropPercent, setDropPercent] = useState(5);
  const [horizonSeconds, setHorizonSeconds] = useState(60 * 60);
  const [snapshot, setSnapshot] = useState<LiveHedgePlanSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<StoredOrderPreflight | null>(null);
  const [preflightPending, setPreflightPending] = useState(false);
  const [preflightError, setPreflightError] = useState<StoredPreflightError | null>(null);
  const [acknowledgedFingerprint, setAcknowledgedFingerprint] = useState<string | null>(null);
  const [execution, setExecution] = useState<ExecutionProgress | null>(null);
  const [executionPending, setExecutionPending] = useState(false);
  const intentKey = [account, chainId, asset, exposure, budget, dropPercent, horizonSeconds].join(":");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const exposureNumber = Number(exposure);
      const budgetNumber = Number(budget);
      if (!Number.isFinite(exposureNumber) || exposureNumber <= 0 || !Number.isFinite(budgetNumber) || budgetNumber <= 0) {
        setLoadState("error");
        setError("Enter a positive exposure and protection budget.");
        return;
      }

      setLoadState("loading");
      setError(null);
      const query = new URLSearchParams({
        asset,
        exposureUsd: exposure,
        budgetUsd: budget,
        downsideMoveBps: String(dropPercent * 100),
        horizonSeconds: String(horizonSeconds),
        maxMarkets: "3",
      });

      try {
        const response = await fetch(`/api/hedge-plan?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json()) as LiveHedgePlanSnapshot | { error?: string };
        if (!response.ok || !("plan" in body)) {
          throw new Error(
            "error" in body && body.error
              ? body.error
              : "The live planner could not build a plan.",
          );
        }
        setSnapshot(body);
        setLoadState("ready");
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setSnapshot(null);
        setLoadState("error");
        setError(requestError instanceof Error ? requestError.message : "The live planner is unavailable.");
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [asset, budget, dropPercent, exposure, horizonSeconds]);

  async function buildOrderReview() {
    if (!account || chainId !== "0xc488") return;
    setPreflightPending(true);
    setPreflightError(null);
    try {
      const response = await fetch("/api/order-preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          asset,
          exposureUsd: exposure,
          budgetUsd: budget,
          downsideMoveBps: String(dropPercent * 100),
          horizonSeconds: String(horizonSeconds),
          maxMarkets: "1",
        }),
      });
      const body = (await response.json()) as OrderPreflight | { error?: string };
      if (!response.ok || !("legs" in body)) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "The unsigned order review could not be built.",
        );
      }
      setPreflight({ ...body, intentKey });
    } catch (requestError) {
      setPreflight(null);
      setPreflightError({
        intentKey,
        message:
          requestError instanceof Error
            ? requestError.message
            : "The unsigned order review is unavailable.",
      });
    } finally {
      setPreflightPending(false);
    }
  }

  async function submitReviewedPilot() {
    if (!activePreflight || !provider || !account) return;
    setExecutionPending(true);
    setExecution({
      fingerprint: activePreflight.fingerprint,
      message: "Preparing the first wallet confirmation…",
    });
    try {
      const completed = await runReviewedPilot(
        provider,
        activePreflight,
        account,
        ({ index, total, phase, call, hash }) => {
          const step = `${index + 1}/${total} ${call.kind.toLowerCase()}`;
          const message =
            phase === "AWAITING_SIGNATURE"
              ? `${step}: waiting for your wallet confirmation.`
              : phase === "MINING"
                ? `${step}: submitted ${shortId(hash ?? "")}; waiting for the receipt.`
                : `${step}: receipt verified.`;
          setExecution({
            fingerprint: activePreflight.fingerprint,
            message,
          });
        },
      );
      setExecution({
        fingerprint: activePreflight.fingerprint,
        message: "Receipts verified. Reconciling the fill and position index…",
        completed,
      });
      const since = Math.floor(
        new Date(activePreflight.generatedAt).getTime() / 1_000,
      ) - 15;
      let reconciliation: ExecutionReconciliation | undefined;
      try {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const query = new URLSearchParams({
            account,
            marketId: activePreflight.legs[0].marketId,
            since: String(since),
          });
          const response = await fetch(`/api/execution-reconciliation?${query}`, {
            cache: "no-store",
          });
          const body = (await response.json()) as
            | ExecutionReconciliation
            | { error?: string };
          if (!response.ok || !("fills" in body)) {
            throw new Error(
              "error" in body && body.error
                ? body.error
                : "reconciliation failed",
            );
          }
          reconciliation = body;
          if (body.fills.length > 0 || body.positions.length > 0) break;
          if (attempt < 4) {
            await new Promise((resolve) => window.setTimeout(resolve, 1_500));
          }
        }
      } catch (reconciliationError) {
        setExecution({
          fingerprint: activePreflight.fingerprint,
          message: `Every call was confirmed, but indexer reconciliation is still pending: ${reconciliationError instanceof Error ? reconciliationError.message : "unknown error"}`,
          completed,
        });
        return;
      }
      setExecution({
        fingerprint: activePreflight.fingerprint,
        message: reconciliation?.fills.length
          ? "Every call was confirmed and the resulting fill was reconciled."
          : "Every call was confirmed. No fill is indexed yet; the IOC may have cancelled unfilled.",
        completed,
        reconciliation,
      });
    } catch (executionError) {
      const message =
        executionError instanceof Error
          ? executionError.message
          : typeof executionError === "object" && executionError !== null && "message" in executionError
            ? String((executionError as { message: unknown }).message)
            : "The wallet execution did not complete.";
      setExecution({
        fingerprint: activePreflight.fingerprint,
        message,
        error: true,
      });
    } finally {
      setExecutionPending(false);
    }
  }

  const plan = snapshot?.plan;
  const quoteDecimals = snapshot?.quoteDecimals ?? 6;
  const coveragePercent = plan ? Number(BigInt(plan.coverageBps)) / 100 : 0;
  const activePreflight = preflight?.intentKey === intentKey ? preflight : null;
  const activePreflightError =
    preflightError?.intentKey === intentKey ? preflightError.message : null;
  const activeExecution =
    execution?.fingerprint === activePreflight?.fingerprint ? execution : null;
  const pilotCostIsSafe = activePreflight
    ? BigInt(activePreflight.plan.totalMaximumCostRaw) <= PILOT_MAXIMUM_COST_RAW
    : false;
  const reviewAcknowledged =
    acknowledgedFingerprint === activePreflight?.fingerprint;

  return (
    <section className="planner-section" aria-labelledby="planner-title">
      <div className="section-intro">
        <div>
          <p className="eyebrow">Protection planner / 02</p>
          <h2 id="planner-title">Configure the guardrail.</h2>
        </div>
        <p>Live, depth-aware estimates. No wallet signature and no transaction.</p>
      </div>

      <div className="planner-frame">
        <form className="planner-controls" onSubmit={(event) => event.preventDefault()}>
          <fieldset className="segmented-control">
            <legend>Asset held</legend>
            <div>
              {(["BTC", "ETH"] as const).map((option) => (
                <button
                  aria-pressed={asset === option}
                  className={asset === option ? "active" : ""}
                  key={option}
                  onClick={() => setAsset(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="field-label" htmlFor={exposureId}>
            <span>Portfolio exposure</span>
            <span className="line-input"><b>$</b><input id={exposureId} inputMode="decimal" min="1" onChange={(event) => setExposure(event.target.value)} type="number" value={exposure} /></span>
          </label>

          <label className="field-label" htmlFor={budgetId}>
            <span>Maximum spend</span>
            <span className="line-input"><b>$</b><input id={budgetId} inputMode="decimal" min="0.01" onChange={(event) => setBudget(event.target.value)} step="0.01" type="number" value={budget} /></span>
          </label>

          <label className="field-label" htmlFor={downsideId}>
            <span>Loss scenario</span>
            <span className="range-control"><input id={downsideId} max="25" min="1" onChange={(event) => setDropPercent(Number(event.target.value))} type="range" value={dropPercent} /><b>{dropPercent}%</b></span>
          </label>

          <fieldset className="horizon-control">
            <legend>Protection horizon</legend>
            <div>
              {HORIZONS.map((horizon) => (
                <button
                  aria-pressed={horizonSeconds === horizon.seconds}
                  className={horizonSeconds === horizon.seconds ? "active" : ""}
                  key={horizon.seconds}
                  onClick={() => setHorizonSeconds(horizon.seconds)}
                  type="button"
                >
                  {horizon.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="execution-lock"><span aria-hidden="true">⌁</span><span><strong>Read-only planning</strong><span>No funds move from this screen.</span></span></div>
        </form>

        <div className="plan-output" aria-busy={loadState === "loading"} aria-live="polite">
          {loadState === "loading" ? (
            <div className="plan-message"><span className="loading-mark" /><p>Checking eligible windows, chain state, and executable depth…</p></div>
          ) : loadState === "error" ? (
            <div className="plan-message error"><strong>Plan unavailable</strong><p>{error}</p></div>
          ) : plan && snapshot ? (
            <>
              <div className="plan-headline">
                <div>
                  <p>{asset} · {HORIZONS.find((item) => item.seconds === horizonSeconds)?.label} requested</p>
                  <h3><span>{coveragePercent}%</span> of the modeled loss is offset.</h3>
                </div>
                <span className="verified-label"><i /> Chain verified</span>
              </div>

              <div className="plan-metrics">
                <div><span>Maximum cost</span><strong>{formatUsd(plan.totalMaximumCostRaw, quoteDecimals)}</strong></div>
                <div className="protected-metric"><span>Net protection</span><strong>{formatUsd(plan.netWinningProtectionRaw, quoteDecimals)}</strong></div>
                <div className="loss-metric"><span>Residual loss</span><strong>{formatUsd(plan.residualScenarioLossRaw, quoteDecimals)}</strong></div>
              </div>

              <div className="scenario-bar" aria-label={`${coveragePercent}% of modeled loss offset`}>
                <span style={{ width: `${Math.min(100, coveragePercent)}%` }} />
              </div>
              <div className="scenario-legend"><span>Modeled loss {formatUsd(plan.scenarioPortfolioLossRaw, quoteDecimals)}</span><span>Budget left {formatUsd(plan.budgetRemainingRaw, quoteDecimals)}</span></div>

              <div className="plan-legs">
                <div className="legs-heading"><h4>Protection legs</h4><span>{plan.legs.length} executable {plan.legs.length === 1 ? "window" : "windows"}</span></div>
                {plan.legs.length ? plan.legs.map((leg, index) => (
                  <article className="plan-leg" key={leg.marketId}>
                    <span className="leg-number">{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{formatWindow(leg.intervalSeconds)} DOWN</strong><span>Expires {formatExpiry(leg.expiryUnixSeconds)}</span></div>
                    <div><strong>{formatProbability(leg.limitPriceRaw, quoteDecimals)}</strong><span>Limit price</span></div>
                    <div><strong>{formatUsd(leg.maximumCostRaw, quoteDecimals)}</strong><span>Max cost</span></div>
                    <code title={leg.marketId}>{shortId(leg.marketId)}</code>
                  </article>
                )) : (
                  <p className="no-legs">No eligible on-book liquidity covers this horizon within the selected budget.</p>
                )}
              </div>

              {plan.warnings.length > 0 && <p className="plan-warning">{plan.warnings.join(" ")}</p>}
              <p className="verification-note">{snapshot.chainVerifiedCandidateCount} candidate windows verified on Shannon · refreshed {new Date(snapshot.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>

              <div className="order-review">
                <div>
                  <p className="eyebrow">Manual execution gate</p>
                  <h4>Inspect the exact order calls.</h4>
                  <p>{!account ? "Connect a wallet to bind the review to your address." : chainId !== "0xc488" ? "Switch the connected wallet to Shannon first." : "This regenerates one closest-window pilot leg and encodes unsigned calls. Your wallet will not open."}</p>
                </div>
                <button disabled={!account || chainId !== "0xc488" || preflightPending || plan.legs.length === 0} onClick={() => void buildOrderReview()} type="button">
                  {preflightPending ? "Building review…" : "Build unsigned review"}
                </button>
              </div>

              {activePreflightError && <p className="preflight-error" role="alert">{activePreflightError}</p>}
              {activePreflight && (
                <div className="preflight-result">
                  <div className="preflight-heading">
                    <div><span>Unsigned review ready</span><strong>{activePreflight.legs.reduce((total, leg) => total + leg.calls.length, 0)} calls · {activePreflight.legs.length} legs</strong></div>
                    <code title={activePreflight.fingerprint}>{shortId(activePreflight.fingerprint)}</code>
                  </div>
                  {activePreflight.legs.flatMap((leg, legIndex) =>
                    leg.calls.map((call, callIndex) => (
                      <details key={`${leg.marketId}-${call.kind}-${callIndex}`}>
                        <summary><span>{String(legIndex + 1).padStart(2, "0")}.{callIndex + 1} {call.kind}</span><code>{shortId(call.to)}</code></summary>
                        <p>{call.description}</p>
                        <dl><dt>Target</dt><dd><code>{call.to}</code></dd><dt>Value</dt><dd><code>{call.value} wei</code></dd><dt>Calldata</dt><dd><code>{call.data}</code></dd></dl>
                      </details>
                    )),
                  )}
                  <p className="preflight-expiry">Review expires {new Date(activePreflight.legs[0]?.validUntil ?? activePreflight.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}. No transaction was sent.</p>

                  <div className="pilot-gate">
                    <div>
                      <span>Tiny Shannon pilot</span>
                      <strong>{formatUsd(activePreflight.plan.totalMaximumCostRaw, activePreflight.quoteDecimals)} maximum collateral · one IOC leg</strong>
                      {!pilotCostIsSafe && <p>Lower “Maximum spend” to $2.00 or less, then build a fresh review.</p>}
                    </div>
                    <label>
                      <input
                        checked={reviewAcknowledged}
                        disabled={!pilotCostIsSafe || executionPending}
                        onChange={(event) => setAcknowledgedFingerprint(event.target.checked ? activePreflight.fingerprint : null)}
                        type="checkbox"
                      />
                      <span>I reviewed this fingerprint and authorize these testnet calls.</span>
                    </label>
                    <button
                      className="execute-pilot"
                      disabled={!pilotCostIsSafe || !reviewAcknowledged || executionPending || !provider}
                      onClick={() => void submitReviewedPilot()}
                      type="button"
                    >
                      {executionPending ? "Wallet flow active…" : "Submit reviewed pilot"}
                    </button>
                    <p className="pilot-warning">This button opens your wallet. Each call still requires your confirmation; Downrail cannot sign for you.</p>
                  </div>

                  {activeExecution && (
                    <div className={`execution-status${activeExecution.error ? " error" : ""}`} role="status">
                      <strong>{activeExecution.completed ? "Pilot confirmed" : activeExecution.error ? "Pilot stopped" : "Execution in progress"}</strong>
                      <p>{activeExecution.message}</p>
                      {activeExecution.completed && (
                        <>
                          <div>{activeExecution.completed.map((item) => (
                            <a href={`https://shannon-explorer.somnia.network/tx/${item.hash}`} key={item.hash} rel="noreferrer" target="_blank">{item.call.kind} · {shortId(item.hash)} ↗</a>
                          ))}</div>
                          {activeExecution.reconciliation && (
                            <dl className="reconciliation-summary">
                              <div><dt>Indexed fills</dt><dd>{activeExecution.reconciliation.fills.length}</dd></div>
                              <div><dt>NO balance</dt><dd>{formatRaw(activeExecution.reconciliation.positions.find((position) => position.outcome === "NO")?.balanceRaw ?? "0", activeExecution.reconciliation.positions[0]?.quoteDecimals ?? activePreflight.quoteDecimals, 3)}</dd></div>
                              <div><dt>Resting orders</dt><dd>{activeExecution.reconciliation.openOrders.length}</dd></div>
                            </dl>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
