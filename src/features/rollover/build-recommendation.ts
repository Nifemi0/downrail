import type { ExecutionStatus } from "@/features/execution/journal";

const MINIMUM_WINDOW_SECONDS = 15 * 60;
const MAXIMUM_WINDOW_SECONDS = 24 * 60 * 60;
const NEAR_EXPIRY_SECONDS = 5 * 60;

const IMMEDIATE_TRIGGERS = new Set<ExecutionStatus>([
  "CANCELLED_IOC",
  "PARTIALLY_FILLED",
  "EXPIRED",
  "RESOLVED",
  "FINALIZED",
  "CLAIMABLE",
  "CLAIMED",
  "FAILED",
]);

export type ManualRolloverRecommendation = {
  dedupeKey: string;
  trigger: "UNPROTECTED" | "NEAR_EXPIRY" | "LIFECYCLE_COMPLETE";
  remainingHorizonSeconds: number;
  budgetRaw: string;
  requiresFreshMarket: true;
};

export function buildManualRolloverRecommendation(input: {
  marketId: string;
  status: ExecutionStatus;
  nowUnixSeconds: number;
  marketExpiryUnixSeconds: number;
  requestedHorizonEndsAt: number;
  futureBudgetReserveRaw: string;
}): ManualRolloverRecommendation | null {
  const remaining = input.requestedHorizonEndsAt - input.nowUnixSeconds;
  if (remaining < MINIMUM_WINDOW_SECONDS || BigInt(input.futureBudgetReserveRaw) <= 0n) {
    return null;
  }
  const nearExpiry = input.marketExpiryUnixSeconds - input.nowUnixSeconds <= NEAR_EXPIRY_SECONDS;
  if (!nearExpiry && !IMMEDIATE_TRIGGERS.has(input.status)) return null;
  const unprotected = input.status === "CANCELLED_IOC"
    || input.status === "PARTIALLY_FILLED"
    || input.status === "FAILED";
  const trigger = unprotected
    ? "UNPROTECTED"
    : nearExpiry
      ? "NEAR_EXPIRY"
      : "LIFECYCLE_COMPLETE";
  return {
    dedupeKey: `${input.marketId.toLowerCase()}:${input.marketExpiryUnixSeconds}`,
    trigger,
    remainingHorizonSeconds: Math.min(remaining, MAXIMUM_WINDOW_SECONDS),
    budgetRaw: input.futureBudgetReserveRaw,
    requiresFreshMarket: true,
  };
}
