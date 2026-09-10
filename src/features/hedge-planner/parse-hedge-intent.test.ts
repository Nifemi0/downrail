import { describe, expect, it } from "vitest";

import { parseHedgePlanRequest } from "./parse-hedge-intent";

describe("parseHedgePlanRequest", () => {
  it("parses money as exact 6-decimal integers", () => {
    const request = parseHedgePlanRequest(
      new URLSearchParams({
        asset: "ETH",
        exposureUsd: "2000.123456",
        budgetUsd: "20.25",
        downsideMoveBps: "500",
        horizonSeconds: "14400",
      }),
    );

    expect(request.exposureRaw).toBe(2_000_123_456n);
    expect(request.budgetRaw).toBe(20_250_000n);
    expect(request.targetCoverageBps).toBe(2_500n);
    expect(request.rolloverReserveBps).toBe(0n);
    expect(request.maxMarkets).toBe(3);
  });

  it("parses an explicit rollover reserve", () => {
    const request = parseHedgePlanRequest(
      new URLSearchParams({
        asset: "ETH",
        exposureUsd: "1000",
        budgetUsd: "25",
        downsideMoveBps: "500",
        rolloverReserveBps: "3000",
        horizonSeconds: "3600",
      }),
    );

    expect(request.rolloverReserveBps).toBe(3_000n);
  });

  it("accepts a user comparison target within the supported range", () => {
    const request = parseHedgePlanRequest(
      new URLSearchParams({
        asset: "ETH",
        exposureUsd: "1000",
        budgetUsd: "25",
        downsideMoveBps: "2000",
        targetCoverageBps: "5000",
        horizonSeconds: "3600",
      }),
    );

    expect(request.targetCoverageBps).toBe(5_000n);
  });

  it("rejects comparison targets below the supported range", () => {
    expect(() =>
      parseHedgePlanRequest(
        new URLSearchParams({
          asset: "BTC",
          exposureUsd: "1000",
          budgetUsd: "20",
          downsideMoveBps: "2000",
          targetCoverageBps: "1000",
          horizonSeconds: "3600",
        }),
      ),
    ).toThrow("targetCoverageBps must be between 2500 and 10000");
  });

  it("rejects excess decimal precision instead of rounding money", () => {
    expect(() =>
      parseHedgePlanRequest(
        new URLSearchParams({
          asset: "BTC",
          exposureUsd: "1000.0000001",
          budgetUsd: "10",
          downsideMoveBps: "500",
          horizonSeconds: "3600",
        }),
      ),
    ).toThrow("at most 6 places");
  });

  it("rejects a budget greater than the protected exposure", () => {
    expect(() =>
      parseHedgePlanRequest(
        new URLSearchParams({
          asset: "BTC",
          exposureUsd: "100",
          budgetUsd: "101",
          downsideMoveBps: "500",
          horizonSeconds: "3600",
        }),
      ),
    ).toThrow("no greater than exposureUsd");
  });

  it("rejects unsupported horizons and excessive market fan-out", () => {
    const base = {
      asset: "ETH",
      exposureUsd: "1000",
      budgetUsd: "10",
      downsideMoveBps: "500",
    };

    expect(() =>
      parseHedgePlanRequest(
        new URLSearchParams({ ...base, horizonSeconds: "899" }),
      ),
    ).toThrow("between 900 and 86400");
    expect(() =>
      parseHedgePlanRequest(
        new URLSearchParams({
          ...base,
          horizonSeconds: "3600",
          maxMarkets: "5",
        }),
      ),
    ).toThrow("maxMarkets must be between 1 and 4");
  });
});
