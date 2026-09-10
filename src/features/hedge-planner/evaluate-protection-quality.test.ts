import { describe, expect, it } from "vitest";

import { evaluateProtectionQuality } from "./evaluate-protection-quality";

const USDC = 1_000_000n;

describe("evaluateProtectionQuality", () => {
  it("reports when the conditional winning offset reaches the user's target", () => {
    expect(evaluateProtectionQuality({
      currentMaximumCostRaw: 20n * USDC,
      conditionalNetPayoutRaw: 60n * USDC,
      modeledPortfolioLossRaw: 200n * USDC,
      targetCoverageBps: 2_500n,
      hasExecutableLeg: true,
    })).toEqual({
      verdict: "TARGET_MET",
      coverageBps: 3_000,
      efficiencyBps: 30_000,
      targetCoverageBps: 2_500,
      reason: "target_met",
    });
  });

  it("reports a partial offset without turning the ratio into a recommendation", () => {
    const result = evaluateProtectionQuality({
      currentMaximumCostRaw: 10n * USDC,
      conditionalNetPayoutRaw: 5n * USDC,
      modeledPortfolioLossRaw: 200n * USDC,
      targetCoverageBps: 2_500n,
      hasExecutableLeg: true,
    });

    expect(result.verdict).toBe("PARTIAL_OFFSET");
    expect(result.reason).toBe("below_target");
    expect(result.efficiencyBps).toBe(5_000);
  });

  it("flags a binary payout that overshoots the modeled loss", () => {
    const result = evaluateProtectionQuality({
      currentMaximumCostRaw: 50n * USDC,
      conditionalNetPayoutRaw: 300n * USDC,
      modeledPortfolioLossRaw: 200n * USDC,
      targetCoverageBps: 2_500n,
      hasExecutableLeg: true,
    });

    expect(result.verdict).toBe("OVERSIZED");
    expect(result.reason).toBe("overshoots_modeled_loss");
  });

  it("reports unavailable when no executable leg exists", () => {
    expect(evaluateProtectionQuality({
      currentMaximumCostRaw: 0n,
      conditionalNetPayoutRaw: 0n,
      modeledPortfolioLossRaw: 200n * USDC,
      targetCoverageBps: 2_500n,
      hasExecutableLeg: false,
    }).verdict).toBe("UNAVAILABLE");
  });
});
