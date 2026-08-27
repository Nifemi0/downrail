import {
  decodeFunctionData,
  getAddress,
  parseAbi,
  type Hex,
  zeroAddress,
} from "viem";

import {
  assertReviewFingerprint,
  type OrderReview,
  type ReviewedCall,
} from "./review-schema";

const ERC20_APPROVAL_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);
const BINARY_ORDER_ABI = parseAbi([
  "function placeBinaryOrder(uint8 kind, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k, uint64 userData) payable returns (bool success, uint128 id)",
]);

export type DecodedReviewedCall = {
  kind: "APPROVAL" | "ORDER";
  functionName: "approve" | "placeBinaryOrder";
  target: string;
  summary: string;
};

function sameAddress(left: string, right: string) {
  return getAddress(left) === getAddress(right);
}

function requireZeroValue(call: ReviewedCall) {
  if (BigInt(call.value) !== 0n) {
    throw new RangeError(`${call.kind.toLowerCase()} call must send zero native value`);
  }
}

function decodeApproval(review: OrderReview, call: ReviewedCall): DecodedReviewedCall {
  const leg = review.legs[0];
  if (!sameAddress(call.to, leg.collateralToken)) {
    throw new RangeError("approval target is not the reviewed collateral token");
  }
  const decoded = decodeFunctionData({ abi: ERC20_APPROVAL_ABI, data: call.data as Hex });
  if (decoded.functionName !== "approve") {
    throw new RangeError("approval call has an unexpected selector");
  }
  const [spender, amount] = decoded.args;
  if (!sameAddress(spender, leg.poolAddress)) {
    throw new RangeError("approval spender is not the reviewed pool");
  }
  if (amount !== BigInt(leg.maximumCostRaw)) {
    throw new RangeError("approval amount does not equal the reviewed maximum cost");
  }
  return {
    kind: "APPROVAL",
    functionName: "approve",
    target: getAddress(call.to),
    summary: `Approve exactly ${amount} raw collateral units for ${getAddress(spender)}`,
  };
}

function decodeOrder(review: OrderReview, call: ReviewedCall): DecodedReviewedCall {
  const leg = review.legs[0];
  requireZeroValue(call);
  if (!sameAddress(call.to, leg.poolAddress)) {
    throw new RangeError("order target is not the reviewed pool");
  }
  const decoded = decodeFunctionData({ abi: BINARY_ORDER_ABI, data: call.data as Hex });
  if (decoded.functionName !== "placeBinaryOrder") {
    throw new RangeError("order call has an unexpected selector");
  }
  const [
    kind,
    yesPrice,
    quantity,
    expireTimestampNs,
    orderType,
    selfMatchingOption,
    builder,
    builderFeeBpsTimes1k,
    userData,
  ] = decoded.args;
  if (Number(expireTimestampNs / 1_000_000_000n) > leg.marketExpiryUnixSeconds) {
    throw new RangeError("order expiry exceeds the reviewed market expiry");
  }

  if (Number(kind) !== 2) throw new RangeError("order is not BUY_NO");
  if (Number(orderType) !== 2) throw new RangeError("order is not immediate-or-cancel");
  if (Number(selfMatchingOption) !== 0) {
    throw new RangeError("order has an unexpected self-matching option");
  }
  if (!sameAddress(builder, zeroAddress) || builderFeeBpsTimes1k !== 0n) {
    throw new RangeError("order contains an unreviewed builder fee");
  }
  if (userData !== 0n) throw new RangeError("order contains unexpected user data");
  if (yesPrice !== BigInt(leg.sdkYesLimitPriceRaw)) {
    throw new RangeError("encoded YES price differs from the reviewed price");
  }
  if (quantity !== BigInt(leg.quantityRaw)) {
    throw new RangeError("encoded quantity differs from the reviewed quantity");
  }

  const validUntilSeconds = BigInt(Math.floor(Date.parse(leg.validUntil) / 1_000));
  if (expireTimestampNs !== validUntilSeconds * 1_000_000_000n) {
    throw new RangeError("encoded order expiry differs from the reviewed expiry");
  }

  const oneQuote = 10n ** BigInt(review.quoteDecimals);
  const downPrice = BigInt(leg.downLimitPriceRaw);
  if (downPrice + yesPrice !== oneQuote) {
    throw new RangeError("DOWN and SDK YES prices are not complementary");
  }
  const recomputedMaximumCost =
    (quantity * downPrice + oneQuote - 1n) / oneQuote;
  if (recomputedMaximumCost !== BigInt(leg.maximumCostRaw)) {
    throw new RangeError("decoded order cost differs from the reviewed maximum cost");
  }
  if (recomputedMaximumCost !== BigInt(review.plan.totalMaximumCostRaw)) {
    throw new RangeError("decoded order cost differs from the reviewed plan total");
  }

  return {
    kind: "ORDER",
    functionName: "placeBinaryOrder",
    target: getAddress(call.to),
    summary: `BUY_NO IOC ${quantity} raw units at DOWN ${downPrice}; max cost ${recomputedMaximumCost}`,
  };
}

export function validateReviewedOrder(review: OrderReview): DecodedReviewedCall[] {
  assertReviewFingerprint(review);
  const leg = review.legs[0];
  const calls = leg.calls;
  if (
    calls.length < 1 ||
    calls.length > 2 ||
    calls.at(-1)?.kind !== "ORDER" ||
    (calls.length === 2 && calls[0]?.kind !== "APPROVAL")
  ) {
    throw new RangeError("review must contain an optional approval followed by one order");
  }

  return calls.map((call) => {
    requireZeroValue(call);
    return call.kind === "APPROVAL"
      ? decodeApproval(review, call)
      : decodeOrder(review, call);
  });
}
