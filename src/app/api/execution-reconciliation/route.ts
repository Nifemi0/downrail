import { getAddress, isAddress, isHash } from "viem";

import { createReadOnlyExchange } from "@/lib/dreamdex/exchange";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSince(value: string | null) {
  if (value === null) return Math.floor(Date.now() / 1_000) - 15 * 60;
  if (!/^\d+$/.test(value)) throw new RangeError("since must be unix seconds");
  const since = Number(value);
  if (!Number.isSafeInteger(since) || since <= 0) {
    throw new RangeError("since must be positive unix seconds");
  }
  return since;
}

export async function GET(request: Request) {
  const exchange = createReadOnlyExchange();
  try {
    const params = new URL(request.url).searchParams;
    const accountValue = params.get("account");
    const marketId = params.get("marketId");
    if (!accountValue || !isAddress(accountValue)) {
      throw new RangeError("account must be a valid EVM address");
    }
    if (!marketId || !isHash(marketId)) {
      throw new RangeError("marketId must be a bytes32 hash");
    }
    const account = getAddress(accountValue);
    const since = parseSince(params.get("since"));
    const [portfolio, fills, onchain] = await Promise.all([
      exchange.client.getPortfolio(account, {
        ordersLimit: 50,
        tradesLimit: 50,
        since,
      }),
      exchange.client.getUserFills(account, { limit: 50, since }),
      exchange.client.getMarketOnchain(marketId),
    ]);
    const marketKey = marketId.toLowerCase();

    return Response.json(
      {
        mode: "RECONCILIATION",
        generatedAt: new Date().toISOString(),
        account,
        marketId,
        onchain: {
          status: onchain.status,
          finalized: onchain.finalized,
          isResolved: onchain.isResolved,
          isVoided: onchain.isVoided,
          expiryUnixSeconds: Number(onchain.expiry),
        },
        fills: fills
          .filter((fill) => fill.market.toLowerCase() === marketKey)
          .map((fill) => ({
            id: fill.id,
            txHash: fill.txHash,
            fillPriceRaw: fill.fillPrice,
            quantityRaw: fill.quantity,
            quoteQuantityRaw: fill.quoteQuantity,
            makerSide: fill.makerSide,
            takerSide: fill.takerSide ?? fill.takerOrder?.side ?? null,
            timestamp: fill.timestamp,
          })),
        positions: portfolio.positions
          .filter((position) => position.market.id.toLowerCase() === marketKey)
          .map((position) => ({
            outcome: position.outcomeIndex === 1 ? "NO" : "YES",
            outcomeIndex: position.outcomeIndex,
            balanceRaw: position.balance,
            quoteDecimals: position.market.quoteDecimals,
            status: position.market.status,
          })),
        openOrders: portfolio.openOrders
          .filter((order) => order.market.id.toLowerCase() === marketKey)
          .map((order) => ({
            orderId: order.orderId,
            side: order.side,
            priceRaw: order.price,
            quantityRemainingRaw: order.quantityRemaining,
            filledQuantityRaw: order.filledQuantity,
            placedTxHash: order.placedTxHash,
          })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reconcile execution";
    return Response.json(
      { error: message, mode: "RECONCILIATION" },
      {
        status: error instanceof RangeError ? 400 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } finally {
    await exchange.close();
  }
}
