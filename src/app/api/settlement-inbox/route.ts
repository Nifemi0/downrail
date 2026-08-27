import {
  SOMNIA_TESTNET_ADDRESSES,
  binarySettlementAbi,
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";

import {
  classifySettlementPosition,
  settlementInboxSchema,
  SETTLEMENT_SCHEMA_VERSION,
} from "@/features/settlement/schema";
import { DREAMDEX_HTTP_RPC_URL, SHANNON_CHAIN_ID } from "@/lib/dreamdex/config";
import { createUnsignedExchange } from "@/lib/dreamdex/exchange";
import { apiError, mapWithConcurrency, withTimeout } from "@/lib/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYOUT_DENOMINATOR = 10_000_000n;

export async function GET(request: Request) {
  const accountValue = new URL(request.url).searchParams.get("account");
  if (!accountValue || !isAddress(accountValue)) {
    return Response.json(
      { error: "account must be a valid EVM address", mode: "SETTLEMENT_DISCOVERY" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const account = getAddress(accountValue);
  const exchange = createUnsignedExchange(account);
  try {
    const portfolio = await withTimeout(exchange.client.getPortfolio(account, {
      ordersLimit: 0,
      tradesLimit: 0,
    }), 12_000, "portfolio discovery");
    const positions = await mapWithConcurrency(portfolio.positions, 4, async (position) => {
      const marketId = position.market.id as Hex;
      const onchain = await exchange.client.getMarketOnchain(marketId);
      const outcomeIndex = position.outcomeIndex === 1 ? 1 as const : 0 as const;
      const outcomeId = outcomeIndex === 1 ? onchain.noId : onchain.yesId;
      const balance = await exchange.client.getOutcomeBalance({
        outcomeToken: onchain.outcomeToken,
        account,
        id: outcomeId,
      });
      const settlement = onchain.finalized
        ? await exchange.trader.getSettlement(marketId)
        : null;
      const payoutNumerator = settlement?.payoutNumerators[outcomeIndex] ?? 0n;
      const classified = classifySettlementPosition({
        balance,
        finalized: onchain.finalized,
        resolved: onchain.isResolved || onchain.isVoided,
        voided: onchain.isVoided,
        outcomeIndex,
        winningOutcome: onchain.isResolved
          ? (onchain.winningOutcome === 1 ? 1 : 0)
          : null,
        payoutNumerator,
        payoutDenominator: PAYOUT_DENOMINATOR,
      });
      return {
        marketId,
        marketAddress: onchain.marketAddress,
        poolAddress: onchain.pool,
        collateralToken: onchain.collateral,
        outcomeToken: onchain.outcomeToken,
        asset: position.market.asset,
        question: position.market.question,
        outcome: outcomeIndex === 1 ? "NO" as const : "YES" as const,
        outcomeIndex,
        outcomeId: outcomeId.toString(),
        balanceRaw: balance.toString(),
        estimatedPayoutRaw: classified.estimatedPayout.toString(),
        quoteDecimals: onchain.decimals,
        expiryUnixSeconds: Number(onchain.expiry),
        status: classified.status,
        finalized: onchain.finalized,
        voided: onchain.isVoided,
        winningOutcome: onchain.isResolved
          ? (onchain.winningOutcome === 1 ? 1 as const : 0 as const)
          : null,
      };
    });

    const settlementAddress = SOMNIA_TESTNET_ADDRESSES.binarySettlement;
    const collateralTokens = [...new Set(positions.map((position) => position.collateralToken.toLowerCase()))];
    const publicClient = createPublicClient({
      chain: somniaShannon,
      transport: http(DREAMDEX_HTTP_RPC_URL),
    });
    const owedFallbacks = settlementAddress
      ? (await Promise.all(collateralTokens.map(async (token) => ({
          settlement: settlementAddress,
          collateralToken: getAddress(token) as Address,
          amountRaw: (await publicClient.readContract({
            address: settlementAddress,
            abi: binarySettlementAbi,
            functionName: "owed",
            args: [account, getAddress(token)],
          })).toString(),
        })))).filter((entry) => BigInt(entry.amountRaw) > 0n)
      : [];

    return Response.json(settlementInboxSchema.parse({
      schemaVersion: SETTLEMENT_SCHEMA_VERSION,
      mode: "SETTLEMENT_DISCOVERY",
      generatedAt: new Date().toISOString(),
      account,
      chainId: SHANNON_CHAIN_ID,
      positions,
      owedFallbacks,
    }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError("settlement-inbox", error, "SETTLEMENT_DISCOVERY");
  } finally {
    await exchange.close();
  }
}
