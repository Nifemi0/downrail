import {
  binaryModuleWriteAbi,
  erc6909Abi,
} from "@somnia-chain/markets-sdk";
import {
  decodeFunctionData,
  getAddress,
  isAddress,
  isHash,
  keccak256,
  toHex,
  type Hex,
} from "viem";
import { z } from "zod";

import { canonicalJson } from "@/features/execution/review-schema";

export const CLAIM_REVIEW_SCHEMA_VERSION = 1 as const;

const address = z.string().refine(isAddress);
const hash = z.string().refine(isHash);
const uint = z.string().regex(/^\d+$/);
const positiveUint = uint.refine((value) => BigInt(value) > 0n);
const datetime = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const calldata = z.string().regex(/^0x(?:[0-9a-fA-F]{2})*$/);

export const claimCallSchema = z.object({
  kind: z.enum(["OUTCOME_APPROVAL", "REDEEM"]),
  to: address,
  data: calldata,
  value: z.literal("0"),
  description: z.string().min(1).max(500),
}).strict();

export const claimCommitmentSchema = z.object({
  schemaVersion: z.literal(CLAIM_REVIEW_SCHEMA_VERSION),
  account: address,
  chainId: z.literal(50_312),
  generatedAt: datetime,
  validUntil: datetime,
  module: address,
  outcomeToken: address,
  marketId: hash,
  outcomeIndex: z.union([z.literal(0), z.literal(1)]),
  outcomeId: positiveUint,
  amountRaw: positiveUint,
  estimatedPayoutRaw: positiveUint,
  quoteDecimals: z.number().int().min(0).max(18),
  operatorId: z.number().int().min(0).max(4_294_967_295),
  venueId: hash,
  calls: z.array(claimCallSchema).min(1).max(2),
}).strict();

export const claimReviewSchema = claimCommitmentSchema.extend({
  mode: z.literal("UNSIGNED_CLAIM_REVIEW"),
  fingerprint: hash,
  warnings: z.array(z.string().min(1).max(500)),
}).strict();

export type ClaimCommitment = z.infer<typeof claimCommitmentSchema>;
export type ClaimReview = z.infer<typeof claimReviewSchema>;

export function createClaimFingerprint(input: ClaimCommitment): `0x${string}` {
  return keccak256(toHex(canonicalJson(claimCommitmentSchema.parse(input))));
}

export function validateClaimReview(input: ClaimReview) {
  const review = claimReviewSchema.parse(input);
  const commitment = claimCommitmentSchema.parse({
    schemaVersion: review.schemaVersion,
    account: review.account,
    chainId: review.chainId,
    generatedAt: review.generatedAt,
    validUntil: review.validUntil,
    module: review.module,
    outcomeToken: review.outcomeToken,
    marketId: review.marketId,
    outcomeIndex: review.outcomeIndex,
    outcomeId: review.outcomeId,
    amountRaw: review.amountRaw,
    estimatedPayoutRaw: review.estimatedPayoutRaw,
    quoteDecimals: review.quoteDecimals,
    operatorId: review.operatorId,
    venueId: review.venueId,
    calls: review.calls,
  });
  if (createClaimFingerprint(commitment).toLowerCase() !== review.fingerprint.toLowerCase()) {
    throw new RangeError("claim fingerprint does not match its committed payload");
  }
  if (Date.parse(review.validUntil) <= Date.now()) {
    throw new RangeError("claim review has expired");
  }
  const expectedKinds = review.calls.length === 2
    ? ["OUTCOME_APPROVAL", "REDEEM"]
    : ["REDEEM"];
  if (review.calls.some((call, index) => call.kind !== expectedKinds[index])) {
    throw new RangeError("claim calls are not in the required order");
  }

  const summaries: string[] = [];
  for (const call of review.calls) {
    if (call.kind === "OUTCOME_APPROVAL") {
      if (getAddress(call.to) !== getAddress(review.outcomeToken)) {
        throw new RangeError("outcome approval targets an unexpected contract");
      }
      const decoded = decodeFunctionData({ abi: erc6909Abi, data: call.data as Hex });
      if (decoded.functionName !== "setOperator") {
        throw new RangeError("outcome approval has an unexpected selector");
      }
      const [operator, approved] = decoded.args;
      if (getAddress(operator) !== getAddress(review.module) || approved !== true) {
        throw new RangeError("outcome approval does not authorize the reviewed module");
      }
      summaries.push(`Authorize ${getAddress(operator)} to redeem reviewed outcome tokens`);
      continue;
    }
    if (getAddress(call.to) !== getAddress(review.module)) {
      throw new RangeError("redeem call targets an unexpected module");
    }
    const decoded = decodeFunctionData({ abi: binaryModuleWriteAbi, data: call.data as Hex });
    if (decoded.functionName !== "redeem") {
      throw new RangeError("redeem call has an unexpected selector");
    }
    const [operatorId, venueId, marketId, outcomeIndex, amount] = decoded.args;
    if (
      operatorId !== review.operatorId
      || venueId.toLowerCase() !== review.venueId.toLowerCase()
      || marketId.toLowerCase() !== review.marketId.toLowerCase()
      || outcomeIndex !== review.outcomeIndex
      || amount !== BigInt(review.amountRaw)
    ) {
      throw new RangeError("redeem arguments do not match the reviewed claim");
    }
    summaries.push(`Redeem ${amount} raw ${review.outcomeIndex === 1 ? "NO" : "YES"} units`);
  }
  return summaries;
}
