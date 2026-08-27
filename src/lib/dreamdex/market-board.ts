import type { BinaryMarket } from "@somnia-chain/markets-sdk";

import { DREAMDEX_VENUE_ID, SHANNON_CHAIN_ID } from "./config";
import { createReadOnlyExchange } from "./exchange";

export type HedgeAsset = "BTC" | "ETH";

export type MarketBoardRow = {
  marketId: string;
  asset: HedgeAsset;
  question: string;
  status: string;
  intervalSeconds: number;
  intervalLabel: string;
  expiry: string;
  expiryUnixSeconds: number;
  venueId: string;
  poolAddress: string;
  quoteDecimals: number;
  bestYesBidRaw: string | null;
  bestYesAskRaw: string | null;
  bestNoAskRaw: string | null;
  bestNoAskDisplay: string | null;
};

export type MarketBoardSnapshot = {
  ok: boolean;
  generatedAt: string;
  chainId: number;
  venueId: string;
  assets: string[];
  venues: Array<{ operatorId: number; venueId: string }>;
  markets: MarketBoardRow[];
  error: string | null;
};

function parseAsset(asset: string): HedgeAsset | null {
  if (asset === "BTC" || asset === "ETH") return asset;
  return null;
}

function formatProbability(raw: bigint, decimals: number) {
  const scale = 10n ** BigInt(decimals);
  const basisPoints = (raw * 10_000n) / scale;
  return `${Number(basisPoints) / 100}%`;
}

function toBoardRow(
  market: BinaryMarket,
  top: { bestBid: string | null; bestAsk: string | null } | undefined,
): MarketBoardRow | null {
  const asset = parseAsset(market.asset);
  if (!asset) return null;

  const oneCollateral = 10n ** BigInt(market.quoteDecimals);
  const bestYesBid = top?.bestBid === null || top?.bestBid === undefined
    ? null
    : BigInt(top.bestBid);
  const bestNoAsk = bestYesBid === null ? null : oneCollateral - bestYesBid;
  const intervalSeconds = Number(market.intervalSec ?? 0);

  return {
    marketId: market.marketId,
    asset,
    question: market.question,
    status: market.status,
    intervalSeconds,
    intervalLabel: market.interval ?? `${intervalSeconds}s`,
    expiry: new Date(Number(market.expiry) * 1_000).toISOString(),
    expiryUnixSeconds: Number(market.expiry),
    venueId: market.venueId ?? "unknown",
    poolAddress: market.poolAddress,
    quoteDecimals: market.quoteDecimals,
    bestYesBidRaw: top?.bestBid ?? null,
    bestYesAskRaw: top?.bestAsk ?? null,
    bestNoAskRaw: bestNoAsk?.toString() ?? null,
    bestNoAskDisplay:
      bestNoAsk === null
        ? null
        : formatProbability(bestNoAsk, market.quoteDecimals),
  };
}

export async function getMarketBoardSnapshot(
  limit = 12,
): Promise<MarketBoardSnapshot> {
  const exchange = createReadOnlyExchange();
  const generatedAt = new Date().toISOString();

  try {
    const [venues, assets, markets] = await Promise.all([
      exchange.client.listBinaryVenueIds(),
      exchange.client.listBinaryAssets(),
      exchange.client.listLiveBinaryMarkets({
        venueId: DREAMDEX_VENUE_ID,
        status: "Trading",
        orderBy: "closingSoon",
        limit,
      }),
    ]);

    const marketIds = markets.map((market) => market.marketId);
    const tops = marketIds.length
      ? await exchange.client.getBookTops(marketIds)
      : {};

    return {
      ok: true,
      generatedAt,
      chainId: SHANNON_CHAIN_ID,
      venueId: DREAMDEX_VENUE_ID,
      assets,
      venues,
      markets: markets
        .map((market) => toBoardRow(market, tops[market.marketId.toLowerCase()]))
        .filter((market): market is MarketBoardRow => market !== null),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      generatedAt,
      chainId: SHANNON_CHAIN_ID,
      venueId: DREAMDEX_VENUE_ID,
      assets: [],
      venues: [],
      markets: [],
      error: error instanceof Error ? error.message : "Unknown DreamDEX error",
    };
  } finally {
    await exchange.close();
  }
}
