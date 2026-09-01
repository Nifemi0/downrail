import { describe, expect, it } from "vitest";

import { buildManualRolloverRecommendation } from "./build-recommendation";

const base = {
  marketId: `0x${"1".repeat(64)}`,
  status: "FILLED" as const,
  nowUnixSeconds: 1_000_000,
  marketExpiryUnixSeconds: 1_001_000,
  requestedHorizonEndsAt: 1_010_000,
  futureBudgetReserveRaw: "10000000",
};

describe("buildManualRolloverRecommendation", () => {
  it("waits while a filled position is still active", () => {
    expect(buildManualRolloverRecommendation(base)).toBeNull();
  });

  it("recommends a fresh review near expiry", () => {
    expect(buildManualRolloverRecommendation({
      ...base,
      marketExpiryUnixSeconds: base.nowUnixSeconds + 299,
    })?.trigger).toBe("NEAR_EXPIRY");
  });

  it("does not treat an unsigned review as an active expiring position", () => {
    expect(buildManualRolloverRecommendation({
      ...base,
      status: "REVIEWED",
      marketExpiryUnixSeconds: base.nowUnixSeconds + 299,
    })).toBeNull();
  });

  it.each(["CANCELLED_IOC", "PARTIALLY_FILLED", "FAILED"] as const)(
    "recommends immediately when %s leaves the user unprotected",
    (status) => {
      expect(buildManualRolloverRecommendation({ ...base, status })?.trigger)
        .toBe("UNPROTECTED");
    },
  );

  it("does not recommend after the requested horizon or without reserve", () => {
    expect(buildManualRolloverRecommendation({
      ...base,
      status: "FINALIZED",
      requestedHorizonEndsAt: base.nowUnixSeconds,
    })).toBeNull();
    expect(buildManualRolloverRecommendation({
      ...base,
      status: "FINALIZED",
      futureBudgetReserveRaw: "0",
    })).toBeNull();
  });

  it("uses a stable key for one interval", () => {
    const first = buildManualRolloverRecommendation({ ...base, status: "FINALIZED" });
    const second = buildManualRolloverRecommendation({ ...base, status: "CLAIMED" });
    expect(first?.dedupeKey).toBe(second?.dedupeKey);
  });
});
