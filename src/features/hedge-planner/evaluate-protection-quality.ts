export const MIN_TARGET_COVERAGE_BPS = 2_500n;
export const MAX_TARGET_COVERAGE_BPS = 10_000n;
export const OVERSIZED_OFFSET_BPS = 12_500n;

export type ProtectionVerdict =
  | "TARGET_MET"
  | "PARTIAL_OFFSET"
  | "OVERSIZED"
  | "UNAVAILABLE";

export type ProtectionQuality = {
  verdict: ProtectionVerdict;
  coverageBps: number;
  efficiencyBps: number;
  targetCoverageBps: number;
  reason:
    | "target_met"
    | "below_target"
    | "overshoots_modeled_loss"
    | "no_executable_plan";
};

type ProtectionQualityInput = {
  currentMaximumCostRaw: bigint;
  conditionalNetPayoutRaw: bigint;
  modeledPortfolioLossRaw: bigint;
  targetCoverageBps: bigint;
  hasExecutableLeg: boolean;
};

function ratioBps(numerator: bigint, denominator: bigint) {
  if (denominator <= 0n || numerator <= 0n) return 0;
  const result = (numerator * 10_000n) / denominator;
  return Number(result > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : result);
}

/**
 * Compares a conditional winning payout with the user's modeled loss.
 * This is a factual scenario summary, not a probability model or a buy recommendation.
 */
export function evaluateProtectionQuality(
  input: ProtectionQualityInput,
): ProtectionQuality {
  if (
    !input.hasExecutableLeg ||
    input.currentMaximumCostRaw <= 0n ||
    input.modeledPortfolioLossRaw <= 0n
  ) {
    return {
      verdict: "UNAVAILABLE",
      coverageBps: 0,
      efficiencyBps: 0,
      targetCoverageBps: Number(input.targetCoverageBps),
      reason: "no_executable_plan",
    };
  }

  const coverageBps = ratioBps(
    input.conditionalNetPayoutRaw,
    input.modeledPortfolioLossRaw,
  );
  const efficiencyBps = ratioBps(
    input.conditionalNetPayoutRaw,
    input.currentMaximumCostRaw,
  );
  const targetCoverageBps = Number(input.targetCoverageBps);

  if (coverageBps > Number(OVERSIZED_OFFSET_BPS)) {
    return {
      verdict: "OVERSIZED",
      coverageBps,
      efficiencyBps,
      targetCoverageBps,
      reason: "overshoots_modeled_loss",
    };
  }

  if (coverageBps >= targetCoverageBps) {
    return {
      verdict: "TARGET_MET",
      coverageBps,
      efficiencyBps,
      targetCoverageBps,
      reason: "target_met",
    };
  }

  return {
    verdict: "PARTIAL_OFFSET",
    coverageBps,
    efficiencyBps,
    targetCoverageBps,
    reason: "below_target",
  };
}
