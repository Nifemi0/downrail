import { describe, expect, it } from "vitest";

import { calculateSingleLegHedge } from "./calculate-single-leg";

const USDC = 1_000_000n;

describe("calculateSingleLegHedge", () => {
  it("stays inside the confirmed budget and reports winning protection", () => {
    const plan = calculateSingleLegHedge({
      exposureRaw: 2_000n * USDC,
      budgetRaw: 20n * USDC,
      downsideMoveBps: 500n,
      downAskRaw: 400_000n,
      quoteDecimals: 6,
      outcomeDecimals: 6,
      lotSizeRaw: 1_000n,
      minQuantityRaw: 1_000n,
    });

    expect(plan.quantityRaw).toBe(50n * USDC);
    expect(plan.estimatedCostRaw).toBe(20n * USDC);
    expect(plan.conditionalNetPayoutRaw).toBe(30n * USDC);
    expect(plan.modeledPortfolioLossRaw).toBe(100n * USDC);
    expect(plan.downWinCombinedChangeRaw).toBe(-70n * USDC);
    expect(plan.downLossCombinedChangeRaw).toBe(-120n * USDC);
    expect(plan.budgetRemainingRaw).toBe(0n);
  });

  it("caps quantity at available top-of-book liquidity", () => {
    const plan = calculateSingleLegHedge({
      exposureRaw: 1_000n * USDC,
      budgetRaw: 100n * USDC,
      downsideMoveBps: 1_000n,
      downAskRaw: 500_000n,
      quoteDecimals: 6,
      outcomeDecimals: 6,
      lotSizeRaw: 1_000n,
      minQuantityRaw: 1_000n,
      availableQuantityRaw: 10n * USDC,
    });

    expect(plan.quantityRaw).toBe(10n * USDC);
    expect(plan.estimatedCostRaw).toBe(5n * USDC);
    expect(plan.budgetRemainingRaw).toBe(95n * USDC);
  });

  it("returns zero quantity when the budget cannot reach the minimum lot", () => {
    const plan = calculateSingleLegHedge({
      exposureRaw: 1_000n * USDC,
      budgetRaw: 1n,
      downsideMoveBps: 500n,
      downAskRaw: 600_000n,
      quoteDecimals: 6,
      outcomeDecimals: 6,
      lotSizeRaw: 1_000n,
      minQuantityRaw: 1_000n,
    });

    expect(plan.quantityRaw).toBe(0n);
    expect(plan.estimatedCostRaw).toBe(0n);
  });

  it("rejects invalid probability prices", () => {
    expect(() =>
      calculateSingleLegHedge({
        exposureRaw: USDC,
        budgetRaw: USDC,
        downsideMoveBps: 500n,
        downAskRaw: USDC,
        quoteDecimals: 6,
        outcomeDecimals: 6,
        lotSizeRaw: 1n,
        minQuantityRaw: 1n,
      }),
    ).toThrow("downAskRaw must be less than one collateral unit");
  });
});
