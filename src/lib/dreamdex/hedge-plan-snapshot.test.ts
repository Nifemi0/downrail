import { describe, expect, it } from "vitest";

import { didEveryOnchainReadFail } from "./hedge-plan-snapshot";

describe("didEveryOnchainReadFail", () => {
  it("reports a complete verification outage", () => {
    expect(
      didEveryOnchainReadFail([
        { readFailure: true },
        { readFailure: true },
      ]),
    ).toBe(true);
  });

  it("does not label a partial failure as a complete outage", () => {
    expect(
      didEveryOnchainReadFail([
        { readFailure: true },
        {},
      ]),
    ).toBe(false);
  });

  it("does not label an empty candidate set as an outage", () => {
    expect(didEveryOnchainReadFail([])).toBe(false);
  });
});
