import {
  DREAMDEX_VENUE_ID,
  SHANNON_CHAIN_ID,
} from "../src/lib/dreamdex/config";
import { createReadOnlyExchange } from "../src/lib/dreamdex/exchange";

function serializeLevel(level: { price: bigint; quantity: bigint }) {
  return { priceRaw: level.price.toString(), quantityRaw: level.quantity.toString() };
}

async function main() {
  const exchange = createReadOnlyExchange();

  try {
    const [venues, assets, markets] = await Promise.all([
      exchange.client.listBinaryVenueIds(),
      exchange.client.listBinaryAssets(),
      exchange.client.listLiveBinaryMarkets({
        venueId: DREAMDEX_VENUE_ID,
        status: "Trading",
        orderBy: "closingSoon",
        limit: 12,
      }),
    ]);

    const sample = markets[0];
    const sampleDetails = sample
      ? await Promise.all([
          exchange.client.getMarketOnchain(sample.marketId),
          exchange.client.getBinaryBookParams(sample.poolAddress),
          exchange.client.getBinaryOrderBook(sample.poolAddress, {
            depth: 5,
            decimals: sample.quoteDecimals,
          }),
        ])
      : null;
    const [onchain, bookParams, book] = sampleDetails ?? [];

    console.log(JSON.stringify({
      mode: "READ_ONLY",
      checkedAt: new Date().toISOString(),
      chainId: SHANNON_CHAIN_ID,
      configuredVenueId: DREAMDEX_VENUE_ID,
      discoveredVenues: venues,
      discoveredAssets: assets,
      liveMarketCount: markets.length,
      markets: markets.map((market) => ({
        marketId: market.marketId,
        asset: market.asset,
        question: market.question,
        status: market.status,
        intervalSeconds: Number(market.intervalSec ?? 0),
        interval: market.interval,
        expiry: new Date(Number(market.expiry) * 1_000).toISOString(),
        venueId: market.venueId,
        poolAddress: market.poolAddress,
      })),
      sample: sample && onchain && bookParams && book ? {
        marketId: sample.marketId,
        indexedStatus: sample.status,
        onchainStatus: onchain.status,
        onchainExpiry: onchain.expiry.toString(),
        finalized: onchain.finalized,
        quoteDecimals: onchain.decimals,
        tickSizeRaw: bookParams.tickSize.toString(),
        lotSizeRaw: bookParams.lotSize.toString(),
        minimumQuantityRaw: bookParams.minQuantity.toString(),
        orderBook: {
          yesBids: book.yesBids.map(serializeLevel),
          yesAsks: book.yesAsks.map(serializeLevel),
          noBids: book.noBids.map(serializeLevel),
          noAsks: book.noAsks.map(serializeLevel),
        },
      } : null,
    }, null, 2));
  } finally {
    await exchange.close();
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
