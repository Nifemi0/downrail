import { isAddress, isHash, type Hex } from "viem";
import { z } from "zod";

import type { ClaimReview } from "./claim-review";

export const CLAIM_JOURNAL_KEY = "downrail.claim-journal.v1";

const claimJournalSchema = z.array(z.object({
  id: z.string().min(1),
  account: z.string().refine(isAddress),
  marketId: z.string().refine(isHash),
  fingerprint: z.string().refine(isHash),
  reviewedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(["REVIEWED", "CLAIM_SUBMITTED", "CLAIM_CONFIRMED", "CLAIMED", "FAILED"]),
  hash: z.string().refine(isHash).optional(),
  lastError: z.string().max(1_000).optional(),
  schemaVersion: z.literal(1),
}).strict()).max(100);

export type ClaimJournalRecord = z.infer<typeof claimJournalSchema>[number];
type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function claimJournalId(review: ClaimReview) {
  return `${review.chainId}:${review.account.toLowerCase()}:${review.marketId.toLowerCase()}:${review.fingerprint.toLowerCase()}`;
}

export function readClaimJournal(storage: StorageLike): ClaimJournalRecord[] {
  const raw = storage.getItem(CLAIM_JOURNAL_KEY);
  if (!raw) return [];
  try {
    return claimJournalSchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeClaimJournal(storage: StorageLike, records: ClaimJournalRecord[]) {
  const valid = claimJournalSchema.parse(records.slice(0, 100));
  storage.setItem(CLAIM_JOURNAL_KEY, JSON.stringify(valid));
  return valid;
}

export function saveClaimReview(storage: StorageLike, review: ClaimReview) {
  const records = readClaimJournal(storage);
  const id = claimJournalId(review);
  const now = new Date().toISOString();
  const next: ClaimJournalRecord = records.find((record) => record.id === id) ?? {
    schemaVersion: 1,
    id,
    account: review.account,
    marketId: review.marketId,
    fingerprint: review.fingerprint,
    reviewedAt: review.generatedAt,
    updatedAt: now,
    status: "REVIEWED",
  };
  return writeClaimJournal(storage, [
    { ...next, updatedAt: now },
    ...records.filter((record) => record.id !== id),
  ]);
}

export function updateClaimJournal(
  storage: StorageLike,
  id: string,
  update: { status: ClaimJournalRecord["status"]; hash?: Hex; lastError?: string },
) {
  const records = readClaimJournal(storage);
  const current = records.find((record) => record.id === id);
  if (!current) throw new RangeError("claim journal record does not exist");
  return writeClaimJournal(storage, [
    { ...current, ...update, updatedAt: new Date().toISOString() },
    ...records.filter((record) => record.id !== id),
  ]);
}
