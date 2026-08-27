import { describe, expect, it } from "vitest";

import { mapWithConcurrency, readJsonObject } from "./api";

describe("readJsonObject", () => {
  it("accepts a bounded JSON object", async () => {
    const request = new Request("http://local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ safe: true }),
    });
    await expect(readJsonObject(request)).resolves.toEqual({ safe: true });
  });

  it("rejects the wrong content type", async () => {
    const request = new Request("http://local", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}",
    });
    await expect(readJsonObject(request)).rejects.toThrow(/content-type/);
  });

  it("rejects oversized bodies even without a content-length header", async () => {
    const request = new Request("http://local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(17_000) }),
    });
    await expect(readJsonObject(request)).rejects.toThrow(/too large/);
  });
});

describe("mapWithConcurrency", () => {
  it("preserves order and bounds active work", async () => {
    let active = 0;
    let maximumActive = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });
    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(maximumActive).toBeLessThanOrEqual(2);
  });
});
