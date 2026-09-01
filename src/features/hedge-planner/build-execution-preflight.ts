import {
  ORDER_TYPE,
  type PlaceOrderParams,
  type UnsignedCall,
} from "@somnia-chain/markets-sdk";
import { encodeFunctionData, isAddress, type Address } from "viem";

const PREFLIGHT_LIFETIME_SECONDS = 300;
const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type ExecutableHedgeLeg = {
  poolAddress?: string;
  expiryUnixSeconds: number;
  limitPriceRaw: string;
  quantityRaw: string;
};

export type BuyNoOrderPreflight = {
  params: PlaceOrderParams;
  downLimitPriceRaw: bigint;
  yesLimitPriceRaw: bigint;
  validUntilUnixSeconds: number;
};

/** Converts a planned DOWN ask into the exact bounded BUY_NO SDK order. */
export function buildBuyNoOrderPreflight(
  leg: ExecutableHedgeLeg,
  quoteDecimals: number,
  nowUnixSeconds: number,
): BuyNoOrderPreflight {
  if (!leg.poolAddress || !isAddress(leg.poolAddress)) {
    throw new RangeError("plan leg is missing a valid pool address");
  }
  if (!Number.isInteger(quoteDecimals) || quoteDecimals < 0 || quoteDecimals > 18) {
    throw new RangeError("quoteDecimals must be an integer between 0 and 18");
  }
  if (!Number.isInteger(nowUnixSeconds) || nowUnixSeconds <= 0) {
    throw new RangeError("nowUnixSeconds must be a positive integer");
  }

  const oneQuote = 10n ** BigInt(quoteDecimals);
  const downLimitPriceRaw = BigInt(leg.limitPriceRaw);
  const quantity = BigInt(leg.quantityRaw);
  if (downLimitPriceRaw <= 0n || downLimitPriceRaw >= oneQuote) {
    throw new RangeError("DOWN limit price must be between zero and one");
  }
  if (quantity <= 0n) {
    throw new RangeError("order quantity must be positive");
  }

  const validUntilUnixSeconds = Math.min(
    leg.expiryUnixSeconds,
    nowUnixSeconds + PREFLIGHT_LIFETIME_SECONDS,
  );
  if (validUntilUnixSeconds <= nowUnixSeconds) {
    throw new RangeError("plan leg has already expired");
  }

  const yesLimitPriceRaw = oneQuote - downLimitPriceRaw;
  return {
    downLimitPriceRaw,
    yesLimitPriceRaw,
    validUntilUnixSeconds,
    params: {
      pool: leg.poolAddress as Address,
      side: "BUY_NO",
      price: yesLimitPriceRaw,
      quantity,
      expireTimestampNs:
        BigInt(validUntilUnixSeconds) * 1_000_000_000n,
      orderType: ORDER_TYPE.MARKET,
      autoApprove: true,
    },
  };
}

/** Replaces the SDK's unlimited approval with the exact reviewed cost cap. */
export function buildBoundedCollateralApproval(
  sdkApproval: UnsignedCall,
  pool: Address,
  maximumCostRaw: bigint,
): UnsignedCall {
  if (!isAddress(sdkApproval.to)) {
    throw new RangeError("approval token address is invalid");
  }
  if (maximumCostRaw <= 0n) {
    throw new RangeError("approval amount must be positive");
  }

  return {
    to: sdkApproval.to,
    data: encodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [pool, maximumCostRaw],
    }),
    value: 0n,
    description: `Approve at most ${maximumCostRaw} raw collateral units for this Downrail order`,
  };
}
