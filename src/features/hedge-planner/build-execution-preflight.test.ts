import { ORDER_TYPE } from "@somnia-chain/markets-sdk";
import { decodeFunctionData } from "viem";
import { describe, expect, it } from "vitest";

import {
  buildBoundedCollateralApproval,
  buildBuyNoOrderPreflight,
} from "./build-execution-preflight";

const POOL = "0x1111111111111111111111111111111111111111";
const NOW = 1_800_000_000;

function leg(overrides: Record<string, unknown> = {}) {
  return {
    poolAddress: POOL,
    expiryUnixSeconds: NOW + 3_600,
    limitPriceRaw: "426000",
    quantityRaw: "10000000",
    ...overrides,
  };
}

describe("buildBuyNoOrderPreflight", () => {
  it("converts a 0.426 DOWN quote to the SDK's 0.574 YES price", () => {
    const result = buildBuyNoOrderPreflight(leg(), 6, NOW);

    expect(result.downLimitPriceRaw).toBe(426_000n);
    expect(result.yesLimitPriceRaw).toBe(574_000n);
    expect(result.params.price).toBe(574_000n);
    expect(result.params.side).toBe("BUY_NO");
  });

  it("uses a five-minute immediate-or-cancel safety window", () => {
    const result = buildBuyNoOrderPreflight(leg(), 6, NOW);

    expect(result.params.orderType).toBe(ORDER_TYPE.MARKET);
    expect(result.validUntilUnixSeconds).toBe(NOW + 300);
    expect(result.params.expireTimestampNs).toBe(
      BigInt(NOW + 300) * 1_000_000_000n,
    );
  });

  it("caps the order expiry at the market expiry", () => {
    const result = buildBuyNoOrderPreflight(
      leg({ expiryUnixSeconds: NOW + 30 }),
      6,
      NOW,
    );

    expect(result.validUntilUnixSeconds).toBe(NOW + 30);
  });

  it.each([
    ["missing pool", leg({ poolAddress: undefined })],
    ["invalid DOWN price", leg({ limitPriceRaw: "1000000" })],
    ["zero quantity", leg({ quantityRaw: "0" })],
    ["expired market", leg({ expiryUnixSeconds: NOW })],
  ])("rejects %s", (_label, invalidLeg) => {
    expect(() => buildBuyNoOrderPreflight(invalidLeg, 6, NOW)).toThrow(
      RangeError,
    );
  });
});

describe("buildBoundedCollateralApproval", () => {
  it("approves only the reviewed maximum cost instead of max uint256", () => {
    const approval = buildBoundedCollateralApproval(
      {
        to: "0x2222222222222222222222222222222222222222",
        data: "0x",
        value: 0n,
        description: "SDK unlimited approval",
      },
      POOL,
      2_000_000n,
    );
    const decoded = decodeFunctionData({
      abi: [{
        type: "function",
        name: "approve",
        stateMutability: "nonpayable",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
      }] as const,
      data: approval.data,
    });

    expect(decoded.functionName).toBe("approve");
    expect(decoded.args).toEqual([POOL, 2_000_000n]);
    expect(approval.description).toContain("2000000");
  });
});
