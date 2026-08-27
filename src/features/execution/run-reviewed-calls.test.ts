import { describe, expect, it, vi } from "vitest";

import {
  assertTinyPilot,
  runReviewedPilot,
  type ReviewedPilot,
  type TransactionProvider,
} from "./run-reviewed-calls";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const HASH_A = `0x${"a".repeat(64)}`;
const HASH_B = `0x${"b".repeat(64)}`;

function pilot(overrides: Partial<ReviewedPilot> = {}): ReviewedPilot {
  return {
    account: ACCOUNT,
    chainId: 50_312,
    fingerprint: `0x${"f".repeat(64)}`,
    plan: { totalMaximumCostRaw: "2000000" },
    legs: [{
      validUntil: new Date(Date.now() + 60_000).toISOString(),
      calls: [
        { kind: "APPROVAL", to: ACCOUNT, data: "0x1234", value: "0", description: "Approve exact cap" },
        { kind: "ORDER", to: ACCOUNT, data: "0xabcd", value: "0", description: "Place IOC order" },
      ],
    }],
    ...overrides,
  };
}

describe("assertTinyPilot", () => {
  it("accepts one reviewed leg at the two-unit cap", () => {
    expect(() => assertTinyPilot(pilot(), ACCOUNT)).not.toThrow();
  });

  it("rejects a plan above the pilot cap", () => {
    expect(() => assertTinyPilot(
      pilot({ plan: { totalMaximumCostRaw: "2000001" } }),
      ACCOUNT,
    )).toThrow("capped at 2.00");
  });

  it("rejects stale and multi-leg reviews", () => {
    expect(() => assertTinyPilot(pilot({ legs: [] }), ACCOUNT)).toThrow(
      "exactly one",
    );
    expect(() => assertTinyPilot(pilot({
      legs: [{
        validUntil: new Date(Date.now() - 1_000).toISOString(),
        calls: [{ kind: "ORDER", to: ACCOUNT, data: "0x", value: "0", description: "Order" }],
      }],
    }), ACCOUNT)).toThrow("expired");
  });
});

describe("runReviewedPilot", () => {
  it("submits calls sequentially and verifies successful receipts", async () => {
    const hashes = [HASH_A, HASH_B];
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_sendTransaction") return hashes.shift();
      return { status: "0x1", blockNumber: "0x10" };
    });
    const provider: TransactionProvider = { request };

    const result = await runReviewedPilot(provider, pilot(), ACCOUNT);

    expect(result.map((item) => item.hash)).toEqual([HASH_A, HASH_B]);
    expect(request.mock.calls.map(([request]) => request.method)).toEqual([
      "eth_sendTransaction",
      "eth_getTransactionReceipt",
      "eth_sendTransaction",
      "eth_getTransactionReceipt",
    ]);
  });

  it("stops when a mined transaction reverted", async () => {
    const provider: TransactionProvider = {
      request: vi.fn(async ({ method }) =>
        method === "eth_sendTransaction" ? HASH_A : { status: "0x0" }),
    };

    await expect(runReviewedPilot(provider, pilot(), ACCOUNT)).rejects.toThrow(
      "reverted on chain",
    );
  });
});
