"use client";

import { useEffect, useRef, useState } from "react";

import { useWalletSession } from "@/components/wallet-session";
import {
  EXECUTION_JOURNAL_UPDATED_EVENT,
  markClaimedExecutionForMarket,
} from "@/features/execution/journal";
import {
  claimReviewSchema,
  validateClaimReview,
  type ClaimReview,
} from "@/features/settlement/claim-review";
import {
  settlementInboxSchema,
  type SettlementInbox as SettlementInboxData,
  type SettlementPosition,
} from "@/features/settlement/schema";
import {
  claimJournalId,
  readClaimJournal,
  saveClaimReview,
  updateClaimJournal,
  verifyConfirmedClaim,
  type ClaimJournalRecord,
} from "@/features/settlement/claim-journal";
import { runReviewedClaim } from "@/features/settlement/run-reviewed-claim";

const EXECUTION_ENABLED = process.env.NEXT_PUBLIC_EXECUTION_ENABLED === "true";

function formatRaw(raw: string, decimals: number) {
  const scale = 10n ** BigInt(decimals);
  const value = BigInt(raw);
  const cents = (value * 100n + scale / 2n) / scale;
  return `$${(cents / 100n).toLocaleString("en-US")}.${(cents % 100n).toString().padStart(2, "0")}`;
}

function shortId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function statusLabel(status: SettlementPosition["status"]) {
  return status.toLowerCase().replaceAll("_", " ");
}

