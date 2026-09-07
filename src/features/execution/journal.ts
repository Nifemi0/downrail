import { isAddress, isHash } from "viem";
import { z } from "zod";

import type { OrderReview } from "./review-schema";

export const EXECUTION_JOURNAL_VERSION = 1 as const;
export const EXECUTION_JOURNAL_KEY = "downrail.execution-journal.v1";
export const EXECUTION_JOURNAL_UPDATED_EVENT = "downrail:execution-journal-updated";

export const executionStatusSchema = z.enum([
  "REVIEWED",
  "APPROVAL_SUBMITTED",
  "APPROVAL_CONFIRMED",
  "ORDER_SUBMITTED",
  "ORDER_CONFIRMED",
  "INDEXING_PENDING",
  "FILLED",
  "PARTIALLY_FILLED",
  "CANCELLED_IOC",
  "RESTING",
  "EXPIRED",
  "RESOLVED",
  "FINALIZED",
  "CLAIMABLE",
  "CLAIM_SUBMITTED",
  "CLAIMED",
  "FAILED",
]);

const journalCallSchema = z.object({
  kind: z.enum(["APPROVAL", "ORDER"]),
  hash: z.string().refine(isHash).optional(),
  receiptBlock: z.string().regex(/^0x[0-9a-f]+$/i).optional(),
}).strict();

export const executionJournalRecordSchema = z.object({
  schemaVersion: z.literal(EXECUTION_JOURNAL_VERSION),
  id: z.string().min(1),
  account: z.string().refine(isAddress),
  chainId: z.literal(50_312),
  marketId: z.string().refine(isHash),
  fingerprint: z.string().refine(isHash),
  reviewedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  updatedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  executionStartedAt: z.string().datetime().optional(),
  status: executionStatusSchema,
  calls: z.array(journalCallSchema).max(2),
  rolloverContext: z.object({
    asset: z.enum(["BTC", "ETH"]),
    requestedHorizonEndsAt: z.number().int().positive(),
    futureBudgetReserveRaw: z.string().regex(/^\d+$/),
    marketExpiryUnixSeconds: z.number().int().positive(),
    quoteDecimals: z.number().int().min(0).max(18),
  }).strict().optional(),
  lastError: z.string().max(1_000).optional(),
}).strict();

const journalSchema = z.array(executionJournalRecordSchema).max(100);

export type ExecutionStatus = z.infer<typeof executionStatusSchema>;
export type ExecutionJournalRecord = z.infer<typeof executionJournalRecordSchema>;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function executionReviewWasUsed(record: ExecutionJournalRecord | undefined) {
  return Boolean(record && (record.executionStartedAt || record.calls.some((call) => call.hash)));
}

/** Reserve before opening the wallet; ambiguous or cancelled attempts need a fresh review. */
export function startReviewedExecution(storage: StorageLike, review: OrderReview) {
  const records = readExecutionJournal(storage);
  const id = executionJournalId(review);
  const record = records.find((item) => item.id === id);
  if (!record) throw new Error("Save a fresh review before submitting.");
  if (executionReviewWasUsed(record)) throw new Error("This review was already used. Recheck its transaction or build a fresh review.");
  const started = { ...record, executionStartedAt: new Date().toISOString() };
  return writeExecutionJournal(storage, [started, ...records.filter((item) => item.id !== id)]);
}

export function executionJournalId(review: OrderReview) {
  return [
    review.chainId,
    review.account.toLowerCase(),
    review.legs[0].marketId.toLowerCase(),
    review.fingerprint.toLowerCase(),
  ].join(":");
}

