import {
  buildMultiWindowHedgePlan,
  type HedgeMarketCandidate,
  type MultiWindowHedgePlan,
} from "@/features/hedge-planner/build-multi-window-plan";
import type { HedgePlanRequest } from "@/features/hedge-planner/parse-hedge-intent";

import {
  DREAMDEX_VENUE_ID,
  SHANNON_CHAIN_ID,
} from "./config";
import { createReadOnlyExchange } from "./exchange";

const MIN_EXECUTION_HEADROOM_SECONDS = 5 * 60;
const ORDER_BOOK_DEPTH = 8;
const MAX_CHAIN_CANDIDATES = 8;
const ONCHAIN_TRADING_STATUS = 1;

export type SerializedFill = {
  priceRaw: string;
  quantityRaw: string;
  estimatedCostRaw: string;
};

export type SerializedPlan = Omit<
  MultiWindowHedgePlan,
  | "currentEstimatedBookCostRaw"
  | "currentMaximumCostRaw"
  | "futureBudgetReserveRaw"
  | "budgetRemainingRaw"
  | "conditionalGrossPayoutRaw"
  | "conditionalNetPayoutRaw"
  | "modeledPortfolioLossRaw"
  | "outcomes"
  | "legs"
  | "rolloverCheckpoints"
> & {
  currentEstimatedBookCostRaw: string;
  currentMaximumCostRaw: string;
  futureBudgetReserveRaw: string;
  budgetRemainingRaw: string;
  conditionalGrossPayoutRaw: string;
  conditionalNetPayoutRaw: string;
  modeledPortfolioLossRaw: string;
  outcomes: Array<{
    outcome: "DOWN_WINS" | "DOWN_LOSES";
    hedgeNetRaw: string;
    combinedScenarioChangeRaw: string;
  }>;
  legs: Array<{
    marketId: string;
    poolAddress?: string;
    question: string;
    expiryUnixSeconds: number;
    intervalSeconds: number;
    limitPriceRaw: string;
    quantityRaw: string;
    estimatedBookCostRaw: string;
    maximumCostRaw: string;
    conditionalGrossPayoutRaw: string;
    conditionalNetPayoutRaw: string;
    fills: SerializedFill[];
  }>;
  rolloverCheckpoints: Array<{
    sequence: number;
    startsAt: number;
    targetEndsAt: number;
    intervalSeconds: number;
    estimatedBudgetRaw: string;
    status: "FUTURE_MARKET_REQUIRED";
  }>;
};

export type LiveHedgePlanSnapshot = {
  mode: "READ_ONLY";
  generatedAt: string;
  chainId: number;
  venueId: string;
  quoteDecimals: number;
  indexedMarketCount: number;
  chainVerifiedCandidateCount: number;
  rejectedOnchainMarkets: Array<{ marketId: string; reason: string }>;
  plan: SerializedPlan;
};

function serializePlan(plan: MultiWindowHedgePlan): SerializedPlan {
  return {
    ...plan,
    currentEstimatedBookCostRaw: plan.currentEstimatedBookCostRaw.toString(),
    currentMaximumCostRaw: plan.currentMaximumCostRaw.toString(),
    futureBudgetReserveRaw: plan.futureBudgetReserveRaw.toString(),
    budgetRemainingRaw: plan.budgetRemainingRaw.toString(),
    conditionalGrossPayoutRaw: plan.conditionalGrossPayoutRaw.toString(),
    conditionalNetPayoutRaw: plan.conditionalNetPayoutRaw.toString(),
    modeledPortfolioLossRaw: plan.modeledPortfolioLossRaw.toString(),
    outcomes: plan.outcomes.map((outcome) => ({
      ...outcome,
      hedgeNetRaw: outcome.hedgeNetRaw.toString(),
      combinedScenarioChangeRaw: outcome.combinedScenarioChangeRaw.toString(),
    })),
    legs: plan.legs.map((leg) => ({
      ...leg,
      limitPriceRaw: leg.limitPriceRaw.toString(),
      quantityRaw: leg.quantityRaw.toString(),
      estimatedBookCostRaw: leg.estimatedBookCostRaw.toString(),
      maximumCostRaw: leg.maximumCostRaw.toString(),
      conditionalGrossPayoutRaw: leg.conditionalGrossPayoutRaw.toString(),
      conditionalNetPayoutRaw: leg.conditionalNetPayoutRaw.toString(),
      fills: leg.fills.map((fill) => ({
        priceRaw: fill.priceRaw.toString(),
        quantityRaw: fill.quantityRaw.toString(),
        estimatedCostRaw: fill.estimatedCostRaw.toString(),
      })),
    })),
    rolloverCheckpoints: plan.rolloverCheckpoints.map((checkpoint) => ({
      ...checkpoint,
      estimatedBudgetRaw: checkpoint.estimatedBudgetRaw.toString(),
    })),
  };
}

