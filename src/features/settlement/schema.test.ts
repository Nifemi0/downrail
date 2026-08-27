import { describe, expect, it } from "vitest";

import { classifySettlementPosition } from "./schema";

const base = {
  balance: 1_000_000n,
  finalized: true,
  resolved: true,
  voided: false,
  outcomeIndex: 1 as const,
  winningOutcome: 1 as const,
  payoutNumerator: 9_900_000n,
  payoutDenominator: 10_000_000n,
};

describe("classifySettlementPosition", () => {
  it("marks a finalized winning position claimable and uses the exact payout vector", () => {
    expect(classifySettlementPosition(base)).toEqual({
      status: "CLAIMABLE",
      estimatedPayout: 990_000n,
    });
  });

  it("does not expose a resolved position before finalization", () => {
    expect(classifySettlementPosition({ ...base, finalized: false }).status)
      .toBe("WAITING_FINALIZATION");
  });

  it("marks both sides of a finalized void claimable", () => {
    expect(classifySettlementPosition({
      ...base,
      voided: true,
      winningOutcome: null,
      payoutNumerator: 5_000_000n,
    })).toEqual({ status: "VOIDED_CLAIMABLE", estimatedPayout: 500_000n });
  });

  it("does not call a losing balance claimable", () => {
    expect(classifySettlementPosition({ ...base, winningOutcome: 0 }).status)
      .toBe("LOSING_POSITION");
  });
});
