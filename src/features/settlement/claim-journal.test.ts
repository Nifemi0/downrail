import { describe, expect, it } from "vitest";

import { claimJournalId, readClaimJournal, saveClaimReview, updateClaimJournal } from "./claim-journal";
import type { ClaimReview } from "./claim-review";

const review = {
  chainId: 50_312,
  account: "0x1111111111111111111111111111111111111111",
  marketId: `0x${"44".repeat(32)}`,
  fingerprint: `0x${"55".repeat(32)}`,
  generatedAt: new Date().toISOString(),
} as unknown as ClaimReview;

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("claim journal", () => {
  it("persists and updates public claim pointers", () => {
    const storage = new MemoryStorage();
    saveClaimReview(storage, review);
    const id = claimJournalId(review);
    updateClaimJournal(storage, id, { status: "CLAIM_SUBMITTED", hash: `0x${"66".repeat(32)}` });
    expect(readClaimJournal(storage)[0]).toMatchObject({ status: "CLAIM_SUBMITTED" });
  });

  it("ignores corrupt storage", () => {
    const storage = new MemoryStorage();
    storage.setItem("downrail.claim-journal.v1", "broken");
    expect(readClaimJournal(storage)).toEqual([]);
  });
});
