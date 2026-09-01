"use client";

import { useEffect, useId, useState } from "react";
import { encodeFunctionData } from "viem";

import { useWalletSession } from "@/components/wallet-session";
import {
  PILOT_MAXIMUM_COST_RAW,
  runReviewedPilot,
  type ExecutedReviewedCall,
} from "@/features/execution/run-reviewed-calls";
import {
  orderReviewSchema,
  type OrderReview,
} from "@/features/execution/review-schema";
import {
  validateReviewedOrder,
  type DecodedReviewedCall,
} from "@/features/execution/validate-reviewed-order";
import {
  executionJournalId,
  readExecutionJournal,
  saveReviewedExecution,
  updateExecutionJournal,
  type ExecutionJournalRecord,
} from "@/features/execution/journal";
import type { LiveHedgePlanSnapshot } from "@/lib/dreamdex/hedge-plan-snapshot";
import { buildManualRolloverRecommendation } from "@/features/rollover/build-recommendation";

const HORIZONS = [
  { label: "15m", seconds: 15 * 60 },
  { label: "1h", seconds: 60 * 60 },
  { label: "4h", seconds: 4 * 60 * 60 },
  { label: "24h", seconds: 24 * 60 * 60 },
] as const;

const EXECUTION_ENABLED =
  process.env.NEXT_PUBLIC_EXECUTION_ENABLED === "true";
const TEST_COLLATERAL = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E" as const;
const TEST_COLLATERAL_FAUCET_ABI = [{
  type: "function",
  name: "faucet",
  stateMutability: "nonpayable",
  inputs: [{ name: "amount", type: "uint256" }],
  outputs: [],
}] as const;

type LoadState = "loading" | "ready" | "error";
type PlannerMode = "demo" | "testnet";

type DemoReview = {
  generatedAt: string;
  marketQuestion: string;
  marketWindow: string;
  maximumCost: string;
  conditionalPayout: string;
  fingerprint: string;
};

type StoredOrderPreflight = OrderReview & {
  intentKey: string;
  decodedCalls: DecodedReviewedCall[];
};
type StoredPreflightError = { intentKey: string; message: string };
type ExecutionProgress = {
  fingerprint: string;
  message: string;
  completed?: ExecutedReviewedCall[];
  reconciliation?: ExecutionReconciliation;
  error?: boolean;
};

type ExecutionReconciliation = {
  onchain: {
    status: string;
    finalized: boolean;
    isResolved: boolean;
    isVoided: boolean;
    expiryUnixSeconds: number;
  };
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
  orders: Array<{
    status: string;
    fullQuantityRaw: string;
    filledQuantityRaw: string;
    quantityRemainingRaw: string;
    placedTxHash: string;
  }>;
  openOrders: Array<unknown>;
};

function statusFromReconciliation(
  result: ExecutionReconciliation,
): ExecutionJournalRecord["status"] {
  if (result.onchain.finalized) return "FINALIZED";
  if (result.onchain.isResolved) return "RESOLVED";
  if (result.fills.length > 0) {
    const order = result.orders[0];
    if (order && BigInt(order.filledQuantityRaw) < BigInt(order.fullQuantityRaw)) {
      return "PARTIALLY_FILLED";
    }
    return "FILLED";
  }
  const order = result.orders[0];
  if (order?.status === "Cancelled") return "CANCELLED_IOC";
  if (order?.status === "Expired") return "EXPIRED";
  if (order?.status === "Open" || result.openOrders.length > 0) return "RESTING";
  return "INDEXING_PENDING";
}

async function fetchExecutionReconciliation(input: {
  account: string;
  marketId: string;
  reviewedAt: string;
  orderTxHash?: string;
}) {
  const query = new URLSearchParams({
    account: input.account,
    marketId: input.marketId,
    since: String(Math.floor(new Date(input.reviewedAt).getTime() / 1_000) - 15),
  });
  if (input.orderTxHash) query.set("orderTxHash", input.orderTxHash);
  const response = await fetch(`/api/execution-reconciliation?${query}`, {
    cache: "no-store",
  });
  const body = (await response.json()) as
    | ExecutionReconciliation
    | { error?: string };
  if (!response.ok || !("fills" in body)) {
    throw new Error(
      "error" in body && body.error ? body.error : "reconciliation failed",
    );
  }
  return body;
}

