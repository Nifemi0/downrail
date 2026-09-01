import { describe, expect, it } from "vitest";

import type { OrderReview } from "./review-schema";
import {
  EXECUTION_JOURNAL_KEY,
  executionJournalId,
  markClaimedExecutionForMarket,
  readExecutionJournal,
  saveReviewedExecution,
  updateExecutionJournal,
} from "./journal";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function review(): OrderReview {
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
      validUntil: new Date(Date.now() + 60_000).toISOString(),
      calls: [
        {
          kind: "APPROVAL",
          to: "0x3333333333333333333333333333333333333333",
          data: "0x1234",
          value: "0",
          description: "Approval",
        },
        {
          kind: "ORDER",
          to: "0x2222222222222222222222222222222222222222",
          data: "0x5678",
          value: "0",
          description: "Order",
        },
      ],
    }],
    warnings: ["Unsigned"],
  };
}

describe("execution journal", () => {
  it("persists reviewed and submitted state across reads", () => {
    const storage = new MemoryStorage();
    const input = review();
    saveReviewedExecution(storage, input);
    const id = executionJournalId(input);
    updateExecutionJournal(storage, id, {
      status: "ORDER_SUBMITTED",
      callKind: "ORDER",
      hash: `0x${"c".repeat(64)}`,
    });

    const restored = readExecutionJournal(storage);
    expect(restored).toHaveLength(1);
    expect(restored[0]?.status).toBe("ORDER_SUBMITTED");
    expect(restored[0]?.calls[1]?.hash).toBe(`0x${"c".repeat(64)}`);
  });

  it("keeps repeated saves idempotent", () => {
    const storage = new MemoryStorage();
    const input = review();
    saveReviewedExecution(storage, input);
    saveReviewedExecution(storage, input);
    expect(readExecutionJournal(storage)).toHaveLength(1);
  });

  it("treats corrupt device data as non-authoritative", () => {
    const storage = new MemoryStorage();
    storage.setItem(EXECUTION_JOURNAL_KEY, "not-json");
    expect(readExecutionJournal(storage)).toEqual([]);
  });

  it("marks submitted executions for a claimed account and market", () => {
    const storage = new MemoryStorage();
    const submitted = review();
    const reviewedOnly = {
      ...review(),
      fingerprint: `0x${"d".repeat(64)}` as `0x${string}`,
    };
    saveReviewedExecution(storage, reviewedOnly);
    saveReviewedExecution(storage, submitted);
    updateExecutionJournal(storage, executionJournalId(submitted), {
      status: "ORDER_SUBMITTED",
      callKind: "ORDER",
      hash: `0x${"c".repeat(64)}`,
    });

    const records = markClaimedExecutionForMarket(
      storage,
      submitted.account,
      submitted.legs[0].marketId,
    );

    expect(records.find((record) => record.id === executionJournalId(submitted))?.status)
      .toBe("CLAIMED");
    expect(records.find((record) => record.id === executionJournalId(reviewedOnly))?.status)
      .toBe("REVIEWED");
  });
});
