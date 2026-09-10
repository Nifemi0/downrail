import { orderReviewSchema, type OrderReview } from "./review-schema";

const consumed = new Map<string, number>();
const MAX_CONSUMED_REVIEWS = 5_000;

function prune(now: number) {
  if (consumed.size < MAX_CONSUMED_REVIEWS) return;
  for (const [fingerprint, expiresAt] of consumed) {
    if (expiresAt <= now) consumed.delete(fingerprint);
  }
}

/**
 * Best-effort server-instance replay guard. The wallet remains authoritative;
 * a shared store is still required for strict multi-instance single use.
 */
export function consumeExecutionReview(input: OrderReview, now = Date.now()) {
  const review = orderReviewSchema.parse(input);
  const fingerprint = review.fingerprint.toLowerCase();
  const expiresAt = Date.parse(review.legs[0].validUntil);
  prune(now);
  const previousExpiry = consumed.get(fingerprint);
  if (previousExpiry && previousExpiry > now) {
    throw new RangeError("This review has already opened an execution attempt. Build a fresh review.");
  }
  if (expiresAt <= now + 10_000) {
    throw new RangeError("This review is expired or too close to execution expiry.");
  }
  consumed.set(fingerprint, expiresAt);
  return { fingerprint: review.fingerprint, expiresAt };
}

export function resetExecutionTicketsForTests() {
  consumed.clear();
}
