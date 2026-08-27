import type { UnsignedCall } from "@somnia-chain/markets-sdk";
import {
  getAddress,
  isAddress,
  keccak256,
  toHex,
} from "viem";

import {
  buildBoundedCollateralApproval,
  buildBuyNoOrderPreflight,
} from "@/features/hedge-planner/build-execution-preflight";
import { parseHedgePlanRequest } from "@/features/hedge-planner/parse-hedge-intent";
import { createUnsignedExchange } from "@/lib/dreamdex/exchange";
import { getLiveHedgePlanSnapshot } from "@/lib/dreamdex/hedge-plan-snapshot";

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
    const body = (await request.json()) as PreflightBody;
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
        const boundedApproval = unsigned.approval
          ? buildBoundedCollateralApproval(
              unsigned.approval,
              preflight.params.pool,
              BigInt(leg.maximumCostRaw),
            )
          : undefined;

        return {
          marketId: leg.marketId,
          poolAddress: preflight.params.pool,
          side: preflight.params.side,
          orderType: "IMMEDIATE_OR_CANCEL",
          downLimitPriceRaw: preflight.downLimitPriceRaw.toString(),
          sdkYesLimitPriceRaw: preflight.yesLimitPriceRaw.toString(),
          quantityRaw: preflight.params.quantity.toString(),
          maximumCostRaw: leg.maximumCostRaw,
          validUntil: new Date(
            preflight.validUntilUnixSeconds * 1_000,
          ).toISOString(),
          calls: [
            ...(boundedApproval
              ? [{ kind: "APPROVAL", ...serializeCall(boundedApproval) }]
              : []),
            { kind: "ORDER", ...serializeCall(unsigned.order) },
          ],
        };
      }),
    );

    const fingerprintPayload = {
      account,
      chainId: snapshot.chainId,
      generatedAt: snapshot.generatedAt,
      quoteDecimals: snapshot.quoteDecimals,
      legs,
    };

    return Response.json(
      {
        mode: "UNSIGNED_REVIEW",
        account,
        chainId: snapshot.chainId,
        quoteDecimals: snapshot.quoteDecimals,
        generatedAt: snapshot.generatedAt,
        fingerprint: keccak256(toHex(JSON.stringify(fingerprintPayload))),
        plan: {
          asset: snapshot.plan.asset,
          totalMaximumCostRaw: snapshot.plan.totalMaximumCostRaw,
          netWinningProtectionRaw: snapshot.plan.netWinningProtectionRaw,
          residualScenarioLossRaw: snapshot.plan.residualScenarioLossRaw,
          coverageBps: snapshot.plan.coverageBps,
        },
        legs,
        warnings: [
          "No transaction was sent. These are unsigned review calls only.",
          "Approval calls are capped to each leg's reviewed maximum collateral cost.",
          "Gas, nonce, and network fees are resolved by the wallet at send time.",
          "Regenerate and revalidate this preview immediately before signing.",
        ],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to build order preflight";
    const status =
      error instanceof RangeError || error instanceof SyntaxError ? 400 : 502;
    return Response.json(
      { error: message, mode: "UNSIGNED_REVIEW" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await exchange?.close();
  }
}
