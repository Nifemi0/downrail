import { binaryModuleWriteAbi } from "@somnia-chain/markets-sdk";
import { encodeFunctionData, type Hex } from "viem";
import { describe, expect, it } from "vitest";

import {
  claimCommitmentSchema,
  claimReviewSchema,
  createClaimFingerprint,
  validateClaimReview,
} from "./claim-review";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const MODULE = "0x2222222222222222222222222222222222222222";
const OUTCOME = "0x3333333333333333333333333333333333333333";
const MARKET = `0x${"44".repeat(32)}` as Hex;
const VENUE = `0x${"55".repeat(32)}` as Hex;

function review() {
  const commitment = claimCommitmentSchema.parse({
    schemaVersion: 1,
    account: ACCOUNT,
    chainId: 50_312,
    generatedAt: new Date(Date.now() - 1_000).toISOString(),
    validUntil: new Date(Date.now() + 60_000).toISOString(),
    module: MODULE,
    outcomeToken: OUTCOME,
    marketId: MARKET,
    outcomeIndex: 1,
    outcomeId: "42",
    amountRaw: "1000000",
    estimatedPayoutRaw: "990000",
    quoteDecimals: 6,
    operatorId: 2,
    venueId: VENUE,
    calls: [{
      kind: "REDEEM",
      to: MODULE,
      value: "0",
      description: "Redeem reviewed position",
      data: encodeFunctionData({
        abi: binaryModuleWriteAbi,
        functionName: "redeem",
        args: [2, VENUE, MARKET, 1, 1_000_000n],
      }),
    }],
  });
  return claimReviewSchema.parse({
    ...commitment,
    mode: "UNSIGNED_CLAIM_REVIEW",
    fingerprint: createClaimFingerprint(commitment),
    warnings: ["Unsigned"],
  });
}

describe("validateClaimReview", () => {
  it("accepts an exact decoded redemption", () => {
    expect(validateClaimReview(review())).toEqual(["Redeem 1000000 raw NO units"]);
  });

  it("rejects tampered redemption calldata", () => {
    const changed = review();
    changed.calls[0].data = encodeFunctionData({
      abi: binaryModuleWriteAbi,
      functionName: "redeem",
      args: [2, VENUE, MARKET, 1, 2_000_000n],
    });
    expect(() => validateClaimReview(changed)).toThrow(/fingerprint/);
  });
});