export async function getLiveHedgePlanSnapshot(
  request: HedgePlanRequest,
): Promise<LiveHedgePlanSnapshot> {
  const exchange = createReadOnlyExchange();
  const generatedAt = new Date().toISOString();
  const nowUnixSeconds = Math.floor(Date.now() / 1_000);
  const minimumExpiry = nowUnixSeconds + MIN_EXECUTION_HEADROOM_SECONDS;

  try {
    const indexedMarkets = await exchange.client.listLiveBinaryMarkets({
      venueId: DREAMDEX_VENUE_ID,
      status: "Trading",
      orderBy: "closingSoon",
      limit: 24,
    });
    const indexedCandidates = indexedMarkets
      .filter(
        (market) =>
          market.asset === request.asset &&
          Number(market.expiry) >= minimumExpiry,
      )
      .slice(0, MAX_CHAIN_CANDIDATES);

    const inspected = await Promise.all(
      indexedCandidates.map(async (market) => {
        try {
          const onchain = await exchange.client.getMarketOnchain(
            market.marketId,
          );
          if (onchain.status !== ONCHAIN_TRADING_STATUS) {
            return {
              rejected: {
                marketId: market.marketId,
                reason: `on-chain status is ${onchain.status}, not Trading`,
              },
            };
          }
          if (onchain.finalized || onchain.isResolved || onchain.isVoided) {
            return {
              rejected: {
                marketId: market.marketId,
                reason: "market is resolved, voided, or finalized",
              },
            };
          }
          if (Number(onchain.expiry) < minimumExpiry) {
            return {
              rejected: {
                marketId: market.marketId,
                reason: "on-chain expiry has insufficient execution headroom",
              },
            };
          }
          if (
            market.baseDecimals !== onchain.decimals ||
            market.quoteDecimals !== onchain.decimals
          ) {
            return {
              rejected: {
                marketId: market.marketId,
                reason: "indexed and on-chain decimal scales disagree",
              },
            };
          }

          const [params, book] = await Promise.all([
            exchange.client.getBinaryBookParams(onchain.pool),
            exchange.client.getBinaryOrderBook(onchain.pool, {
              depth: ORDER_BOOK_DEPTH,
              decimals: onchain.decimals,
            }),
          ]);
          const candidate: HedgeMarketCandidate = {
            marketId: market.marketId,
            poolAddress: onchain.pool,
            asset: request.asset,
            question: market.question,
            expiryUnixSeconds: Number(onchain.expiry),
            intervalSeconds: Number(market.intervalSec ?? 0),
            quoteDecimals: onchain.decimals,
            outcomeDecimals: onchain.decimals,
            tickSizeRaw: params.tickSize,
            lotSizeRaw: params.lotSize,
            minQuantityRaw: params.minQuantity,
            downAsks: book.noAsks.map((level) => ({
              priceRaw: level.price,
              quantityRaw: level.quantity,
            })),
          };
          return { candidate };
        } catch (error) {
          return {
            rejected: {
              marketId: market.marketId,
              reason:
                error instanceof Error
                  ? error.message
                  : "unknown chain read failure",
            },
          };
        }
      }),
    );

    const candidates = inspected.flatMap((result) =>
      result.candidate ? [result.candidate] : [],
    );
    const rejectedOnchainMarkets = inspected.flatMap((result) =>
      result.rejected ? [result.rejected] : [],
    );
    const plan = buildMultiWindowHedgePlan({
      ...request,
      nowUnixSeconds,
      minExecutionHeadroomSeconds: MIN_EXECUTION_HEADROOM_SECONDS,
      candidates,
    });

    return {
      mode: "READ_ONLY",
      generatedAt,
      chainId: SHANNON_CHAIN_ID,
      venueId: DREAMDEX_VENUE_ID,
      quoteDecimals: candidates[0]?.quoteDecimals ?? 6,
      indexedMarketCount: indexedMarkets.length,
      chainVerifiedCandidateCount: candidates.length,
      rejectedOnchainMarkets,
      plan: serializePlan(plan),
    };
  } finally {
    await exchange.close();
  }
}
