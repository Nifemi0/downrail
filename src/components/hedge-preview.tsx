"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, CircleAlert, CircleX, FlaskConical, Network, Settings2, ShieldCheck } from "lucide-react";
import { decodeFunctionResult, encodeFunctionData, formatEther, type Hex } from "viem";

import { useWalletSession } from "@/components/wallet-session";
import {
  PILOT_MAXIMUM_COST_RAW,
  readReviewedAllowance,
  revokeReviewedAllowance,
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
  EXECUTION_JOURNAL_UPDATED_EVENT,
  executionJournalId,
  readExecutionJournal,
  saveReviewedExecution,
  updateExecutionJournal,
  type ExecutionJournalRecord,
} from "@/features/execution/journal";
import type { LiveHedgePlanSnapshot } from "@/lib/dreamdex/hedge-plan-snapshot";
import { evaluateRouteDecision, type RouteDecision } from "@/features/hedge-planner/route-decision";
import { buildManualRolloverRecommendation } from "@/features/rollover/build-recommendation";
import { executionReviewWasUsed, startReviewedExecution } from "@/features/execution/journal";
import { useLiveClock } from "@/lib/use-live-clock";

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
const ERC20_BALANCE_ABI = [{
  type: "function",
  name: "balanceOf",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "balance", type: "uint256" }],
}] as const;

type LoadState = "loading" | "ready" | "error";
type PlannerMode = "demo" | "testnet";

