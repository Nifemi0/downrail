import {
  encodeFunctionData,
  encodeFunctionResult,
  parseAbi,
  zeroAddress,
} from "viem";
import { describe, expect, it, vi } from "vitest";

import {
  createReviewFingerprint,
  REVIEW_SCHEMA_VERSION,
  type OrderReview,
  type ReviewCommitment,
} from "./review-schema";
import {
  assertTinyPilot,
  runReviewedPilot,
  type TransactionProvider,
} from "./run-reviewed-calls";

const APPROVAL_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);
const BALANCE_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);
const ALLOWANCE_ABI = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
]);
const ORDER_ABI = parseAbi([
  "function placeBinaryOrder(uint8 kind, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k, uint64 userData) payable returns (bool success, uint128 id)",
]);
const ACCOUNT = "0x1111111111111111111111111111111111111111";
const POOL = "0x2222222222222222222222222222222222222222";
const TOKEN = "0x3333333333333333333333333333333333333333";
const MARKET = `0x${"4".repeat(64)}` as `0x${string}`;
const HASH_A = `0x${"a".repeat(64)}`;
const HASH_B = `0x${"b".repeat(64)}`;
const MAXIMUM_COST = 2_000_000n;
const DOWN_PRICE = 250_000n;
const YES_PRICE = 750_000n;
const QUANTITY = 8_000_000n;

function fundingResponse(
  method: string,
  params?: unknown[] | Record<string, unknown>,
  allowance = 0n,
) {
  if (method === "eth_call") {
    const call = Array.isArray(params) ? params[0] : null;
    const data = call && typeof call === "object" && "data" in call
      ? String(call.data)
      : "";
    if (data.startsWith("0xdd62ed3e")) {
      return encodeFunctionResult({
        abi: ALLOWANCE_ABI,
        functionName: "allowance",
        result: allowance,
      });
    }
    return encodeFunctionResult({
      abi: BALANCE_ABI,
      functionName: "balanceOf",
      result: 10_000_000n,
    });
  }
  if (method === "eth_getBalance") return "0xde0b6b3a7640000";
  if (method === "eth_gasPrice") return "0x1";
  if (method === "eth_estimateGas") return "0x5208";
  return undefined;
}

function buildReview(
  mutate?: (commitment: ReviewCommitment) => ReviewCommitment,
): OrderReview {
  const generatedAt = new Date();
  const validUntil = new Date(generatedAt.getTime() + 60_000);
  const commitment: ReviewCommitment = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    account: ACCOUNT,
    chainId: 50_312,
    quoteDecimals: 6,
    generatedAt: generatedAt.toISOString(),
    plan: {
      asset: "ETH",
      requestedHorizonEndsAt: Math.floor(validUntil.getTime() / 1_000) + 3_600,
      totalMaximumCostRaw: MAXIMUM_COST.toString(),
      futureBudgetReserveRaw: "0",
      conditionalNetPayoutRaw: "6000000",
      modeledPortfolioLossRaw: "100000000",
    },
    legs: [{
      marketId: MARKET,
      poolAddress: POOL,
      collateralToken: TOKEN,
      side: "BUY_NO",
      orderType: "IMMEDIATE_OR_CANCEL",
      downLimitPriceRaw: DOWN_PRICE.toString(),
      sdkYesLimitPriceRaw: YES_PRICE.toString(),
      quantityRaw: QUANTITY.toString(),
      maximumCostRaw: MAXIMUM_COST.toString(),
      marketExpiryUnixSeconds: Math.floor(validUntil.getTime() / 1_000) + 300,
      validUntil: validUntil.toISOString(),
      calls: [
        {
          kind: "APPROVAL",
          to: TOKEN,
          data: encodeFunctionData({
            abi: APPROVAL_ABI,
            functionName: "approve",
            args: [POOL, MAXIMUM_COST],
          }),
          value: "0",
          description: "Approve exact cap",
        },
        {
          kind: "ORDER",
          to: POOL,
          data: encodeFunctionData({
            abi: ORDER_ABI,
            functionName: "placeBinaryOrder",
            args: [
              2,
              YES_PRICE,
              QUANTITY,
              BigInt(Math.floor(validUntil.getTime() / 1_000)) * 1_000_000_000n,
              2,
              0,
              zeroAddress,
              0n,
              0n,
            ],
          }),
          value: "0",
          description: "Place BUY_NO IOC order",
        },
      ],
    }],
  };
  const changed = mutate ? mutate(structuredClone(commitment)) : commitment;
  return {
    ...changed,
    mode: "UNSIGNED_REVIEW",
    fingerprint: createReviewFingerprint(changed),
    warnings: ["Unsigned review"],
  };
}

