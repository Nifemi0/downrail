import { describe, expect, it, afterEach } from "vitest";

import type { OrderReview } from "./review-schema";
import { consumeExecutionReview, resetExecutionTicketsForTests } from "./execution-ticket";

afterEach(resetExecutionTicketsForTests);

function review(validUntil = new Date(Date.now() + 60_000).toISOString()) {
  return {
    schemaVersion: 1,
    mode: "UNSIGNED_REVIEW",
    account: "0x1111111111111111111111111111111111111111",
    chainId: 50_312,
    quoteDecimals: 6,
    generatedAt: new Date().toISOString(),
    fingerprint: `0x${"a".repeat(64)}`,
    plan: {
      asset: "ETH",
      requestedHorizonEndsAt: Math.floor(Date.now() / 1_000) + 3_600,
      totalMaximumCostRaw: "1000000",
      futureBudgetReserveRaw: "0",
      conditionalNetPayoutRaw: "2000000",
      modeledPortfolioLossRaw: "100000000",
    },
    legs: [{
      marketId: `0x${"b".repeat(64)}`,
      poolAddress: "0x2222222222222222222222222222222222222222",
      collateralToken: "0x3333333333333333333333333333333333333333",
      side: "BUY_NO",
      orderType: "IMMEDIATE_OR_CANCEL",
      downLimitPriceRaw: "250000",
      sdkYesLimitPriceRaw: "750000",
      quantityRaw: "4000000",
      maximumCostRaw: "1000000",
      marketExpiryUnixSeconds: Math.floor(Date.now() / 1_000) + 300,
      validUntil,
      calls: [{
        kind: "ORDER",
        to: "0x2222222222222222222222222222222222222222",
        data: "0x1234",
        value: "0",
        description: "Order",
      }],
    }],
    warnings: ["Unsigned"],
  } as OrderReview;
}

describe("consumeExecutionReview", () => {
  it("allows the first execution attempt", () => {
    expect(consumeExecutionReview(review()).fingerprint).toMatch(/^0x/);
  });

  it("blocks reuse of the same fingerprint within its execution window", () => {
    const input = review();
    consumeExecutionReview(input);
    expect(() => consumeExecutionReview(input)).toThrow("already opened");
  });

  it("rejects a review that is too close to expiry", () => {
    expect(() => consumeExecutionReview(review(new Date(Date.now() + 5_000).toISOString())))
      .toThrow("expired");
  });
});
