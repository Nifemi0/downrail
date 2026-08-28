import type { UnsignedCall } from "@somnia-chain/markets-sdk";
import { getAddress, isAddress } from "viem";

import {
  buildBoundedCollateralApproval,
  buildBuyNoOrderPreflight,
} from "@/features/hedge-planner/build-execution-preflight";
import {
  createReviewFingerprint,
  orderReviewSchema,
  REVIEW_SCHEMA_VERSION,
  reviewCommitmentSchema,
} from "@/features/execution/review-schema";
import { parseHedgePlanRequest } from "@/features/hedge-planner/parse-hedge-intent";
import { createUnsignedExchange } from "@/lib/dreamdex/exchange";
import { getLiveHedgePlanSnapshot } from "@/lib/dreamdex/hedge-plan-snapshot";
import { apiError, readJsonObject } from "@/lib/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PreflightBody = {
  account?: unknown;
  asset?: unknown;
  exposureUsd?: unknown;
  budgetUsd?: unknown;
  downsideMoveBps?: unknown;
  horizonSeconds?: unknown;
  maxMarkets?: unknown;
};

function stringField(body: PreflightBody, key: keyof PreflightBody) {
  const value = body[key];
  if (typeof value !== "string") {
    throw new RangeError(`${key} must be a string`);
  }
  return value;
}

function serializeCall(call: UnsignedCall) {
  return {
    to: call.to,
    data: call.data,
    value: call.value.toString(),
    description: call.description,
  };
}

export async function POST(request: Request) {
  let exchange: ReturnType<typeof createUnsignedExchange> | undefined;

  try {
    const body = await readJsonObject(request) as PreflightBody;
    const accountValue = stringField(body, "account");
    if (!isAddress(accountValue)) {
      throw new RangeError("account must be a valid EVM address");
    }
    const account = getAddress(accountValue);

    const intent = parseHedgePlanRequest(
      new URLSearchParams({
        asset: stringField(body, "asset"),
        exposureUsd: stringField(body, "exposureUsd"),
        budgetUsd: stringField(body, "budgetUsd"),
        downsideMoveBps: stringField(body, "downsideMoveBps"),
        horizonSeconds: stringField(body, "horizonSeconds"),
        maxMarkets:
          typeof body.maxMarkets === "string" ? body.maxMarkets : "3",
      }),
    );
    const snapshot = await getLiveHedgePlanSnapshot(intent);
    const nowUnixSeconds = Math.floor(Date.now() / 1_000);

    exchange = createUnsignedExchange(account);
    const trader = exchange.trader;
    const legs = await Promise.all(
      snapshot.plan.legs.map(async (leg) => {
        const preflight = buildBuyNoOrderPreflight(
          leg,
          snapshot.quoteDecimals,
          nowUnixSeconds,
        );
        const unsigned = await trader.buildPlaceOrder(preflight.params);
        if (!unsigned.approval) {
          throw new Error("BUY_NO review did not include a collateral approval");
        }
        const boundedApproval = buildBoundedCollateralApproval(
          unsigned.approval,
          preflight.params.pool,
          BigInt(leg.maximumCostRaw),
        );

        return {
          marketId: leg.marketId,
          poolAddress: preflight.params.pool,
          collateralToken: boundedApproval.to,
          side: preflight.params.side,
          orderType: "IMMEDIATE_OR_CANCEL",
          downLimitPriceRaw: preflight.downLimitPriceRaw.toString(),
          sdkYesLimitPriceRaw: preflight.yesLimitPriceRaw.toString(),
          quantityRaw: preflight.params.quantity.toString(),
          maximumCostRaw: leg.maximumCostRaw,
          marketExpiryUnixSeconds: leg.expiryUnixSeconds,
          validUntil: new Date(
            preflight.validUntilUnixSeconds * 1_000,
          ).toISOString(),
          calls: [
            { kind: "APPROVAL" as const, ...serializeCall(boundedApproval) },
            { kind: "ORDER" as const, ...serializeCall(unsigned.order) },
          ],
        };
      }),
    );

    const reviewedPlan = {
      asset: snapshot.plan.asset,
      requestedHorizonEndsAt: snapshot.plan.requestedHorizonEndsAt,
      totalMaximumCostRaw: snapshot.plan.currentMaximumCostRaw,
      futureBudgetReserveRaw: snapshot.plan.futureBudgetReserveRaw,
      conditionalNetPayoutRaw: snapshot.plan.conditionalNetPayoutRaw,
      modeledPortfolioLossRaw: snapshot.plan.modeledPortfolioLossRaw,
    };
    const commitment = reviewCommitmentSchema.parse({
      schemaVersion: REVIEW_SCHEMA_VERSION,
      account,
      chainId: snapshot.chainId,
      generatedAt: snapshot.generatedAt,
      quoteDecimals: snapshot.quoteDecimals,
      plan: reviewedPlan,
      legs,
    });
    const responseBody = orderReviewSchema.parse({
      ...commitment,
      mode: "UNSIGNED_REVIEW",
      fingerprint: createReviewFingerprint(commitment),
      warnings: [
        "No transaction was sent. These are unsigned review calls only.",
        "Approval is capped to the exact reviewed maximum collateral cost.",
        "Gas is separate and is resolved by the wallet at send time.",
        "Wallet submission is disabled by the production safety flag; decoded-call validation is enforced locally before any send.",
      ],
    });

    return Response.json(
      responseBody,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError("order-preflight", error, "UNSIGNED_REVIEW");
  } finally {
    await exchange?.close();
  }
}
