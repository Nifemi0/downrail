import { binaryModuleWriteAbi, erc6909Abi } from "@somnia-chain/markets-sdk";
import { encodeFunctionData, encodeFunctionResult, type Hex } from "viem";
import { describe, expect, it, vi } from "vitest";

import type { TransactionProvider } from "@/features/execution/run-reviewed-calls";
import {
  claimCommitmentSchema,
  claimReviewSchema,
  createClaimFingerprint,
} from "./claim-review";
import { assertReviewedClaim, runReviewedClaim } from "./run-reviewed-claim";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const MODULE = "0x2222222222222222222222222222222222222222";
const OUTCOME = "0x3333333333333333333333333333333333333333";
const MARKET = `0x${"44".repeat(32)}` as Hex;
const VENUE = `0x${"55".repeat(32)}` as Hex;
const HASH = `0x${"66".repeat(32)}`;

function buildReview() {
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
      description: "Redeem",
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

describe("runReviewedClaim", () => {
  it("rejects a changed account before RPC", () => {
    expect(() => assertReviewedClaim(buildReview(), MODULE)).toThrow(/account/);
  });

  it("simulates and confirms the exact reviewed claim", async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_accounts") return [ACCOUNT];
      if (method === "eth_chainId") return "0xc488";
      if (method === "eth_getBalance") return "0xde0b6b3a7640000";
      if (method === "eth_gasPrice") return "0x1";
      if (method === "eth_estimateGas") return "0x5208";
      if (method === "eth_sendTransaction") return HASH;
      if (method === "eth_getTransactionReceipt") return { transactionHash: HASH, status: "0x1" };
      if (method === "eth_call") return encodeFunctionResult({
        abi: erc6909Abi,
        functionName: "balanceOf",
        result: 1_000_000n,
      });
      throw new Error(`unexpected ${method}`);
    });
    const result = await runReviewedClaim({ request } as TransactionProvider, buildReview(), ACCOUNT);
    expect(result).toHaveLength(1);
    expect(request.mock.calls.some(([call]) => call.method === "eth_sendTransaction")).toBe(true);
  });
});
