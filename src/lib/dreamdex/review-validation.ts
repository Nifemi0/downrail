import type { OrderReview } from "@/features/execution/review-schema";
import {
  assertTrustedLiveReview,
  type TrustedLiveMarket,
} from "@/features/execution/validate-live-review";
import { withTimeout } from "@/lib/http/api";

import { DREAMDEX_VENUE_ID } from "./config";
import { createReadOnlyExchange } from "./exchange";

export async function verifyLiveOrderReview(review: OrderReview) {
  const exchange = createReadOnlyExchange();
  const leg = review.legs[0];
  try {
    const [indexed, onchain] = await withTimeout(Promise.all([
      exchange.client.getBinaryMarket(leg.marketId),
      exchange.client.getMarketOnchain(leg.marketId),
    ]), 10_000, "live order review validation");
    if (!indexed) throw new RangeError("reviewed market is not indexed by DreamDEX");

    const market: TrustedLiveMarket = {
      marketId: indexed.marketId,
      venueId: indexed.venueId ?? null,
      indexedPoolAddress: indexed.poolAddress,
      indexedCollateralToken: indexed.collateral,
      indexedQuoteDecimals: indexed.quoteDecimals,
      indexedExpiryUnixSeconds: Number(indexed.expiry),
      onchainPoolAddress: onchain.pool,
      onchainCollateralToken: onchain.collateral,
      onchainQuoteDecimals: onchain.decimals,
      onchainExpiryUnixSeconds: Number(onchain.expiry),
      onchainStatus: onchain.status,
      finalized: onchain.finalized,
      resolved: onchain.isResolved,
      voided: onchain.isVoided,
    };
    return assertTrustedLiveReview(review, market, DREAMDEX_VENUE_ID);
  } finally {
    await exchange.close();
  }
}
