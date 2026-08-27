import { isAddress, isHash } from "viem";
import { z } from "zod";

export const SETTLEMENT_SCHEMA_VERSION = 1 as const;

export const settlementPositionSchema = z.object({
  marketId: z.string().refine(isHash),
  marketAddress: z.string().refine(isAddress),
  poolAddress: z.string().refine(isAddress),
  collateralToken: z.string().refine(isAddress),
  outcomeToken: z.string().refine(isAddress),
  asset: z.string().min(1),
  question: z.string().min(1),
  outcome: z.enum(["YES", "NO"]),
  outcomeIndex: z.union([z.literal(0), z.literal(1)]),
  outcomeId: z.string().regex(/^\d+$/),
  balanceRaw: z.string().regex(/^\d+$/),
  estimatedPayoutRaw: z.string().regex(/^\d+$/),
  quoteDecimals: z.number().int().min(0).max(18),
  expiryUnixSeconds: z.number().int().positive(),
  status: z.enum([
    "OPEN",
    "WAITING_FINALIZATION",
    "CLAIMABLE",
    "LOSING_POSITION",
    "VOIDED_CLAIMABLE",
  ]),
  finalized: z.boolean(),
  voided: z.boolean(),
  winningOutcome: z.union([z.literal(0), z.literal(1), z.null()]),
}).strict();

export const settlementInboxSchema = z.object({
  schemaVersion: z.literal(SETTLEMENT_SCHEMA_VERSION),
  mode: z.literal("SETTLEMENT_DISCOVERY"),
  generatedAt: z.string().datetime(),
  account: z.string().refine(isAddress),
  chainId: z.literal(50_312),
  positions: z.array(settlementPositionSchema).max(200),
  owedFallbacks: z.array(z.object({
    settlement: z.string().refine(isAddress),
    collateralToken: z.string().refine(isAddress),
    amountRaw: z.string().regex(/^\d+$/),
  }).strict()).max(20),
}).strict();

export type SettlementPosition = z.infer<typeof settlementPositionSchema>;
export type SettlementInbox = z.infer<typeof settlementInboxSchema>;

export function classifySettlementPosition(input: {
  balance: bigint;
  finalized: boolean;
  resolved: boolean;
  voided: boolean;
  outcomeIndex: 0 | 1;
  winningOutcome: 0 | 1 | null;
  payoutNumerator: bigint;
  payoutDenominator: bigint;
}) {
  let status: SettlementPosition["status"] = "OPEN";
  if (input.resolved && !input.finalized) status = "WAITING_FINALIZATION";
  if (input.finalized && input.voided && input.balance > 0n) {
    status = "VOIDED_CLAIMABLE";
  } else if (input.finalized && input.winningOutcome === input.outcomeIndex && input.balance > 0n) {
    status = "CLAIMABLE";
  } else if (input.finalized) {
    status = "LOSING_POSITION";
  }
  const estimatedPayout = input.payoutDenominator > 0n
    ? input.balance * input.payoutNumerator / input.payoutDenominator
    : 0n;
  return { status, estimatedPayout };
}
