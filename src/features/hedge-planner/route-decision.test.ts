import { describe, expect, it } from "vitest";

import { evaluateRouteDecision } from "./route-decision";

describe("evaluateRouteDecision", () => {
  it("allows wallet review only for a target-meeting route with a strong enough return", () => {
    expect(evaluateRouteDecision({
      hasExecutableLeg: true,
      verdict: "TARGET_MET",
      efficiencyBps: 10_000,
    })).toEqual({ status: "REVIEW", reason: "worth_reviewing" });
  });

  it("refuses a route that does not reach the user's offset target", () => {
    expect(evaluateRouteDecision({
      hasExecutableLeg: true,
      verdict: "PARTIAL_OFFSET",
      efficiencyBps: 25_000,
    })).toEqual({ status: "SKIP", reason: "below_offset_target" });
  });

  it("refuses target-meeting routes whose net winning gain is below the premium", () => {
    expect(evaluateRouteDecision({
      hasExecutableLeg: true,
      verdict: "TARGET_MET",
      efficiencyBps: 9_999,
    })).toEqual({ status: "SKIP", reason: "weak_return_for_cost" });
  });

  it("refuses oversized and unavailable routes", () => {
    expect(evaluateRouteDecision({
      hasExecutableLeg: true,
      verdict: "OVERSIZED",
      efficiencyBps: 40_000,
    }).status).toBe("SKIP");
    expect(evaluateRouteDecision({
      hasExecutableLeg: false,
      verdict: "UNAVAILABLE",
      efficiencyBps: 0,
    }).status).toBe("UNAVAILABLE");
  });
});
