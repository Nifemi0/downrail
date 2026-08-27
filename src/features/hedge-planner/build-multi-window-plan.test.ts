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
    question: "Will ETH finish this interval DOWN?",
    expiryUnixSeconds: NOW + 5 * 60 * 60,
    intervalSeconds: 4 * 60 * 60,
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
    maxMarkets: 3,
    candidates,
  });
}

describe("buildMultiWindowHedgePlan", () => {
  it("rejects a market without enough execution headroom", () => {
    const result = plan([
      market({ marketId: "too-soon", expiryUnixSeconds: NOW + 5 * 60 }),
      market({ marketId: "usable" }),
    ]);

    expect(result.legs.map((leg) => leg.marketId)).toEqual(["usable"]);
    expect(result.excludedMarkets).toContainEqual({
      marketId: "too-soon",
      reason: "expires_too_soon",
    });
  });

  it("selects one interval-aligned current market instead of summing simultaneous legs", () => {
    const result = plan([
      market({ marketId: "one-hour", intervalSeconds: 60 * 60 }),
      market({ marketId: "four-hour", intervalSeconds: 4 * 60 * 60 }),
      market({ marketId: "day", intervalSeconds: 24 * 60 * 60 }),
    ]);

    expect(result.legs).toHaveLength(1);
    expect(result.legs[0]?.marketId).toBe("four-hour");
    expect(result.currentMaximumCostRaw).toBe(20n * USDC);
  });

  it("reserves budget and creates explicit future rollover checkpoints", () => {
    const result = plan([
      market({
        marketId: "current",
        expiryUnixSeconds: NOW + 2 * 60 * 60,
      }),
    ]);

    expect(result.currentMaximumCostRaw).toBe(10n * USDC);
    expect(result.futureBudgetReserveRaw).toBe(10n * USDC);
    expect(result.rolloverCheckpoints).toEqual([
      {
        sequence: 1,
        startsAt: NOW + 2 * 60 * 60,
        targetEndsAt: NOW + 4 * 60 * 60,
        intervalSeconds: 2 * 60 * 60,
        estimatedBudgetRaw: 10n * USDC,
        status: "FUTURE_MARKET_REQUIRED",
      },
    ]);
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
    expect(result.currentEstimatedBookCostRaw).toBe(8n * USDC);
    expect(result.currentMaximumCostRaw).toBe(10n * USDC);
  });

  it("excludes malformed tick-grid levels", () => {
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

  it("uses expiry, price, then market id as deterministic tie-breakers", () => {
    const result = plan([
      market({ marketId: "b" }),
      market({ marketId: "a" }),
    ]);

    expect(result.legs[0]?.marketId).toBe("a");
  });

  it("reports both binary outcomes without claiming guaranteed coverage", () => {
    const result = plan(
      [
        market({
          marketId: "expensive",
          downAsks: [{ priceRaw: 800_000n, quantityRaw: 100n * USDC }],
        }),
      ],
      20n * USDC,
    );

    expect(result.conditionalNetPayoutRaw).toBe(5n * USDC);
    expect(result.modeledPortfolioLossRaw).toBe(100n * USDC);
    expect(result.outcomes).toEqual([
      {
        outcome: "DOWN_WINS",
        hedgeNetRaw: 5n * USDC,
        combinedScenarioChangeRaw: -95n * USDC,
      },
      {
        outcome: "DOWN_LOSES",
        hedgeNetRaw: -20n * USDC,
        combinedScenarioChangeRaw: -120n * USDC,
      },
    ]);
    expect(result).not.toHaveProperty("coverageBps");
    expect(result.warnings.join(" ")).toContain("conditional");
  });
});
