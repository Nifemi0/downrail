import { isAddress, isHash, keccak256, toHex } from "viem";
import { z } from "zod";

export const REVIEW_SCHEMA_VERSION = 1 as const;
export const SHANNON_CHAIN_ID = 50_312 as const;

const addressSchema = z.string().refine(isAddress, "invalid EVM address");
const hashSchema = z.string().refine(isHash, "invalid bytes32 hash");
const unsignedIntegerSchema = z.string().regex(/^\d+$/, "expected unsigned integer string");
const positiveIntegerSchema = unsignedIntegerSchema.refine(
  (value) => BigInt(value) > 0n,
  "expected positive integer string",
);
const dateTimeSchema = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)),
  "invalid date-time",
);
const calldataSchema = z.string().regex(/^0x(?:[0-9a-fA-F]{2})*$/, "invalid calldata");

export const reviewedCallSchema = z.object({
  kind: z.enum(["APPROVAL", "ORDER"]),
  to: addressSchema,
  data: calldataSchema,
  value: unsignedIntegerSchema,
  description: z.string().min(1).max(500),
}).strict();

export const reviewedLegSchema = z.object({
  marketId: hashSchema,
  poolAddress: addressSchema,
  collateralToken: addressSchema,
  side: z.literal("BUY_NO"),
  orderType: z.literal("IMMEDIATE_OR_CANCEL"),
  downLimitPriceRaw: positiveIntegerSchema,
  sdkYesLimitPriceRaw: positiveIntegerSchema,
  quantityRaw: positiveIntegerSchema,
  maximumCostRaw: positiveIntegerSchema,
  marketExpiryUnixSeconds: z.number().int().positive(),
  validUntil: dateTimeSchema,
  calls: z.array(reviewedCallSchema).min(1).max(2),
}).strict();

export const reviewedPlanSchema = z.object({
  asset: z.enum(["BTC", "ETH"]),
  requestedHorizonEndsAt: z.number().int().positive(),
  totalMaximumCostRaw: positiveIntegerSchema,
  futureBudgetReserveRaw: unsignedIntegerSchema,
  conditionalNetPayoutRaw: unsignedIntegerSchema,
  modeledPortfolioLossRaw: positiveIntegerSchema,
}).strict();

export const reviewCommitmentSchema = z.object({
  schemaVersion: z.literal(REVIEW_SCHEMA_VERSION),
  account: addressSchema,
  chainId: z.literal(SHANNON_CHAIN_ID),
  quoteDecimals: z.number().int().min(0).max(18),
  generatedAt: dateTimeSchema,
  plan: reviewedPlanSchema,
  legs: z.array(reviewedLegSchema).length(1),
}).strict();

export const orderReviewSchema = reviewCommitmentSchema.extend({
  mode: z.literal("UNSIGNED_REVIEW"),
  fingerprint: hashSchema,
  warnings: z.array(z.string().min(1).max(500)),
}).strict();

export type ReviewedCall = z.infer<typeof reviewedCallSchema>;
export type ReviewedLeg = z.infer<typeof reviewedLegSchema>;
export type ReviewCommitment = z.infer<typeof reviewCommitmentSchema>;
export type OrderReview = z.infer<typeof orderReviewSchema>;

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite number in review");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  throw new TypeError(`unsupported review value: ${typeof value}`);
}

export function createReviewFingerprint(input: ReviewCommitment): `0x${string}` {
  const commitment = reviewCommitmentSchema.parse(input);
  return keccak256(toHex(canonicalJson(commitment)));
}

export function assertReviewFingerprint(review: OrderReview): ReviewCommitment {
  const parsed = orderReviewSchema.parse(review);
  const commitment = reviewCommitmentSchema.parse({
    schemaVersion: parsed.schemaVersion,
    account: parsed.account,
    chainId: parsed.chainId,
    quoteDecimals: parsed.quoteDecimals,
    generatedAt: parsed.generatedAt,
    plan: parsed.plan,
    legs: parsed.legs,
  });
  if (createReviewFingerprint(commitment).toLowerCase() !== parsed.fingerprint.toLowerCase()) {
    throw new RangeError("review fingerprint does not match its committed payload");
  }
  return commitment;
}
