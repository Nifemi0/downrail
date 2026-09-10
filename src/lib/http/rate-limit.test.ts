import { afterEach, describe, expect, it } from "vitest";

import { rateLimitResponse, resetRateLimitsForTests } from "./rate-limit";

afterEach(resetRateLimitsForTests);

describe("rateLimitResponse", () => {
  it("allows requests within the window and blocks the next request", async () => {
    const request = new Request("https://downrail.test/api", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });
    const rule = { limit: 2, windowMs: 60_000 };

    expect(rateLimitResponse(request, "planner", rule, 1_000)).toBeNull();
    expect(rateLimitResponse(request, "planner", rule, 1_001)).toBeNull();
    const blocked = rateLimitResponse(request, "planner", rule, 1_002);

    expect(blocked?.status).toBe(429);
    await expect(blocked?.json()).resolves.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("keeps route scopes and client addresses independent", () => {
    const first = new Request("https://downrail.test/api", {
      headers: { "x-real-ip": "203.0.113.1" },
    });
    const second = new Request("https://downrail.test/api", {
      headers: { "x-real-ip": "203.0.113.2" },
    });
    const rule = { limit: 1, windowMs: 60_000 };

    expect(rateLimitResponse(first, "planner", rule, 1_000)).toBeNull();
    expect(rateLimitResponse(second, "planner", rule, 1_000)).toBeNull();
    expect(rateLimitResponse(first, "claims", rule, 1_000)).toBeNull();
  });

  it("opens a fresh bucket after the window resets", () => {
    const request = new Request("https://downrail.test/api");
    const rule = { limit: 1, windowMs: 1_000 };

    expect(rateLimitResponse(request, "planner", rule, 1_000)).toBeNull();
    expect(rateLimitResponse(request, "planner", rule, 1_100)?.status).toBe(429);
    expect(rateLimitResponse(request, "planner", rule, 2_001)).toBeNull();
  });
});