describe("assertTinyPilot", () => {
  it("accepts a fingerprint-bound decoded review at the two-unit cap", () => {
    expect(() => assertTinyPilot(buildReview(), ACCOUNT)).not.toThrow();
  });

  it("rejects a plan above the pilot cap", () => {
    const review = buildReview((commitment) => ({
      ...commitment,
      plan: { ...commitment.plan, totalMaximumCostRaw: "2000001" },
    }));
    expect(() => assertTinyPilot(review, ACCOUNT)).toThrow("capped at 2.00");
  });

  it("rejects a stale review", () => {
    const review = buildReview((commitment) => ({
      ...commitment,
      legs: commitment.legs.map((leg) => ({
        ...leg,
        validUntil: new Date(Date.now() - 1_000).toISOString(),
      })),
    }));
    expect(() => assertTinyPilot(review, ACCOUNT)).toThrow("expired");
  });

  it("rejects payload tampering when the fingerprint is unchanged", () => {
    const review = buildReview();
    const tampered = {
      ...review,
      legs: review.legs.map((leg) => ({ ...leg, maximumCostRaw: "1" })),
    };
    expect(() => assertTinyPilot(tampered, ACCOUNT)).toThrow("fingerprint");
  });

  it("rejects nonzero native value even with a valid fingerprint", () => {
    const review = buildReview((commitment) => ({
      ...commitment,
      legs: commitment.legs.map((leg) => ({
        ...leg,
        calls: leg.calls.map((call) =>
          call.kind === "ORDER" ? { ...call, value: "1" } : call),
      })),
    }));
    expect(() => assertTinyPilot(review, ACCOUNT)).toThrow("zero native value");
  });

  it("rejects arbitrary order calldata even with a valid fingerprint", () => {
    const review = buildReview((commitment) => ({
      ...commitment,
      legs: commitment.legs.map((leg) => ({
        ...leg,
        calls: leg.calls.map((call) =>
          call.kind === "ORDER" ? { ...call, data: "0xdeadbeef" } : call),
      })),
    }));
    expect(() => assertTinyPilot(review, ACCOUNT)).toThrow();
  });
});

describe("runReviewedPilot", () => {
  it("stops before signatures when collateral is insufficient", async () => {
    const request = vi.fn(async ({ method, params }: { method: string; params?: unknown[] | Record<string, unknown> }) => {
      if (method === "eth_call") {
        const existing = fundingResponse(method, params);
        if (Array.isArray(params)) {
          const call = params[0];
          if (call && typeof call === "object" && "data" in call && String(call.data).startsWith("0xdd62ed3e")) {
            return existing;
          }
        }
        return encodeFunctionResult({
          abi: BALANCE_ABI,
          functionName: "balanceOf",
          result: 1n,
        });
      }
      const funding = fundingResponse(method, params);
      return funding;
    });

    await expect(
      runReviewedPilot({ request }, buildReview(), ACCOUNT),
    ).rejects.toThrow("insufficient collateral");
    expect(request.mock.calls.some(([call]) => call.method === "eth_sendTransaction"))
      .toBe(false);
  });

  it("rechecks account and chain before each sequential call", async () => {
    const hashes = [HASH_A, HASH_B];
    const request = vi.fn(async ({ method, params }: { method: string; params?: unknown[] | Record<string, unknown> }) => {
      const funding = fundingResponse(method, params);
      if (funding !== undefined) return funding;
      if (method === "eth_accounts") return [ACCOUNT];
      if (method === "eth_chainId") return "0xc488";
      if (method === "eth_sendTransaction") return hashes.shift();
      return { status: "0x1", transactionHash: hashes.length ? HASH_A : HASH_B };
    });
    const provider: TransactionProvider = { request };

    const result = await runReviewedPilot(provider, buildReview(), ACCOUNT);

    expect(result.map((item) => item.hash)).toEqual([HASH_A, HASH_B]);
    expect(request.mock.calls.map(([request]) => request.method)).toEqual([
      "eth_call",
      "eth_call",
      "eth_getBalance",
      "eth_gasPrice",
      "eth_accounts",
      "eth_chainId",
      "eth_estimateGas",
      "eth_sendTransaction",
      "eth_getTransactionReceipt",
      "eth_accounts",
      "eth_chainId",
      "eth_estimateGas",
      "eth_sendTransaction",
      "eth_getTransactionReceipt",
    ]);
  });

  it("stops before the order when the account changes after approval", async () => {
    let contextChecks = 0;
    const request = vi.fn(async ({ method, params }: { method: string; params?: unknown[] | Record<string, unknown> }) => {
      const funding = fundingResponse(method, params);
      if (funding !== undefined) return funding;
      if (method === "eth_accounts") {
        contextChecks += 1;
        return [contextChecks === 1 ? ACCOUNT : POOL];
      }
      if (method === "eth_chainId") return "0xc488";
      if (method === "eth_sendTransaction") return HASH_A;
      return { status: "0x1", transactionHash: HASH_A };
    });

    await expect(
      runReviewedPilot({ request }, buildReview(), ACCOUNT),
    ).rejects.toThrow("account changed");
    expect(request.mock.calls.filter(([call]) => call.method === "eth_sendTransaction"))
      .toHaveLength(1);
  });

  it("stops when a mined transaction reverted", async () => {
    const provider: TransactionProvider = {
      request: vi.fn(async ({ method, params }) => {
        const funding = fundingResponse(method, params);
        if (funding !== undefined) return funding;
        if (method === "eth_accounts") return [ACCOUNT];
        if (method === "eth_chainId") return "0xc488";
        if (method === "eth_sendTransaction") return HASH_A;
        return { status: "0x0", transactionHash: HASH_A };
      }),
    };

    await expect(runReviewedPilot(provider, buildReview(), ACCOUNT)).rejects.toThrow(
      "reverted on chain",
    );
  });

  it("skips a redundant approval when the exact allowance is already sufficient", async () => {
    const request = vi.fn(async ({ method, params }: { method: string; params?: unknown[] | Record<string, unknown> }) => {
      const funding = fundingResponse(method, params, MAXIMUM_COST);
      if (funding !== undefined) return funding;
      if (method === "eth_accounts") return [ACCOUNT];
      if (method === "eth_chainId") return "0xc488";
      if (method === "eth_sendTransaction") return HASH_B;
      return { status: "0x1", transactionHash: HASH_B };
    });

    const result = await runReviewedPilot({ request }, buildReview(), ACCOUNT);

    expect(result.map((item) => item.call.kind)).toEqual(["ORDER"]);
    expect(request.mock.calls.filter(([call]) => call.method === "eth_sendTransaction"))
      .toHaveLength(1);
  });
});