function toOrderReview(stored: StoredOrderPreflight): OrderReview {
  return orderReviewSchema.parse({
    schemaVersion: stored.schemaVersion,
    mode: stored.mode,
    account: stored.account,
    chainId: stored.chainId,
    quoteDecimals: stored.quoteDecimals,
    generatedAt: stored.generatedAt,
    fingerprint: stored.fingerprint,
    plan: stored.plan,
    legs: stored.legs,
    warnings: stored.warnings,
  });
}

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

function formatSignedUsd(raw: string, decimals: number) {
  const value = BigInt(raw);
  if (value === 0n) return "$0.00";
  const sign = value > 0n ? "+" : "−";
  return `${sign}$${formatRaw((value < 0n ? -value : value).toString(), decimals, 2)}`;
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

function formatJournalStatus(status: ExecutionJournalRecord["status"]) {
  return status.toLowerCase().replaceAll("_", " ");
}

export function HedgePreview() {
  const { account, chainId, provider } = useWalletSession();
  const exposureId = useId();
  const budgetId = useId();
  const downsideId = useId();
  const [asset, setAsset] = useState<"BTC" | "ETH">("ETH");
  const [mode, setMode] = useState<PlannerMode>("demo");
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
  const [demoReview, setDemoReview] = useState<DemoReview | null>(null);
  const [faucetPending, setFaucetPending] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);
  const [acknowledgedFingerprint, setAcknowledgedFingerprint] = useState<string | null>(null);
  const [execution, setExecution] = useState<ExecutionProgress | null>(null);
  const [executionPending, setExecutionPending] = useState(false);
  const [journalRecords, setJournalRecords] = useState<ExecutionJournalRecord[]>([]);
  const [recheckingJournalId, setRecheckingJournalId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const intentKey = [account, chainId, mode, asset, exposure, budget, dropPercent, horizonSeconds].join(":");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setJournalRecords(readExecutionJournal(window.localStorage));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
  }, [asset, budget, dropPercent, exposure, horizonSeconds, refreshNonce]);

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
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof body === "object" && body !== null && "error" in body
            ? String(body.error)
            : "The unsigned order review could not be built.",
        );
      }
      const review = orderReviewSchema.parse(body);
      const decodedCalls = validateReviewedOrder(review);
      setPreflight({ ...review, intentKey, decodedCalls });
      setJournalRecords(saveReviewedExecution(window.localStorage, review));
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

  function buildDemoReview() {
    if (!plan?.legs.length) return;
    const leg = plan.legs[0];
    setDemoReview({
      generatedAt: new Date().toISOString(),
      marketQuestion: leg.question,
      marketWindow: formatWindow(leg.intervalSeconds),
      maximumCost: formatUsd(leg.maximumCostRaw, quoteDecimals),
      conditionalPayout: formatUsd(plan.conditionalNetPayoutRaw, quoteDecimals),
      fingerprint: `demo-${asset.toLowerCase()}-${leg.marketId.slice(-8)}-${horizonSeconds}`,
    });
  }

  async function requestTestCollateral() {
    if (!provider || !account || chainId !== "0xc488") return;
    setFaucetPending(true);
    setFaucetMessage(null);
    try {
      const data = encodeFunctionData({
        abi: TEST_COLLATERAL_FAUCET_ABI,
        functionName: "faucet",
        args: [100n * 10n ** 6n],
      });
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: TEST_COLLATERAL, data, value: "0x0" }],
      });
      setFaucetMessage(`Faucet request submitted: ${String(hash).slice(0, 10)}…`);
    } catch (requestError) {
      setFaucetMessage(requestError instanceof Error ? requestError.message : "The faucet request was cancelled.");
    } finally {
      setFaucetPending(false);
    }
  }

  async function submitReviewedPilot() {
    if (!EXECUTION_ENABLED || !activePreflight || !provider || !account) return;
    const journalId = executionJournalId(activePreflight);
    setExecutionPending(true);
    setExecution({
      fingerprint: activePreflight.fingerprint,
      message: "Preparing the first wallet confirmation…",
    });
    try {
      const review = toOrderReview(activePreflight);
      const completed = await runReviewedPilot(
        provider,
        review,
        account,
        ({ index, total, phase, call, hash, estimatedGas }) => {
          const step = `${index + 1}/${total} ${call.kind.toLowerCase()}`;
          const message =
            phase === "CHECKING_FUNDS"
              ? "Checking collateral and native gas balances…"
              : phase === "SIMULATING"
                ? `${step}: simulating against current chain state.`
                : phase === "AWAITING_SIGNATURE"
              ? `${step}: waiting for your wallet confirmation.`
              : phase === "MINING"
                ? `${step}: submitted ${shortId(hash ?? "")}; waiting for the receipt.`
                : `${step}: receipt verified${estimatedGas ? ` after a ${estimatedGas} gas estimate` : ""}.`;
          setExecution({
            fingerprint: activePreflight.fingerprint,
            message,
          });
          if (phase === "MINING" && hash) {
            setJournalRecords(updateExecutionJournal(
              window.localStorage,
              journalId,
              {
                status: call.kind === "APPROVAL"
                  ? "APPROVAL_SUBMITTED"
                  : "ORDER_SUBMITTED",
                callKind: call.kind,
                hash,
              },
            ));
          }
        },
      );
      for (const completedCall of completed) {
        setJournalRecords(updateExecutionJournal(
          window.localStorage,
          journalId,
          {
            status: completedCall.call.kind === "APPROVAL"
              ? "APPROVAL_CONFIRMED"
              : "ORDER_CONFIRMED",
            callKind: completedCall.call.kind,
            hash: completedCall.hash,
            ...(typeof completedCall.receipt.blockNumber === "string"
              ? { receiptBlock: completedCall.receipt.blockNumber }
              : {}),
          },
        ));
      }
      setExecution({
        fingerprint: activePreflight.fingerprint,
        message: "Receipts verified. Reconciling the fill and position index…",
        completed,
      });
      let reconciliation: ExecutionReconciliation | undefined;
      try {
        const orderTxHash = completed.find((item) => item.call.kind === "ORDER")?.hash;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          reconciliation = await fetchExecutionReconciliation({
            account,
            marketId: activePreflight.legs[0].marketId,
            reviewedAt: activePreflight.generatedAt,
            orderTxHash,
          });
          if (statusFromReconciliation(reconciliation) !== "INDEXING_PENDING") break;
          if (attempt < 7) {
            const delay = Math.min(1_500 * 1.5 ** attempt, 8_000);
            await new Promise((resolve) => window.setTimeout(resolve, delay));
          }
        }
      } catch (reconciliationError) {
        setJournalRecords(updateExecutionJournal(
          window.localStorage,
          journalId,
          { status: "INDEXING_PENDING" },
        ));
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
          : "Every call was confirmed. The journal reflects only what the indexer has proven so far.",
        completed,
        reconciliation,
      });
      setJournalRecords(updateExecutionJournal(
        window.localStorage,
        journalId,
        {
          status: reconciliation
            ? statusFromReconciliation(reconciliation)
            : "INDEXING_PENDING",
        },
      ));
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
      const current = readExecutionJournal(window.localStorage)
        .find((record) => record.id === journalId);
      setJournalRecords(updateExecutionJournal(
        window.localStorage,
        journalId,
        {
          status: current?.calls.some((call) => call.hash)
            ? current.status
            : "FAILED",
          lastError: message,
        },
      ));
    } finally {
      setExecutionPending(false);
    }
  }

  async function recheckJournalRecord(record: ExecutionJournalRecord) {
    setRecheckingJournalId(record.id);
    try {
      const result = await fetchExecutionReconciliation({
        account: record.account,
        marketId: record.marketId,
        reviewedAt: record.reviewedAt,
        orderTxHash: record.calls.find((call) => call.kind === "ORDER")?.hash,
      });
      setJournalRecords(updateExecutionJournal(
        window.localStorage,
        record.id,
        { status: statusFromReconciliation(result) },
      ));
    } catch (recheckError) {
      setJournalRecords(updateExecutionJournal(
        window.localStorage,
        record.id,
        {
          status: record.status,
          lastError: recheckError instanceof Error
            ? recheckError.message
            : "Chain recheck failed",
        },
      ));
    } finally {
      setRecheckingJournalId(null);
    }
  }

  const plan = snapshot?.plan;
  const quoteDecimals = snapshot?.quoteDecimals ?? 6;
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
  const visibleJournalRecords = account
    ? journalRecords
        .filter((record) => record.account.toLowerCase() === account.toLowerCase())
        .slice(0, 5)
    : [];
  const rolloverRecommendations = visibleJournalRecords.flatMap((record) => {
    if (!record.rolloverContext) return [];
    const recommendation = buildManualRolloverRecommendation({
      marketId: record.marketId,
      status: record.status,
      nowUnixSeconds: Math.floor(
        Date.parse(snapshot?.generatedAt ?? record.updatedAt) / 1_000,
      ),
      marketExpiryUnixSeconds: record.rolloverContext.marketExpiryUnixSeconds,
      requestedHorizonEndsAt: record.rolloverContext.requestedHorizonEndsAt,
      futureBudgetReserveRaw: record.rolloverContext.futureBudgetReserveRaw,
    });
    return recommendation ? [{ record, recommendation }] : [];
  });

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
          <fieldset className="segmented-control mode-switch">
            <legend>Experience</legend>
            <div>
              <button aria-pressed={mode === "demo"} className={mode === "demo" ? "active" : ""} onClick={() => setMode("demo")} type="button">Try demo</button>
              <button aria-pressed={mode === "testnet"} className={mode === "testnet" ? "active" : ""} onClick={() => setMode("testnet")} type="button">Testnet</button>
            </div>
          </fieldset>

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

          <div className="execution-lock"><span aria-hidden="true">{mode === "demo" ? "◌" : "⌁"}</span><span><strong>{mode === "demo" ? "Demo mode · no wallet needed" : "Testnet execution"}</strong><span>{mode === "demo" ? "Explore a simulated review with live market data." : "Wallet, STT gas, and TESDC collateral are required."}</span></span></div>
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
                  <h3><span>Conditional payout.</span> Not guaranteed coverage.</h3>
                </div>
                <span className="verified-label"><i /> Chain verified</span>
              </div>

              <div className="plan-metrics">
                <div><span>Current max cost</span><strong>{formatUsd(plan.currentMaximumCostRaw, quoteDecimals)}</strong></div>
                <div className="protected-metric"><span>Net payout if DOWN wins</span><strong>{formatUsd(plan.conditionalNetPayoutRaw, quoteDecimals)}</strong></div>
                <div><span>Reserved for later</span><strong>{formatUsd(plan.futureBudgetReserveRaw, quoteDecimals)}</strong></div>
              </div>

              <div className="outcome-grid" aria-label="Conditional outcome comparison">
                {plan.outcomes.map((outcome) => (
                  <article className={`outcome-card ${outcome.outcome === "DOWN_WINS" ? "win" : "loss"}`} key={outcome.outcome}>
                    <span>{outcome.outcome === "DOWN_WINS" ? "If DOWN resolves YES" : "If DOWN resolves NO"}</span>
                    <strong>{formatSignedUsd(outcome.hedgeNetRaw, quoteDecimals)} hedge result</strong>
                    <p>{formatSignedUsd(outcome.combinedScenarioChangeRaw, quoteDecimals)} combined with the selected loss scenario</p>
                  </article>
                ))}
              </div>
              <div className="scenario-legend"><span>User-modeled portfolio loss {formatUsd(plan.modeledPortfolioLossRaw, quoteDecimals)}</span><span>Current allocation left {formatUsd(plan.budgetRemainingRaw, quoteDecimals)}</span></div>

              <div className="plan-legs">
                <div className="legs-heading"><h4>Current executable leg</h4><span>{plan.legs.length ? "one reviewed window" : "no executable window"}</span></div>
                {plan.legs.length ? plan.legs.map((leg, index) => (
                  <article className="plan-leg" key={leg.marketId}>
                    <span className="leg-number">{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{formatWindow(leg.intervalSeconds)} DOWN</strong><span>{leg.question}</span><span>Expires {formatExpiry(leg.expiryUnixSeconds)}</span></div>
                    <div><strong>{formatProbability(leg.limitPriceRaw, quoteDecimals)}</strong><span>Limit price</span></div>
                    <div><strong>{formatUsd(leg.maximumCostRaw, quoteDecimals)}</strong><span>Max cost</span></div>
                    <code title={leg.marketId}>{shortId(leg.marketId)}</code>
                  </article>
                )) : (
                  <p className="no-legs">No current market can produce an executable order within this allocation.</p>
                )}
              </div>

              {plan.rolloverCheckpoints.length > 0 && (
                <div className="rollover-timeline">
                  <div className="legs-heading"><h4>Future rollover checkpoints</h4><span>fresh review required each time</span></div>
                  {plan.rolloverCheckpoints.map((checkpoint) => (
                    <div key={checkpoint.sequence}>
                      <span>{String(checkpoint.sequence).padStart(2, "0")}</span>
                      <p><strong>{formatExpiry(checkpoint.startsAt)} → {formatExpiry(checkpoint.targetEndsAt)}</strong><small>Future market not selected yet</small></p>
                      <b>{formatUsd(checkpoint.estimatedBudgetRaw, quoteDecimals)} reserved</b>
                    </div>
                  ))}
                </div>
              )}

              {plan.warnings.length > 0 && <p className="plan-warning">{plan.warnings.join(" ")}</p>}
              <p className="verification-note">{snapshot.chainVerifiedCandidateCount} candidate windows verified on Shannon · refreshed {new Date(snapshot.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>

              {mode === "demo" ? (
                <div className="demo-review">
                  <div>
                    <p className="eyebrow">Instant walkthrough</p>
                    <h4>See the protection flow without funding a wallet.</h4>
                    <p>We use the live market snapshot above to create a simulated review. Nothing is signed, submitted, or written on-chain.</p>
                  </div>
                  <button onClick={buildDemoReview} type="button">{demoReview ? "Refresh demo review" : "Build demo review"}</button>
                </div>
              ) : (
              <>
              <div className="testnet-faucet">
                <div>
                  <p className="eyebrow">Testnet setup</p>
                  <h4>Need collateral? Request 100 TESDC.</h4>
                  <p>{!account ? "Connect a wallet first." : chainId !== "0xc488" ? "Switch to Somnia Shannon first." : "The faucet call is testnet-only and requires your wallet to confirm a small STT gas payment."}</p>
                </div>
                <button disabled={!account || chainId !== "0xc488" || faucetPending} onClick={() => void requestTestCollateral()} type="button">
                  {faucetPending ? "Waiting for wallet…" : "Request test collateral"}
                </button>
                {faucetMessage && <p className="faucet-message" role="status">{faucetMessage}</p>}
              </div>
              <div className="order-review">
                <div>
                  <p className="eyebrow">Testnet execution gate</p>
                  <h4>Inspect the exact order calls.</h4>
                  <p>{!account ? "Connect a wallet to bind the review to your address." : chainId !== "0xc488" ? "Switch the connected wallet to Shannon first." : "This regenerates one closest-window pilot leg and encodes unsigned calls. Your wallet will not open."}</p>
                </div>
                <button disabled={!account || chainId !== "0xc488" || preflightPending || plan.legs.length === 0} onClick={() => void buildOrderReview()} type="button">
                  {preflightPending ? "Building review…" : "Build unsigned review"}
                </button>
              </div>
              </>
              )}

              {mode === "demo" && demoReview && (
                <div className="preflight-result demo-result">
                  <div className="preflight-heading">
                    <div><span>Simulated review ready</span><strong>{demoReview.marketWindow} DOWN · live market snapshot</strong></div>
                    <code>{shortId(demoReview.fingerprint)}</code>
                  </div>
                  <div className="demo-result-grid">
                    <div><span>Market</span><strong>{demoReview.marketQuestion}</strong></div>
                    <div><span>Simulated maximum cost</span><strong>{demoReview.maximumCost}</strong></div>
                    <div><span>Conditional net payout</span><strong>{demoReview.conditionalPayout}</strong></div>
                  </div>
                  <p className="preflight-expiry">Generated {new Date(demoReview.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Demo only — no wallet or transaction required.</p>
                  <button className="text-action demo-switch" onClick={() => setMode("testnet")} type="button">Ready to use a funded wallet? Switch to Testnet ↗</button>
                </div>
              )}

              {mode === "testnet" && activePreflightError && <p className="preflight-error" role="alert">{activePreflightError}</p>}
              {mode === "testnet" && activePreflight && (
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
                        <p>{activePreflight.decodedCalls[callIndex]?.summary}</p>
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
                      disabled={!EXECUTION_ENABLED || !pilotCostIsSafe || !reviewAcknowledged || executionPending || !provider}
                      onClick={() => void submitReviewedPilot()}
                      type="button"
                    >
                      {!EXECUTION_ENABLED
                        ? "Signing locked by production flag"
                        : executionPending
                          ? "Wallet flow active…"
                          : "Submit reviewed pilot"}
                    </button>
                    <p className="pilot-warning">
                      {EXECUTION_ENABLED
                        ? "Shannon testnet only. This opens your wallet; each call still requires your confirmation, and Downrail cannot sign for you."
                        : "Wallet submission is currently disabled. Testnet execution can be enabled for this deployment."}
                    </p>
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
      {visibleJournalRecords.length > 0 && (
        <section className="execution-journal" aria-labelledby="execution-journal-title">
          <div className="legs-heading">
            <h3 id="execution-journal-title">Recovered execution activity</h3>
            <span>device-local pointers · chain remains authoritative</span>
          </div>
          {visibleJournalRecords.map((record) => (
            <article key={record.id}>
              <div>
                <strong>{formatJournalStatus(record.status)}</strong>
                <span>{shortId(record.marketId)} · updated {new Date(record.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div>
                {record.calls.flatMap((call) => call.hash ? [(
                  <a href={`https://shannon-explorer.somnia.network/tx/${call.hash}`} key={call.hash} rel="noreferrer" target="_blank">
                    {call.kind} {shortId(call.hash)} ↗
                  </a>
                )] : [])}
                <button
                  disabled={recheckingJournalId === record.id}
                  onClick={() => void recheckJournalRecord(record)}
                  type="button"
                >
                  {recheckingJournalId === record.id ? "Rechecking…" : "Recheck on chain"}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {rolloverRecommendations.length > 0 && (
        <section className="rollover-queue" aria-labelledby="rollover-queue-title">
          <div>
            <p className="eyebrow">Manual rollover queue / 05</p>
            <h3 id="rollover-queue-title">A fresh market review is ready.</h3>
            <p>No automatic order is created. Refreshing reruns discovery, depth, and all planner checks.</p>
          </div>
          {rolloverRecommendations.map(({ record, recommendation }) => (
            <article key={recommendation.dedupeKey}>
              <span>{recommendation.trigger.toLowerCase().replaceAll("_", " ")}</span>
              <strong>{Math.ceil(recommendation.remainingHorizonSeconds / 60)} minutes remain</strong>
              <p>{formatUsd(recommendation.budgetRaw, record.rolloverContext?.quoteDecimals ?? 6)} reserved · prior market {shortId(record.marketId)}</p>
            </article>
          ))}
          <button onClick={() => setRefreshNonce((value) => value + 1)} type="button">
            Refresh recommendation
          </button>
        </section>
      )}
    </section>
  );
}
