import { encodeFunctionData, parseAbi, zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import {
  createReviewFingerprint,
  type OrderReview,
  type ReviewCommitment,
} from "./review-schema";
import { assertTrustedLiveReview, type TrustedLiveMarket } from "./validate-live-review";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const POOL = "0x2222222222222222222222222222222222222222";
const TOKEN = "0x3333333333333333333333333333333333333333";
const MARKET = `0x${"4".repeat(64)}` as `0x${string}`;
const VENUE = `0x${"5".repeat(64)}` as `0x${string}`;
const ORDER_ABI = parseAbi([
  "function placeBinaryOrder(uint8 kind, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k, uint64 userData) payable returns (bool success, uint128 id)",
]);

function review(): OrderReview {
  const validUntil = new Date(Date.now() + 60_000);
  const commitment: ReviewCommitment = {
    schemaVersion: 1,
    account: ACCOUNT,
    chainId: 50_312,
    quoteDecimals: 6,
    generatedAt: new Date().toISOString(),
    plan: {
      asset: "ETH",
      requestedHorizonEndsAt: Math.floor(validUntil.getTime() / 1_000) + 3_600,
      totalMaximumCostRaw: "10000000",
      futureBudgetReserveRaw: "0",
      conditionalNetPayoutRaw: "30000000",
      modeledPortfolioLossRaw: "100000000",
    },
    legs: [{
      marketId: MARKET,
      poolAddress: POOL,
      collateralToken: TOKEN,
      side: "BUY_NO",
      orderType: "IMMEDIATE_OR_CANCEL",
      downLimitPriceRaw: "250000",
      sdkYesLimitPriceRaw: "750000",
      quantityRaw: "40000000",
      maximumCostRaw: "10000000",
      marketExpiryUnixSeconds: Math.floor(validUntil.getTime() / 1_000) + 300,
      validUntil: validUntil.toISOString(),
      calls: [{
        kind: "ORDER",
        to: POOL,
        value: "0",
        description: "Place bounded order",
        data: encodeFunctionData({
          abi: ORDER_ABI,
          functionName: "placeBinaryOrder",
          args: [2, 750_000n, 40_000_000n, BigInt(Math.floor(validUntil.getTime() / 1_000)) * 1_000_000_000n, 2, 0, zeroAddress, 0n, 0n],
        }),
      }],
    }],
  };
  return {
    ...commitment,
    mode: "UNSIGNED_REVIEW",
    fingerprint: createReviewFingerprint(commitment),
    warnings: ["Unsigned"],
  };
}

function market(input: OrderReview): TrustedLiveMarket {
  const leg = input.legs[0];
  return {
    marketId: leg.marketId,
    venueId: VENUE,
    indexedPoolAddress: POOL,
    indexedCollateralToken: TOKEN,
    indexedQuoteDecimals: 6,
    indexedExpiryUnixSeconds: leg.marketExpiryUnixSeconds,
    onchainPoolAddress: POOL,
    onchainCollateralToken: TOKEN,
    onchainQuoteDecimals: 6,
    onchainExpiryUnixSeconds: leg.marketExpiryUnixSeconds,
    onchainStatus: 1,
    finalized: false,
    resolved: false,
    voided: false,
  };
}

describe("assertTrustedLiveReview", () => {
  it("accepts an active review whose indexer and chain bindings agree", () => {
    const input = review();
    expect(assertTrustedLiveReview(input, market(input), VENUE).fingerprint)
      .toBe(input.fingerprint);
  });

  it.each([
    ["venue", { venueId: `0x${"6".repeat(64)}` }],
    ["pool", { onchainPoolAddress: "0x9999999999999999999999999999999999999999" }],
    ["collateral", { indexedCollateralToken: "0x9999999999999999999999999999999999999999" }],
    ["expiry", { onchainExpiryUnixSeconds: 1 }],
    ["status", { onchainStatus: 2 }],
    ["resolution", { resolved: true }],
  ])("rejects a changed live %s binding", (_label, override) => {
    const input = review();
    expect(() => assertTrustedLiveReview(input, { ...market(input), ...override }, VENUE))
      .toThrow(RangeError);
  });
});