type DemoReview = {
  intentKey: string;
  snapshotGeneratedAt: string;
  generatedAt: string;
  marketQuestion: string;
  marketWindow: string;
  maximumCost: string;
  grossPayout: string;
  conditionalPayout: string;
  qualityVerdict: LiveHedgePlanSnapshot["plan"]["quality"]["verdict"];
  qualityCoverage: string;
  qualityEfficiency: string;
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
type ApprovalCleanupState = {
  fingerprint: string;
  allowanceRaw: string | null;
  pending: boolean;
  message: string;
  hash?: string;
};
type WalletReadiness = {
  stt: string;
  tesdc: string;
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

async function verifyLiveExecutionReview(review: OrderReview) {
  const response = await fetch("/api/order-execution-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review }),
  });
  const body = (await response.json()) as {
    error?: string;
    verified?: boolean;
    fingerprint?: string;
  };
  if (
    !response.ok
    || body.verified !== true
    || body.fingerprint?.toLowerCase() !== review.fingerprint.toLowerCase()
  ) {
    throw new Error(body.error ?? "Live DreamDEX bindings could not be verified.");
  }
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

function formatBasisPoints(value: number) {
  const percentage = value / 100;
  return `${Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%`;
}

function qualityLabel(verdict: LiveHedgePlanSnapshot["plan"]["quality"]["verdict"]) {
  switch (verdict) {
    case "TARGET_MET": return "Offset target met";
    case "PARTIAL_OFFSET": return "Partial offset";
    case "OVERSIZED": return "Payout exceeds scenario";
    case "UNAVAILABLE": return "No route available";
  }
}

function decisionLabel(decision: RouteDecision) {
  if (decision.status === "REVIEW") return "Worth reviewing";
  if (decision.status === "UNAVAILABLE") return "No route available";
  return "Skip this route";
}

function decisionMessage(decision: RouteDecision) {
  switch (decision.reason) {
    case "worth_reviewing":
      return "This route reaches your loss-offset target and its possible net gain is at least the premium at risk. Read the trigger before continuing.";
    case "below_offset_target":
      return "Even if this contract wins, it does not offset the minimum share of loss you asked for. Downrail will not open wallet review.";
    case "weak_return_for_cost":
      return "The possible net gain is smaller than the amount placed at risk. Downrail will not open wallet review.";
    case "oversized_for_scenario":
      return "The fixed payout is too large for the loss scenario you entered. Adjust the plan before continuing.";
    case "no_executable_route":
      return "No live DreamDEX route has enough time and executable depth right now.";
  }
}

function downTrigger(asset: "BTC" | "ETH", expiryUnixSeconds: number) {
  return `Pays if ${asset} closes below this window's opening price by ${formatExpiry(expiryUnixSeconds)}.`;
}

function scenarioResult(raw: string, decimals: number) {
  const value = BigInt(raw);
  return value < 0n
    ? `${formatUsd((-value).toString(), decimals)} modeled loss remains`
    : `${formatUsd(value.toString(), decimals)} above the modeled loss`;
}

function closestSupportedHorizon(seconds: number) {
  return HORIZONS.reduce((closest, horizon) =>
    Math.abs(horizon.seconds - seconds) < Math.abs(closest.seconds - seconds)
      ? horizon
      : closest,
  ).seconds;
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
  const nowUnixSeconds = useLiveClock();
  const executionInFlight = useRef(false);
  const refreshedExpiredSnapshot = useRef<string | null>(null);
  const { account, chainId, provider } = useWalletSession();
  const exposureId = useId();
  const budgetId = useId();
  const downsideId = useId();
  const targetCoverageId = useId();
  const rolloverReserveId = useId();
  const [asset, setAsset] = useState<"BTC" | "ETH">("ETH");
  const [mode, setMode] = useState<PlannerMode>("demo");
  const [exposure, setExposure] = useState("2000");
  const [budget, setBudget] = useState("10");
  const [dropPercent, setDropPercent] = useState(2);
  const [targetCoveragePercent, setTargetCoveragePercent] = useState(25);
  const [rolloverReservePercent, setRolloverReservePercent] = useState(0);
  const [horizonSeconds, setHorizonSeconds] = useState(15 * 60);
  const [snapshot, setSnapshot] = useState<LiveHedgePlanSnapshot | null>(null);
  const [snapshotRequestKey, setSnapshotRequestKey] = useState<string | null>(null);
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
  const [approvalCleanup, setApprovalCleanup] = useState<ApprovalCleanupState | null>(null);
  const [walletReadiness, setWalletReadiness] = useState<WalletReadiness | null>(null);
  const walletReadinessForUi = mode === "testnet" && provider && account && chainId === "0xc488" ? walletReadiness : null;
  const [journalRecords, setJournalRecords] = useState<ExecutionJournalRecord[]>([]);
  const [recheckingJournalId, setRecheckingJournalId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const planRequestKey = [asset, exposure, budget, dropPercent, targetCoveragePercent, rolloverReservePercent, horizonSeconds].join(":");
  const intentKey = [account, chainId, mode, planRequestKey].join(":");

  useEffect(() => {
    const refreshExecutionJournal = () => {
      setJournalRecords(readExecutionJournal(window.localStorage));
    };
    const frame = window.requestAnimationFrame(refreshExecutionJournal);
    window.addEventListener(
      EXECUTION_JOURNAL_UPDATED_EVENT,
      refreshExecutionJournal,
    );
    window.addEventListener("storage", refreshExecutionJournal);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", refreshExecutionJournal);
      window.removeEventListener(
        EXECUTION_JOURNAL_UPDATED_EVENT,
        refreshExecutionJournal,
      );
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = planRequestKey;
    const timer = window.setTimeout(async () => {
      const exposureNumber = Number(exposure);
      const budgetNumber = Number(budget);
      if (!Number.isFinite(exposureNumber) || exposureNumber <= 0 || !Number.isFinite(budgetNumber) || budgetNumber <= 0) {
        setSnapshot(null);
        setSnapshotRequestKey(requestKey);
        setLoadState("error");
        setError("Enter a positive exposure and protection budget.");
        return;
      }

      const query = new URLSearchParams({
        asset,
        exposureUsd: exposure,
        budgetUsd: budget,
        downsideMoveBps: String(dropPercent * 100),
        targetCoverageBps: String(targetCoveragePercent * 100),
        rolloverReserveBps: String(rolloverReservePercent * 100),
        horizonSeconds: String(horizonSeconds),
        maxMarkets: "3",
      });

      try {
        const response = await fetch(`/api/hedge-plan?${query}`, {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
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
        setSnapshotRequestKey(requestKey);
        setLoadState("ready");
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setSnapshot(null);
        setSnapshotRequestKey(requestKey);
        setLoadState("error");
        setError(requestError instanceof Error ? requestError.message : "The live planner is unavailable.");
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [asset, budget, dropPercent, exposure, horizonSeconds, planRequestKey, refreshNonce, rolloverReservePercent, targetCoveragePercent]);

  useEffect(() => {
    if (!snapshot || snapshotRequestKey !== planRequestKey || !nowUnixSeconds) return;
    const expiry = snapshot.plan.legs[0]?.expiryUnixSeconds;
    if (!expiry || expiry > nowUnixSeconds + 5 * 60) return;
    if (refreshedExpiredSnapshot.current === snapshot.generatedAt) return;

    refreshedExpiredSnapshot.current = snapshot.generatedAt;
    setSnapshot(null);
    setSnapshotRequestKey(null);
    setAcknowledgedFingerprint(null);
    setPreflight(null);
    setRefreshNonce((value) => value + 1);
  }, [nowUnixSeconds, planRequestKey, snapshot, snapshotRequestKey]);

  useEffect(() => {
    if (mode !== "testnet" || !provider || !account || chainId !== "0xc488") {
      return;
    }

    let cancelled = false;
    const data = encodeFunctionData({
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [account as `0x${string}`],
    });

    void Promise.all([
      provider.request({ method: "eth_getBalance", params: [account, "latest"] }),
      provider.request({ method: "eth_call", params: [{ to: TEST_COLLATERAL, data }, "latest"] }),
    ]).then(([nativeRaw, collateralRaw]) => {
      const collateral = decodeFunctionResult({
        abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf",
        data: collateralRaw as Hex,
      });
      if (!cancelled) {
        setWalletReadiness({
          stt: Number(formatEther(BigInt(String(nativeRaw)))).toFixed(3),
          tesdc: formatRaw(collateral.toString(), 6),
        });
      }
    }).catch(() => {
      if (!cancelled) setWalletReadiness(null);
    });

    return () => {
      cancelled = true;
    };
  }, [account, chainId, mode, provider, refreshNonce]);

  async function buildOrderReview() {
    if (!account || chainId !== "0xc488") return;
    setPreflightPending(true);
    setPreflightError(null);
    setApprovalCleanup(null);
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
          targetCoverageBps: String(targetCoveragePercent * 100),
          rolloverReserveBps: String(rolloverReservePercent * 100),
          horizonSeconds: String(horizonSeconds),
          maxMarkets: "3",
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
      intentKey,
      snapshotGeneratedAt: snapshotRequestKey === planRequestKey ? snapshot?.generatedAt ?? "" : "",
      generatedAt: new Date().toISOString(),
      marketQuestion: leg.question,
      marketWindow: formatWindow(leg.intervalSeconds),
      maximumCost: formatUsd(leg.maximumCostRaw, quoteDecimals),
      grossPayout: formatUsd(plan.conditionalGrossPayoutRaw, quoteDecimals),
      conditionalPayout: formatUsd(plan.conditionalNetPayoutRaw, quoteDecimals),
      qualityVerdict: plan.quality.verdict,
      qualityCoverage: formatBasisPoints(plan.quality.coverageBps),
      qualityEfficiency: `${(plan.quality.efficiencyBps / 10_000).toFixed(2)}×`,
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

  async function inspectReviewedAllowance(review: OrderReview) {
    if (!provider) return;
    try {
      const allowance = await readReviewedAllowance(provider, review);
      setApprovalCleanup(allowance > 0n ? {
        fingerprint: review.fingerprint,
        allowanceRaw: allowance.toString(),
        pending: false,
        message: "A collateral allowance remains. You can revoke it with one explicit wallet confirmation.",
      } : null);
    } catch {
      setApprovalCleanup({
        fingerprint: review.fingerprint,
        allowanceRaw: null,
        pending: false,
        message: "The remaining collateral allowance could not be checked. Verify it in your wallet before leaving.",
      });
    }
  }

  async function cleanUpReviewedAllowance() {
    if (!provider || !account || !activePreflight || approvalCleanup?.pending) return;
    const review = toOrderReview(activePreflight);
    setApprovalCleanup({
      fingerprint: review.fingerprint,
      allowanceRaw: approvalCleanup?.allowanceRaw ?? null,
      pending: true,
      message: "Waiting for the wallet to revoke the remaining allowance…",
    });
    try {
      const cleanup = await revokeReviewedAllowance(provider, review, account);
      setApprovalCleanup({
        fingerprint: review.fingerprint,
        allowanceRaw: "0",
        pending: false,
        message: cleanup
          ? "Remaining collateral allowance revoked and receipt confirmed."
          : "No remaining collateral allowance was found.",
        ...(cleanup ? { hash: cleanup.hash } : {}),
      });
    } catch (cleanupError) {
      setApprovalCleanup({
        fingerprint: review.fingerprint,
        allowanceRaw: approvalCleanup?.allowanceRaw ?? null,
        pending: false,
        message: cleanupError instanceof Error
          ? cleanupError.message
          : "Allowance revocation did not complete.",
      });
    }
  }

  async function submitReviewedPilot() {
    if (!EXECUTION_ENABLED || !activePreflight || !provider || !account || !reviewAcknowledged || executionInFlight.current) return;
    executionInFlight.current = true;
    setExecutionPending(true);
    setExecution({
      fingerprint: activePreflight.fingerprint,
      message: "Rechecking the market, venue, pool, collateral, and expiry…",
    });
    try {
      await verifyLiveExecutionReview(toOrderReview(activePreflight));
      // Web Locks serialize the read/reserve step across tabs. Fail closed without them.
      if (!navigator.locks) throw new Error("This browser cannot safely lock an execution. Use a current browser.");
      await navigator.locks.request(`downrail:${executionJournalId(activePreflight)}`, () => {
        setJournalRecords(startReviewedExecution(window.localStorage, activePreflight));
      });
    } catch (reservationError) {
      executionInFlight.current = false;
      setExecutionPending(false);
      setExecution({ fingerprint: activePreflight.fingerprint, error: true, message: reservationError instanceof Error ? reservationError.message : "Could not reserve this review." });
      return;
    }
    const journalId = executionJournalId(activePreflight);
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
      await inspectReviewedAllowance(review);
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
      await inspectReviewedAllowance(toOrderReview(activePreflight));
    } finally {
      executionInFlight.current = false;
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

  const activeSnapshot = snapshotRequestKey === planRequestKey ? snapshot : null;
  const plan = activeSnapshot?.plan;
  const routeDecision = plan ? evaluateRouteDecision({
    hasExecutableLeg: plan.legs.length > 0,
    verdict: plan.quality.verdict,
    efficiencyBps: plan.quality.efficiencyBps,
  }) : null;
  const routeCanOpenWalletReview = routeDecision?.status === "REVIEW";
  const activeLoadState = snapshotRequestKey === planRequestKey ? loadState : "loading";
  const activeDemoReview = demoReview?.intentKey === intentKey && demoReview.snapshotGeneratedAt === activeSnapshot?.generatedAt
    ? demoReview
    : null;
  const quoteDecimals = activeSnapshot?.quoteDecimals ?? 6;
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
  const reviewUsed = activePreflight ? executionReviewWasUsed(journalRecords.find((record) => record.id === executionJournalId(activePreflight))) : false;
  const reviewExpired = activePreflight ? Date.parse(activePreflight.legs[0].validUntil) <= nowUnixSeconds * 1_000 + 10_000 : false;
  const visibleJournalRecords = account
    ? journalRecords
        .filter((record) => record.account.toLowerCase() === account.toLowerCase())
        .slice(0, 5)
    : [];
  const rolloverRecommendations = visibleJournalRecords.flatMap((record) => {
    if (!record.rolloverContext || !nowUnixSeconds) return [];
    const recommendation = buildManualRolloverRecommendation({
      marketId: record.marketId,
      status: record.status,
      nowUnixSeconds,
      marketExpiryUnixSeconds: record.rolloverContext.marketExpiryUnixSeconds,
      requestedHorizonEndsAt: record.rolloverContext.requestedHorizonEndsAt,
      futureBudgetReserveRaw: record.rolloverContext.futureBudgetReserveRaw,
    });
    return recommendation ? [{ record, recommendation }] : [];
  }).filter(({ recommendation }, index, recommendations) =>
    recommendations.findIndex((candidate) =>
      candidate.recommendation.dedupeKey === recommendation.dedupeKey) === index,
  );

  function loadReservedRollover() {
    const next = rolloverRecommendations[0];
    const context = next?.record.rolloverContext;
    if (!next || !context) return;
    setMode("testnet");
    setAsset(context.asset);
    setBudget(formatRaw(next.recommendation.budgetRaw, context.quoteDecimals, context.quoteDecimals));
    setHorizonSeconds(closestSupportedHorizon(next.recommendation.remainingHorizonSeconds));
    setAcknowledgedFingerprint(null);
    setPreflight(null);
    setPreflightError(null);
    setExecution(null);
    setRefreshNonce((value) => value + 1);
  }

  return (
    <section className="planner-section" aria-labelledby="planner-title">
      <div className="section-intro">
        <div>
          <p className="eyebrow">Protection planner</p>
          <h2 id="planner-title">Tell us what you hold.</h2>
        </div>
        <p>Three choices produce a live, depth-aware contract comparison. Nothing is signed.</p>
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
            <span>Value of {asset} you hold</span>
            <span className="line-input"><b>$</b><input id={exposureId} inputMode="decimal" min="1" onChange={(event) => setExposure(event.target.value)} type="number" value={exposure} /></span>
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

          <details className="advanced-settings">
            <summary><Settings2 aria-hidden="true" /><span><strong>Advanced</strong><small>Spending and scenario assumptions</small></span></summary>
            <div className="advanced-settings-grid">
              <label className="field-label" htmlFor={budgetId}>
                <span>Maximum test spend</span>
                <span className="line-input"><b>$</b><input id={budgetId} inputMode="decimal" min="0.01" onChange={(event) => setBudget(event.target.value)} step="0.01" type="number" value={budget} /></span>
                <small>The live pilot cannot exceed $10.00.</small>
              </label>

              <label className="field-label" htmlFor={downsideId}>
                <span>Modeled {asset} fall</span>
                <span className="range-control"><input id={downsideId} max="25" min="1" onChange={(event) => setDropPercent(Number(event.target.value))} type="range" value={dropPercent} /><b>{dropPercent}%</b></span>
              </label>

              <label className="field-label" htmlFor={targetCoverageId}>
                <span>Minimum loss offset</span>
                <span className="range-control"><input id={targetCoverageId} max="100" min="25" onChange={(event) => setTargetCoveragePercent(Number(event.target.value))} step="5" type="range" value={targetCoveragePercent} /><b>{targetCoveragePercent}%</b></span>
                <small>A comparison threshold, not guaranteed protection.</small>
              </label>

              <label className="field-label" htmlFor={rolloverReserveId}>
                <span>Hold for later review</span>
                <span className="range-control"><input id={rolloverReserveId} max="50" min="0" onChange={(event) => setRolloverReservePercent(Number(event.target.value))} step="5" type="range" value={rolloverReservePercent} /><b>{rolloverReservePercent}%</b></span>
                <small>Future markets always require a fresh review.</small>
              </label>
            </div>
          </details>

          <div className="execution-lock"><span className="execution-lock-icon" aria-hidden="true">{mode === "demo" ? <FlaskConical /> : <Network />}</span><span><strong>{mode === "demo" ? "Demo mode · no wallet needed" : "Testnet execution"}</strong><span>{mode === "demo" ? `Live comparison with a $${budget} maximum test spend.` : walletReadinessForUi ? `${walletReadinessForUi.stt} STT gas · ${walletReadinessForUi.tesdc} TESDC available` : "Wallet, STT gas, and TESDC collateral are required."}</span></span></div>
        </form>

        <div className="plan-output" aria-busy={activeLoadState === "loading"} aria-live="polite">
          {activeLoadState === "loading" ? (
            <div className="plan-message"><span className="loading-mark" /><p>Checking eligible windows, chain state, and executable depth…</p></div>
          ) : activeLoadState === "error" ? (
            <div className="plan-message error"><strong>Plan unavailable</strong><p>{error}</p><button className="text-action" type="button" onClick={() => setRefreshNonce((value) => value + 1)}>Retry live plan</button></div>
          ) : plan && activeSnapshot ? (
            <>
              <div className="plan-headline">
                <div>
                  <p>{asset} · {HORIZONS.find((item) => item.seconds === horizonSeconds)?.label} requested</p>
                  <h3><span>See the result.</span> Then decide.</h3>
                </div>
                <span className="verified-label"><i /> Chain verified</span>
              </div>

              {routeDecision && <div className={`quality-gate ${routeDecision.status.toLowerCase()}`} role="status">
                <span className="quality-icon" aria-hidden="true">
                  {routeDecision.status === "REVIEW" ? <ShieldCheck /> : routeDecision.status === "UNAVAILABLE" ? <CircleX /> : <CircleAlert />}
                </span>
                <div>
                  <span>Plain-English verdict</span>
                  <h4>{decisionLabel(routeDecision)}</h4>
                  <p>{decisionMessage(routeDecision)}</p>
                </div>
                <dl>
                  <div><dt>Loss offset if triggered</dt><dd>{formatBasisPoints(plan.quality.coverageBps)}</dd></div>
                  <div><dt>Minimum you asked for</dt><dd>{formatBasisPoints(plan.quality.targetCoverageBps)}</dd></div>
                  <div><dt>Possible net gain / cost</dt><dd>{(plan.quality.efficiencyBps / 10_000).toFixed(2)}×</dd></div>
                </dl>
              </div>}

              {plan.legs[0] && <div className="contract-truth">
                <div>
                  <span>Exact trigger</span>
                  <strong>{downTrigger(asset, plan.legs[0].expiryUnixSeconds)}</strong>
                  <p>DreamDEX lists “{plan.legs[0].question}”. Buying NO is the below-opening-price outcome.</p>
                </div>
                <div className="basis-warning"><CircleAlert aria-hidden="true" /><p><strong>Entry-price gap</strong><span>This contract does not settle against the price where you bought {asset}. Your {asset} can lose value while this NO position also loses.</span></p></div>
              </div>}

              <div className="plan-metrics">
                <div><span>Cost now</span><strong>{formatUsd(plan.currentMaximumCostRaw, quoteDecimals)}</strong></div>
                <div className="protected-metric"><span>Received if triggered</span><strong>{formatUsd(plan.conditionalGrossPayoutRaw, quoteDecimals)}</strong></div>
                <div><span>Possible profit after cost</span><strong>{formatUsd(plan.conditionalNetPayoutRaw, quoteDecimals)}</strong></div>
                <div className="loss-metric"><span>Scenario after payout</span><strong>{scenarioResult(plan.outcomes[0]?.combinedScenarioChangeRaw ?? "0", quoteDecimals)}</strong></div>
              </div>

              <div className="outcome-grid" aria-label="Conditional outcome comparison">
                {plan.outcomes.map((outcome) => (
                  <article className={`outcome-card ${outcome.outcome === "DOWN_WINS" ? "win" : "loss"}`} key={outcome.outcome}>
                    <span>{outcome.outcome === "DOWN_WINS" ? `${asset} closes below the window opening` : `${asset} closes at or above the window opening`}</span>
                    <strong>{outcome.outcome === "DOWN_WINS" ? `You receive ${formatUsd(plan.conditionalGrossPayoutRaw, quoteDecimals)} in test collateral` : "The contract returns $0.00"}</strong>
                    <p>{outcome.outcome === "DOWN_WINS" ? `${formatSignedUsd(outcome.hedgeNetRaw, quoteDecimals)} after cost · ${scenarioResult(outcome.combinedScenarioChangeRaw, quoteDecimals)}.` : `You still own your ${asset}, but the ${formatUsd(plan.currentMaximumCostRaw, quoteDecimals)} contract cost is lost.`}</p>
                  </article>
                ))}
              </div>
              <div className="scenario-legend"><span>Modeled {dropPercent}% fall: {formatUsd(plan.modeledPortfolioLossRaw, quoteDecimals)}</span><span>Payout source: prefunded DreamDEX collateral pool</span></div>

              <div className="plan-legs">
                <div className="legs-heading"><h4>Current executable leg</h4><span>{plan.legs.length ? "one reviewed window" : "no executable window"}</span></div>
                {plan.legs.length ? plan.legs.map((leg) => (
                  <article className="plan-leg" key={leg.marketId}>
                    <div><strong>{downTrigger(asset, leg.expiryUnixSeconds)}</strong><span>Protocol side: NO · {leg.question}</span><span>Expires {formatExpiry(leg.expiryUnixSeconds)}</span></div>
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
                      <p><strong>{formatExpiry(checkpoint.startsAt)} <ArrowRight aria-hidden="true" /> {formatExpiry(checkpoint.targetEndsAt)}</strong><small>Future market not selected yet</small></p>
                      <b>{formatUsd(checkpoint.estimatedBudgetRaw, quoteDecimals)} reserved</b>
                    </div>
                  ))}
                </div>
              )}

              {plan.warnings.length > 0 && <p className="plan-warning">{plan.warnings.join(" ")}</p>}
              <p className="verification-note">{activeSnapshot.chainVerifiedCandidateCount} candidates verified · {plan.selection.evaluatedMarketCount} executable routes compared · selected by lowest combined expiry/window gap, then larger conditional payout · refreshed {new Date(activeSnapshot.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>

              {mode === "demo" ? (
                <div className="demo-review">
                  <div>
                    <p className="eyebrow">Instant walkthrough</p>
                    <h4>See the protection flow without funding a wallet.</h4>
                    <p>We use the live market snapshot above to create a simulated review. Nothing is signed, submitted, or written on-chain.</p>
                  </div>
                  <button disabled={plan.legs.length === 0} onClick={buildDemoReview} type="button">
                    {plan.legs.length === 0 ? "No executable demo route" : activeDemoReview ? "Refresh demo review" : "Build demo review"}
                  </button>
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
                  <h4>{routeCanOpenWalletReview ? "Inspect the exact order calls." : "Adjust the plan before wallet review."}</h4>
                  <p>{!account ? "Connect a wallet to bind the review to your address." : chainId !== "0xc488" ? "Switch the connected wallet to Shannon first." : !routeCanOpenWalletReview ? "Downrail refuses routes that miss your offset target, return too little for the cost, or overshoot the scenario." : "This regenerates the selected executable leg and encodes unsigned calls. Your wallet will not open."}</p>
                </div>
                <button disabled={!account || chainId !== "0xc488" || preflightPending || !routeCanOpenWalletReview} onClick={() => void buildOrderReview()} type="button">
                  {preflightPending ? "Building review…" : routeCanOpenWalletReview ? "Build unsigned review" : "Route blocked"}
                </button>
              </div>
              </>
              )}

              {mode === "demo" && activeDemoReview && (
                <div className="preflight-result demo-result">
                  <div className="preflight-heading">
                    <div><span>Simulated route review</span><strong>{activeDemoReview.marketWindow} · below-opening-price outcome · {qualityLabel(activeDemoReview.qualityVerdict)}</strong></div>
                    <code>{shortId(activeDemoReview.fingerprint)}</code>
                  </div>
                  <div className="demo-result-grid">
                    <div><span>Market</span><strong>{activeDemoReview.marketQuestion}</strong></div>
                    <div><span>Simulated maximum cost</span><strong>{activeDemoReview.maximumCost}</strong></div>
                    <div><span>Received if triggered</span><strong>{activeDemoReview.grossPayout}</strong></div>
                    <div><span>Possible profit after cost</span><strong>{activeDemoReview.conditionalPayout}</strong></div>
                    <div><span>Scenario offset if triggered</span><strong>{activeDemoReview.qualityCoverage}</strong></div>
                    <div><span>Winning net / premium</span><strong>{activeDemoReview.qualityEfficiency}</strong></div>
                  </div>
                  <p className={`demo-result-decision ${activeDemoReview.qualityVerdict.toLowerCase()}`}>
                    This review reports conditional cash flows. It does not predict the outcome or recommend a trade.
                  </p>
                  <p className="preflight-expiry">Generated {new Date(activeDemoReview.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Demo only — no wallet or transaction required.</p>
                  <button className="text-action demo-switch" onClick={() => setMode("testnet")} type="button">Ready to inspect wallet calls? Switch to Testnet <ArrowUpRight aria-hidden="true" /></button>
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
                      {!pilotCostIsSafe && <p>Lower “Maximum spend” to $10.00 or less, then build a fresh review.</p>}
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
                      disabled={!EXECUTION_ENABLED || !pilotCostIsSafe || !reviewAcknowledged || executionPending || !provider || reviewUsed || reviewExpired}
                      onClick={() => void submitReviewedPilot()}
                      type="button"
                    >
                      {!EXECUTION_ENABLED
                        ? "Execution disabled in this build"
                        : executionPending
                          ? "Wallet flow active…"
                          : reviewUsed ? "Review already used — build a fresh review" : reviewExpired ? "Review expired — build a fresh review" : "Submit reviewed pilot"}
                    </button>
                    <p className="pilot-warning">
                      {EXECUTION_ENABLED
                        ? "Shannon testnet only. This opens your wallet; each call still requires your confirmation, and Downrail cannot sign for you."
                        : "This build allows unsigned Shannon reviews only. Enable the testnet pilot to submit reviewed calls."}
                    </p>
                  </div>

                  {activeExecution && (
                    <div className={`execution-status${activeExecution.error ? " error" : ""}`} role="status">
                      <strong>{activeExecution.completed ? "Pilot confirmed" : activeExecution.error ? "Pilot stopped" : "Execution in progress"}</strong>
                      <p>{activeExecution.message}</p>
                      {activeExecution.completed && (
                        <>
                          <div>{activeExecution.completed.map((item) => (
                            <a href={`https://shannon-explorer.somnia.network/tx/${item.hash}`} key={item.hash} rel="noreferrer" target="_blank">{item.call.kind} · {shortId(item.hash)} <ArrowUpRight aria-hidden="true" /></a>
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
                  {approvalCleanup?.fingerprint === activePreflight.fingerprint && (
                    <div className="approval-cleanup" role="status">
                      <div>
                        <strong>Collateral approval check</strong>
                        <p>{approvalCleanup.message}</p>
                      </div>
                      {approvalCleanup.allowanceRaw !== "0" && (
                        <button
                          disabled={approvalCleanup.pending || !provider || chainId !== "0xc488"}
                          onClick={() => void cleanUpReviewedAllowance()}
                          type="button"
                        >
                          {approvalCleanup.pending ? "Wallet confirmation pending…" : "Revoke remaining approval"}
                        </button>
                      )}
                      {approvalCleanup.hash && (
                        <a href={`https://shannon-explorer.somnia.network/tx/${approvalCleanup.hash}`} rel="noreferrer" target="_blank">
                          Revocation receipt · {shortId(approvalCleanup.hash)} <ArrowUpRight aria-hidden="true" />
                        </a>
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
                    {call.kind} {shortId(call.hash)} <ArrowUpRight aria-hidden="true" />
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
            <p className="eyebrow">Manual rollover queue</p>
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
          <button onClick={loadReservedRollover} type="button">
            Load reserved rollover
          </button>
        </section>
      )}
    </section>
  );
}
