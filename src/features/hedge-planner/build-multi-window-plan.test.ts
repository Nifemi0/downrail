import { describe, expect, it } from "vitest";

import {
  buildMultiWindowHedgePlan,
  type HedgeMarketCandidate,
} from "./build-multi-window-plan";

const USDC = 1_000_000n;
const NOW = 1_800_000_000;

function market(
  overrides: Partial<HedgeMarketCandidate> & Pick<HedgeMarketCandidate, "marketId">,
): HedgeMarketCandidate {
  const { marketId, ...rest } = overrides;

  return {
    marketId,
    asset: "ETH",
    expiryUnixSeconds: NOW + 8 * 60 * 60,
    intervalSeconds: 24 * 60 * 60,
    quoteDecimals: 6,
    outcomeDecimals: 6,
    tickSizeRaw: 1_000n,
    lotSizeRaw: 1_000n,
    minQuantityRaw: 1_000n,
    downAsks: [{ priceRaw: 250_000n, quantityRaw: 1_000n * USDC }],
    ...rest,
  };
}

function plan(candidates: HedgeMarketCandidate[], budgetRaw = 20n * USDC) {
  return buildMultiWindowHedgePlan({
    asset: "ETH",
    exposureRaw: 2_000n * USDC,
    budgetRaw,
    downsideMoveBps: 500n,
    requestedHorizonSeconds: 4 * 60 * 60,
    minExecutionHeadroomSeconds: 5 * 60,
    nowUnixSeconds: NOW,
    maxMarkets: 2,
    candidates,
  });
}

describe("buildMultiWindowHedgePlan", () => {
  it("rejects a liquid market that expires before the requested horizon", () => {
    const result = plan([
      market({
        marketId: "too-soon",
        expiryUnixSeconds: NOW + 30 * 60,
      }),
      market({ marketId: "covers-horizon" }),
    ]);

    expect(result.legs.map((leg) => leg.marketId)).toEqual([
      "covers-horizon",
    ]);
    expect(result.excludedMarkets).toContainEqual({
      marketId: "too-soon",
      reason: "expires_before_horizon",
    });
  });

  it("splits the initial budget across aligned markets", () => {
    const result = plan([
      market({
        marketId: "near",
        expiryUnixSeconds: NOW + 5 * 60 * 60,
        downAsks: [{ priceRaw: 250_000n, quantityRaw: 40n * USDC }],
      }),
      market({
        marketId: "far",
        expiryUnixSeconds: NOW + 6 * 60 * 60,
        downAsks: [{ priceRaw: 500_000n, quantityRaw: 20n * USDC }],
      }),
    ]);

    expect(result.legs).toHaveLength(2);
    expect(result.totalMaximumCostRaw).toBe(20n * USDC);
    expect(result.netWinningProtectionRaw).toBe(40n * USDC);
    expect(result.coverageBps).toBe(4_000n);
    expect(result.budgetRemainingRaw).toBe(0n);
  });

  it("budgets deeper fills at the worst executable limit price", () => {
    const result = plan(
      [
        market({
          marketId: "depth",
          downAsks: [
            { priceRaw: 200_000n, quantityRaw: 10n * USDC },
            { priceRaw: 400_000n, quantityRaw: 100n * USDC },
          ],
        }),
      ],
      10n * USDC,
    );

    expect(result.legs[0]?.quantityRaw).toBe(25n * USDC);
    expect(result.legs[0]?.limitPriceRaw).toBe(400_000n);
    expect(result.legs[0]?.estimatedBookCostRaw).toBe(8n * USDC);
    expect(result.legs[0]?.maximumCostRaw).toBe(10n * USDC);
  });

  it("redistributes budget a shallow market cannot use", () => {
    const result = plan([
      market({
        marketId: "shallow",
        expiryUnixSeconds: NOW + 5 * 60 * 60,
        downAsks: [{ priceRaw: 500_000n, quantityRaw: 2n * USDC }],
      }),
      market({
        marketId: "deep",
        expiryUnixSeconds: NOW + 6 * 60 * 60,
        downAsks: [{ priceRaw: 500_000n, quantityRaw: 100n * USDC }],
      }),
    ]);

    expect(result.legs.find((leg) => leg.marketId === "shallow")?.maximumCostRaw)
      .toBe(1n * USDC);
    expect(result.legs.find((leg) => leg.marketId === "deep")?.maximumCostRaw)
      .toBe(19n * USDC);
    expect(result.budgetRemainingRaw).toBe(0n);
  });

  it("excludes malformed tick-grid levels instead of planning an invalid order", () => {
    const result = plan([
      market({
        marketId: "bad-tick",
        downAsks: [{ priceRaw: 250_001n, quantityRaw: 100n * USDC }],
      }),
    ]);

    expect(result.legs).toHaveLength(0);
    expect(result.excludedMarkets).toEqual([
      { marketId: "bad-tick", reason: "empty_book" },
    ]);
  });

  it("uses market id as the final deterministic tie-breaker", () => {
    const result = buildMultiWindowHedgePlan({
      asset: "ETH",
      exposureRaw: 2_000n * USDC,
      budgetRaw: 20n * USDC,
      downsideMoveBps: 500n,
      requestedHorizonSeconds: 4 * 60 * 60,
      minExecutionHeadroomSeconds: 5 * 60,
      nowUnixSeconds: NOW,
      maxMarkets: 1,
      candidates: [market({ marketId: "b" }), market({ marketId: "a" })],
    });

    expect(result.legs[0]?.marketId).toBe("a");
  });

  it("reports residual scenario loss and partial coverage", () => {
    const result = plan(
      [
        market({
          marketId: "expensive",
          downAsks: [{ priceRaw: 800_000n, quantityRaw: 100n * USDC }],
        }),
      ],
      20n * USDC,
    );

    expect(result.netWinningProtectionRaw).toBe(5n * USDC);
    expect(result.residualScenarioLossRaw).toBe(95n * USDC);
    expect(result.coverageBps).toBe(500n);
    expect(result.warnings).toContain(
      "The plan provides partial scenario coverage.",
    );
  });
});