export function readExecutionJournal(storage: StorageLike): ExecutionJournalRecord[] {
  const raw = storage.getItem(EXECUTION_JOURNAL_KEY);
  if (!raw) return [];
  try {
    return journalSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeExecutionJournal(
  storage: StorageLike,
  records: ExecutionJournalRecord[],
) {
  const validated = journalSchema.parse(records.slice(0, 100));
  storage.setItem(EXECUTION_JOURNAL_KEY, JSON.stringify(validated));
  return validated;
}

export function saveReviewedExecution(
  storage: StorageLike,
  review: OrderReview,
): ExecutionJournalRecord[] {
  const records = readExecutionJournal(storage);
  const id = executionJournalId(review);
  const now = new Date().toISOString();
  const existing = records.find((record) => record.id === id);
  const next: ExecutionJournalRecord = existing ?? {
    schemaVersion: EXECUTION_JOURNAL_VERSION,
    id,
    account: review.account,
    chainId: review.chainId,
    marketId: review.legs[0].marketId,
    fingerprint: review.fingerprint,
    reviewedAt: review.generatedAt,
    updatedAt: now,
    status: "REVIEWED",
    calls: review.legs[0].calls.map((call) => ({ kind: call.kind })),
    rolloverContext: {
      asset: review.plan.asset,
      requestedHorizonEndsAt: review.plan.requestedHorizonEndsAt,
      futureBudgetReserveRaw: review.plan.futureBudgetReserveRaw,
      marketExpiryUnixSeconds: review.legs[0].marketExpiryUnixSeconds,
      quoteDecimals: review.quoteDecimals,
    },
  };
  const updated = { ...next, updatedAt: now };
  return writeExecutionJournal(storage, [
    updated,
    ...records.filter((record) => record.id !== id),
  ]);
}

export function updateExecutionJournal(
  storage: StorageLike,
  id: string,
  update: {
    status: ExecutionStatus;
    callKind?: "APPROVAL" | "ORDER";
    hash?: string;
    receiptBlock?: string;
    lastError?: string;
  },
): ExecutionJournalRecord[] {
  const records = readExecutionJournal(storage);
  const current = records.find((record) => record.id === id);
  if (!current) throw new RangeError("execution journal record does not exist");
  const previousHash = current.calls.find((call) => call.kind === update.callKind)?.hash;
  if (previousHash && update.hash && previousHash.toLowerCase() !== update.hash.toLowerCase()) {
    throw new Error("Cannot overwrite a submitted transaction. Build a fresh review.");
  }
  const calls = current.calls.map((call) =>
    update.callKind === call.kind
      ? {
          ...call,
          ...(update.hash ? { hash: update.hash } : {}),
          ...(update.receiptBlock ? { receiptBlock: update.receiptBlock } : {}),
        }
      : call,
  );
  const next = executionJournalRecordSchema.parse({
    ...current,
    status: update.status,
    calls,
    updatedAt: new Date().toISOString(),
    ...(update.lastError ? { lastError: update.lastError } : {}),
  });
  return writeExecutionJournal(storage, [
    next,
    ...records.filter((record) => record.id !== id),
  ]);
}

export function markClaimedExecutionForMarket(
  storage: StorageLike,
  account: string,
  marketId: string,
): ExecutionJournalRecord[] {
  if (!isAddress(account)) throw new TypeError("account must be a valid address");
  if (!isHash(marketId)) throw new TypeError("marketId must be a valid hash");

  const normalizedAccount = account.toLowerCase();
  const normalizedMarketId = marketId.toLowerCase();
  const updatedAt = new Date().toISOString();
  const records = readExecutionJournal(storage);
  const next = records.map((record) => {
    const hasSubmittedOrder = record.calls.some(
      (call) => call.kind === "ORDER" && call.hash,
    );
    if (
      record.account.toLowerCase() !== normalizedAccount
      || record.marketId.toLowerCase() !== normalizedMarketId
      || !hasSubmittedOrder
    ) {
      return record;
    }

    const claimed = {
      ...record,
      status: "CLAIMED" as const,
      updatedAt,
    };
    delete claimed.lastError;
    return executionJournalRecordSchema.parse(claimed);
  });

  return writeExecutionJournal(storage, next);
}
