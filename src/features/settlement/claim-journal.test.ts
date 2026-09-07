import { describe, expect, it } from "vitest";

import { claimJournalId, readClaimJournal, saveClaimReview, updateClaimJournal, verifyConfirmedClaim } from "./claim-journal";
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
  it("does not downgrade a confirmed receipt when balance verification fails", async () => {
    const storage = new MemoryStorage();
    saveClaimReview(storage, review);
    const id = claimJournalId(review);
    const hash = `0x${"66".repeat(32)}` as const;
    updateClaimJournal(storage, id, { status: "CLAIM_CONFIRMED", hash });
    await expect(verifyConfirmedClaim(storage, id, async () => { throw new Error("502"); })).rejects.toThrow("502");
    updateClaimJournal(storage, id, { status: "FAILED", lastError: "502" });
    expect(readClaimJournal(storage)[0]).toMatchObject({ status: "CLAIM_CONFIRMED", hash });
  });

  it("recovers a confirmed claim with a read-only balance check", async () => {
    const storage = new MemoryStorage();
    saveClaimReview(storage, review);
    const id = claimJournalId(review);
    updateClaimJournal(storage, id, { status: "CLAIM_CONFIRMED" });
    await verifyConfirmedClaim(storage, id, async (account) => ({
      schemaVersion: 1, mode: "SETTLEMENT_DISCOVERY", account, chainId: 50312,
      generatedAt: new Date().toISOString(), positions: [], owedFallbacks: [],
    }));
    expect(readClaimJournal(storage)[0].status).toBe("CLAIMED");
    updateClaimJournal(storage, id, { status: "FAILED" });
    expect(readClaimJournal(storage)[0].status).toBe("CLAIMED");
  });

  it("rejects a balance response for another wallet", async () => {
    const storage = new MemoryStorage();
    saveClaimReview(storage, review);
    const id = claimJournalId(review);
    updateClaimJournal(storage, id, { status: "CLAIM_CONFIRMED" });
    await expect(verifyConfirmedClaim(storage, id, async () => ({
      schemaVersion: 1, mode: "SETTLEMENT_DISCOVERY", account: "0x2222222222222222222222222222222222222222", chainId: 50312,
      generatedAt: new Date().toISOString(), positions: [], owedFallbacks: [],
    }))).rejects.toThrow("different account");
    expect(readClaimJournal(storage)[0].status).toBe("CLAIM_CONFIRMED");
  });
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
