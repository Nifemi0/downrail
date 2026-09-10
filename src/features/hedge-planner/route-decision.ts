import type { ProtectionVerdict } from "./evaluate-protection-quality";

export type RouteDecision = {
  status: "REVIEW" | "SKIP" | "UNAVAILABLE";
  reason:
    | "worth_reviewing"
    | "no_executable_route"
    | "below_offset_target"
    | "weak_return_for_cost"
    | "oversized_for_scenario";
};

type RouteDecisionInput = {
  hasExecutableLeg: boolean;
  verdict: ProtectionVerdict;
  efficiencyBps: number;
};

/**
 * Converts route arithmetic into a conservative product gate. A route may only
 * open wallet review when it reaches the user's offset target and its winning
 * net gain is at least the premium at risk.
 */
export function evaluateRouteDecision(input: RouteDecisionInput): RouteDecision {
  if (!input.hasExecutableLeg || input.verdict === "UNAVAILABLE") {
    return { status: "UNAVAILABLE", reason: "no_executable_route" };
  }
  if (input.verdict === "OVERSIZED") {
    return { status: "SKIP", reason: "oversized_for_scenario" };
  }
  if (input.verdict === "PARTIAL_OFFSET") {
    return { status: "SKIP", reason: "below_offset_target" };
  }
  if (input.efficiencyBps < 10_000) {
    return { status: "SKIP", reason: "weak_return_for_cost" };
  }
  return { status: "REVIEW", reason: "worth_reviewing" };
}
