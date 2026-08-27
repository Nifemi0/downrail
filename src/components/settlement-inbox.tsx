"use client";

import { useEffect, useState } from "react";

import { useWalletSession } from "@/components/wallet-session";
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

export function SettlementInbox() {
  const { account, chainId } = useWalletSession();
  const [inbox, setInbox] = useState<SettlementInboxData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ClaimReview | null>(null);
  const [reviewSummaries, setReviewSummaries] = useState<string[]>([]);
  const [reviewingMarket, setReviewingMarket] = useState<string | null>(null);

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

  async function buildClaimReview(position: SettlementPosition) {
    if (!account) return;
    setReviewingMarket(position.marketId);
    setError(null);
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
    } catch (requestError) {
      setReview(null);
      setReviewSummaries([]);
      setError(requestError instanceof Error ? requestError.message : "Claim review failed");
    } finally {
      setReviewingMarket(null);
    }
  }

  return (
    <section className="settlement-section" aria-labelledby="settlement-title">
      <div className="section-intro">
        <div>
          <p className="eyebrow">Settlement inbox / 04</p>
          <h2 id="settlement-title">Find what the chain owes you.</h2>
        </div>
        <p>Historical positions are checked independently of today&apos;s live market list. Claim signing remains locked.</p>
      </div>

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

      {review && (
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
          <p>Review expires {new Date(review.validUntil).toLocaleTimeString()}. No claim was sent; signing is locked.</p>
        </div>
      )}
    </section>
  );
}