export function SettlementInbox({ compact = false }: { compact?: boolean }) {
  const claimInFlight = useRef(false);
  const { account, chainId, provider } = useWalletSession();
  const [inbox, setInbox] = useState<SettlementInboxData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ClaimReview | null>(null);
  const [reviewSummaries, setReviewSummaries] = useState<string[]>([]);
  const [reviewingMarket, setReviewingMarket] = useState<string | null>(null);
  const [claimJournal, setClaimJournal] = useState<ClaimJournalRecord[]>([]);
  const [claimAcknowledged, setClaimAcknowledged] = useState(false);
  const [claimPending, setClaimPending] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [recheckingClaimId, setRecheckingClaimId] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setClaimJournal(readClaimJournal(window.localStorage));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!account || chainId !== "0xc488") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      setReview(null);
      try {
        const response = await fetch(`/api/settlement-inbox?account=${account}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof body === "object" && body !== null && "error" in body
              ? String(body.error)
              : "Settlement discovery failed",
          );
        }
        setInbox(settlementInboxSchema.parse(body));
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setInbox(null);
        setError(requestError instanceof Error ? requestError.message : "Settlement discovery failed");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [account, chainId]);

  useEffect(() => {
    if (!account || !inbox || inbox.account.toLowerCase() !== account.toLowerCase()) return;
    const outstandingMarkets = new Set(
      inbox.positions.map((position) => position.marketId.toLowerCase()),
    );
    const verifiedClaims = claimJournal.filter(
      (record) => record.account.toLowerCase() === account.toLowerCase()
        && record.status === "CLAIMED"
        && !outstandingMarkets.has(record.marketId.toLowerCase()),
    );
    if (verifiedClaims.length === 0) return;

    for (const claimed of verifiedClaims) {
      markClaimedExecutionForMarket(
        window.localStorage,
        claimed.account,
        claimed.marketId,
      );
    }
    window.dispatchEvent(new Event(EXECUTION_JOURNAL_UPDATED_EVENT));
  }, [account, claimJournal, inbox]);

  async function buildClaimReview(position: SettlementPosition) {
    if (!account) return;
    setReviewingMarket(position.marketId);
    setError(null);
    setClaimAcknowledged(false);
    setClaimMessage(null);
    try {
      const response = await fetch("/api/claim-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          marketId: position.marketId,
          outcomeIndex: position.outcomeIndex,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof body === "object" && body !== null && "error" in body
            ? String(body.error)
            : "Claim review failed",
        );
      }
      const parsed = claimReviewSchema.parse(body);
      const summaries = validateClaimReview(parsed);
      setReview(parsed);
      setReviewSummaries(summaries);
      setClaimJournal(saveClaimReview(window.localStorage, parsed));
    } catch (requestError) {
      setReview(null);
      setReviewSummaries([]);
      setError(requestError instanceof Error ? requestError.message : "Claim review failed");
    } finally {
      setReviewingMarket(null);
    }
  }

  async function submitClaim() {
    if (!provider || !account || !review || !claimAcknowledged || !EXECUTION_ENABLED || claimInFlight.current) return;
    const id = claimJournalId(review);
    const existing = readClaimJournal(window.localStorage).find((record) => record.id === id);
    if (existing?.status === "CLAIM_CONFIRMED" || existing?.status === "CLAIMED") return;
    claimInFlight.current = true;
    setClaimPending(true);
    setClaimMessage("Checking the live claim balance before wallet confirmation…");
    try {
      const completed = await runReviewedClaim(provider, review, account, (call, hash) => {
        setClaimJournal(updateClaimJournal(
          window.localStorage,
          id,
          { status: "CLAIM_SUBMITTED", hash },
        ));
        setClaimMessage(`${call.kind}: ${hash.slice(0, 10)}… submitted; waiting for receipt.`);
      });
      setClaimJournal(updateClaimJournal(
        window.localStorage,
        id,
        {
          status: "CLAIM_CONFIRMED",
          hash: completed.at(-1)?.hash,
        },
      ));
      const verified = await verifyConfirmedClaim(window.localStorage, id, loadClaimInbox);
      setInbox(verified.inbox);
      setClaimJournal(verified.records);
      setClaimMessage("Claim receipt confirmed and the live claim balance is no longer outstanding.");
    } catch (claimError) {
      const message = claimError instanceof Error ? claimError.message : "Claim did not complete";
      const records = updateClaimJournal(
        window.localStorage,
        id,
        { status: "FAILED", lastError: message },
      );
      setClaimJournal(records);
      setClaimMessage(records.find((record) => record.id === id)?.status === "CLAIM_CONFIRMED"
        ? `Claim receipt confirmed. Balance verification is pending: ${message}. Use Recheck claim balance; do not resend.` : message);
    } finally {
      claimInFlight.current = false;
      setClaimPending(false);
    }
  }

  async function recheckClaim(record: ClaimJournalRecord) {
    setRecheckingClaimId(record.id);
    try {
      const result = await verifyConfirmedClaim(window.localStorage, record.id, loadClaimInbox);
      setClaimJournal(result.records);
      setInbox(result.inbox);
      setClaimMessage("Claim receipt confirmed and live balance verified.");
    } catch (requestError) {
      setClaimMessage(`Receipt remains confirmed. ${requestError instanceof Error ? requestError.message : "Balance check unavailable."}`);
    } finally { setRecheckingClaimId(null); }
  }
  const reviewComplete = review && claimJournal.some((record) => record.id === claimJournalId(review) && (record.status === "CLAIM_CONFIRMED" || record.status === "CLAIMED"));

  return (
    <section className={`settlement-section${compact ? " settlement-compact" : ""}`} aria-labelledby="settlement-title">
      {compact ? (
        <h2 className="sr-only" id="settlement-title">Portfolio positions and settlement</h2>
      ) : (
        <div className="section-intro">
          <div>
            <p className="eyebrow">Settlement inbox</p>
            <h2 id="settlement-title">Find what the chain owes you.</h2>
          </div>
          <p>Historical positions are checked independently of today&apos;s live market list. Claims require finalization and explicit wallet confirmation.</p>
        </div>
      )}

      {!account ? (
        <div className="settlement-empty"><strong>Connect a wallet to scan positions.</strong><span>No signature is requested.</span></div>
      ) : chainId !== "0xc488" ? (
        <div className="settlement-empty"><strong>Switch to Shannon to scan authoritative balances.</strong></div>
      ) : loading ? (
        <div className="settlement-empty"><span className="loading-mark" /><strong>Reading outcome balances and settlement records…</strong></div>
      ) : error ? (
        <p className="preflight-error" role="alert">{error}</p>
      ) : inbox && inbox.positions.length === 0 && inbox.owedFallbacks.length === 0 ? (
        <div className="settlement-empty"><strong>No non-zero Event Contract positions found.</strong><span>This is an authoritative empty state for the connected account at this check.</span></div>
      ) : inbox ? (
        <div className="settlement-board">
          {inbox.positions.map((position) => (
            <article key={`${position.marketId}:${position.outcomeIndex}`}>
              <div className="settlement-state">
                <span>{position.asset} · {position.outcome}</span>
                <strong>{statusLabel(position.status)}</strong>
              </div>
              <div className="settlement-context">
                <strong>{position.question}</strong>
                <span>{shortId(position.marketId)} · expires {new Date(position.expiryUnixSeconds * 1_000).toLocaleString()}</span>
              </div>
              <div className="settlement-amount">
                <span>Estimated payout</span>
                <strong>{formatRaw(position.estimatedPayoutRaw, position.quoteDecimals)}</strong>
              </div>
              {(position.status === "CLAIMABLE" || position.status === "VOIDED_CLAIMABLE") && (
                <button
                  disabled={reviewingMarket === position.marketId}
                  onClick={() => void buildClaimReview(position)}
                  type="button"
                >
                  {reviewingMarket === position.marketId ? "Checking…" : "Build unsigned claim"}
                </button>
              )}
            </article>
          ))}
          {inbox.owedFallbacks.map((owed) => (
            <article key={`${owed.settlement}:${owed.collateralToken}`}>
              <div className="settlement-state"><span>Fallback credit</span><strong>owed</strong></div>
              <div className="settlement-context"><strong>Settlement push fallback</strong><span>{shortId(owed.collateralToken)}</span></div>
              <div className="settlement-amount"><span>Raw amount</span><strong>{owed.amountRaw}</strong></div>
            </article>
          ))}
        </div>
      ) : null}

      {review && account?.toLowerCase() === review.account.toLowerCase() && chainId === "0xc488" && (
        <div className="claim-review">
          <div className="preflight-heading">
            <div><span>Unsigned claim review</span><strong>{review.calls.length} decoded call{review.calls.length === 1 ? "" : "s"}</strong></div>
            <code title={review.fingerprint}>{shortId(review.fingerprint)}</code>
          </div>
          <div className="claim-review-summary">
            <strong>{formatRaw(review.estimatedPayoutRaw, review.quoteDecimals)} estimated payout</strong>
            <span>Full live balance: {review.amountRaw} raw {review.outcomeIndex === 1 ? "NO" : "YES"} units</span>
          </div>
          {reviewSummaries.map((summary, index) => (
            <div className="claim-call" key={`${review.calls[index].kind}:${index}`}>
              <span>{review.calls[index].kind}</span><strong>{summary}</strong><code>{shortId(review.calls[index].to)}</code>
            </div>
          ))}
          <div className="claim-gate">
            <label>
              <input
                checked={claimAcknowledged}
                disabled={claimPending}
                onChange={(event) => setClaimAcknowledged(event.target.checked)}
                type="checkbox"
              />
              <span>I reviewed the exact market, outcome, amount, and redemption calls.</span>
            </label>
            <button
              disabled={!EXECUTION_ENABLED || !claimAcknowledged || claimPending || !provider || Boolean(reviewComplete)}
              onClick={() => void submitClaim()}
              type="button"
            >
              {!EXECUTION_ENABLED ? "Shannon claim unavailable" : claimPending ? "Claim flow active…" : reviewComplete ? "Claim receipt confirmed" : "Submit reviewed claim"}
            </button>
            <p>{claimMessage ?? `Review expires ${new Date(review.validUntil).toLocaleTimeString()}. No claim was sent.`}</p>
          </div>
        </div>
      )}
      {claimJournal.filter((record) => account && record.account.toLowerCase() === account.toLowerCase()).slice(0, 3).map((record) => (
        <p className="claim-journal-note" key={record.id}>
          Claim activity: {record.status.toLowerCase().replaceAll("_", " ")} · {shortId(record.marketId)}
          {record.hash ? ` · ${shortId(record.hash)}` : ""}
          {record.status === "CLAIM_CONFIRMED" && <button className="text-action" type="button" disabled={recheckingClaimId !== null || claimPending || chainId !== "0xc488"} onClick={() => void recheckClaim(record)}>{recheckingClaimId === record.id ? "Checking balance…" : "Recheck claim balance"}</button>}
        </p>
      ))}
      {!review && claimMessage && <p role="status">{claimMessage}</p>}
    </section>
  );
}

async function loadClaimInbox(account: string): Promise<unknown> {
  const response = await fetch(`/api/settlement-inbox?account=${account}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error("Post-claim balance verification is unavailable");
  return response.json();
}
