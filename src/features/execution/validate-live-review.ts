import { getAddress } from "viem";

import { type OrderReview } from "./review-schema";
import { validateReviewedOrder } from "./validate-reviewed-order";

export type TrustedLiveMarket = {
  marketId: string;
  venueId: string | null;
  indexedPoolAddress: string;
  indexedCollateralToken: string;
  indexedQuoteDecimals: number;
  indexedExpiryUnixSeconds: number;
  onchainPoolAddress: string;
  onchainCollateralToken: string;
  onchainQuoteDecimals: number;
  onchainExpiryUnixSeconds: number;
  onchainStatus: number;
  finalized: boolean;
  resolved: boolean;
  voided: boolean;
};

function sameAddress(left: string, right: string) {
  return getAddress(left) === getAddress(right);
}

export function assertTrustedLiveReview(
  review: OrderReview,
  market: TrustedLiveMarket,
  expectedVenueId: string,
  now = Date.now(),
) {
  validateReviewedOrder(review);
  const leg = review.legs[0];

  if (market.marketId.toLowerCase() !== leg.marketId.toLowerCase()) {
    throw new RangeError("live market identity differs from the reviewed market");
  }
  if (!market.venueId || market.venueId.toLowerCase() !== expectedVenueId.toLowerCase()) {
    throw new RangeError("reviewed market is outside the trusted DreamDEX venue");
  }
  if (
    !sameAddress(market.indexedPoolAddress, leg.poolAddress)
    || !sameAddress(market.onchainPoolAddress, leg.poolAddress)
  ) {
    throw new RangeError("live pool address differs from the reviewed pool");
  }
  if (
    !sameAddress(market.indexedCollateralToken, leg.collateralToken)
    || !sameAddress(market.onchainCollateralToken, leg.collateralToken)
  ) {
    throw new RangeError("live collateral token differs from the reviewed token");
  }
  if (
    market.indexedQuoteDecimals !== review.quoteDecimals
    || market.onchainQuoteDecimals !== review.quoteDecimals
  ) {
    throw new RangeError("live collateral decimals differ from the reviewed scale");
  }
  if (
    market.indexedExpiryUnixSeconds !== leg.marketExpiryUnixSeconds
    || market.onchainExpiryUnixSeconds !== leg.marketExpiryUnixSeconds
  ) {
    throw new RangeError("live market expiry differs from the reviewed expiry");
  }
  if (
    market.onchainStatus !== 1
    || market.finalized
    || market.resolved
    || market.voided
  ) {
    throw new RangeError("reviewed market is no longer active for trading");
  }
  if (Date.parse(leg.validUntil) <= now + 10_000) {
    throw new RangeError("review expired while live market bindings were checked");
  }

  return {
    fingerprint: review.fingerprint,
    marketId: leg.marketId,
    poolAddress: getAddress(leg.poolAddress),
    collateralToken: getAddress(leg.collateralToken),
    marketExpiryUnixSeconds: leg.marketExpiryUnixSeconds,
  };
}
