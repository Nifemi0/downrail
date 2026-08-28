import {
  SOMNIA_TESTNET_ADDRESSES,
  binaryModuleWriteAbi,
  erc6909Abi,
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import {
  createPublicClient,
  encodeFunctionData,
  getAddress,
  http,
  isAddress,
  isHash,
  type Hex,
} from "viem";

import {
  claimCommitmentSchema,
  claimReviewSchema,
  CLAIM_REVIEW_SCHEMA_VERSION,
  createClaimFingerprint,
  validateClaimReview,
} from "@/features/settlement/claim-review";
import { DREAMDEX_HTTP_RPC_URL, SHANNON_CHAIN_ID } from "@/lib/dreamdex/config";
import { createUnsignedExchange } from "@/lib/dreamdex/exchange";
import { apiError, readJsonObject } from "@/lib/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let exchange: ReturnType<typeof createUnsignedExchange> | undefined;
  try {
    const body = await readJsonObject(request);
    if (typeof body.account !== "string" || !isAddress(body.account)) {
      throw new RangeError("account must be a valid EVM address");
    }
    if (typeof body.marketId !== "string" || !isHash(body.marketId)) {
      throw new RangeError("marketId must be a bytes32 hash");
    }
    if (body.outcomeIndex !== 0 && body.outcomeIndex !== 1) {
      throw new RangeError("outcomeIndex must be 0 or 1");
    }
    const account = getAddress(body.account);
    const marketId = body.marketId as Hex;
    const outcomeIndex = body.outcomeIndex;
    exchange = createUnsignedExchange(account);
    const [market, onchain, fees] = await Promise.all([
      exchange.client.getBinaryMarket(marketId),
      exchange.client.getMarketOnchain(marketId),
      exchange.client.getMarketFees(marketId),
    ]);
    if (!market || !fees) throw new RangeError("market attribution is unavailable");
    if (!onchain.finalized) throw new RangeError("market is not finalized");
    if (!onchain.isVoided && (!onchain.isResolved || onchain.winningOutcome !== outcomeIndex)) {
      throw new RangeError("selected outcome is not redeemable");
    }
    const outcomeId = outcomeIndex === 1 ? onchain.noId : onchain.yesId;
    const balance = await exchange.client.getOutcomeBalance({
      outcomeToken: onchain.outcomeToken,
      account,
      id: outcomeId,
    });
    if (balance <= 0n) throw new RangeError("selected outcome balance is zero");
    const settlement = await exchange.trader.getSettlement(marketId);
    if (!settlement?.finalized) throw new RangeError("settlement record is not finalized");
    const payoutNumerator = settlement.payoutNumerators[outcomeIndex] ?? 0n;
    const estimatedPayout = balance * payoutNumerator / 10_000_000n;
    if (estimatedPayout <= 0n) throw new RangeError("selected outcome has no payout");

    const binaryModule = SOMNIA_TESTNET_ADDRESSES.binaryModule;
    if (!binaryModule) throw new Error("Shannon binary module is not configured");
    const publicClient = createPublicClient({
      chain: somniaShannon,
      transport: http(DREAMDEX_HTTP_RPC_URL),
    });
    const isOperator = await publicClient.readContract({
      address: onchain.outcomeToken,
      abi: erc6909Abi,
      functionName: "isOperator",
      args: [account, binaryModule],
    });
    const calls = [];
    if (!isOperator) {
      calls.push({
        kind: "OUTCOME_APPROVAL" as const,
        to: onchain.outcomeToken,
        value: "0" as const,
        data: encodeFunctionData({
          abi: erc6909Abi,
          functionName: "setOperator",
          args: [binaryModule, true],
        }),
        description: "Authorize the Shannon binary module to redeem outcome tokens",
      });
    }
    calls.push({
      kind: "REDEEM" as const,
      to: binaryModule,
      value: "0" as const,
      data: encodeFunctionData({
        abi: binaryModuleWriteAbi,
        functionName: "redeem",
        args: [fees.operatorId, fees.venueId as Hex, marketId, outcomeIndex, balance],
      }),
      description: "Redeem the full reviewed winning outcome balance",
    });
    const generatedAt = new Date();
    const commitment = claimCommitmentSchema.parse({
      schemaVersion: CLAIM_REVIEW_SCHEMA_VERSION,
      account,
      chainId: SHANNON_CHAIN_ID,
      generatedAt: generatedAt.toISOString(),
      validUntil: new Date(generatedAt.getTime() + 120_000).toISOString(),
      module: binaryModule,
      outcomeToken: onchain.outcomeToken,
      marketId,
      outcomeIndex,
      outcomeId: outcomeId.toString(),
      amountRaw: balance.toString(),
      estimatedPayoutRaw: estimatedPayout.toString(),
      quoteDecimals: onchain.decimals,
      operatorId: fees.operatorId,
      venueId: fees.venueId,
      calls,
    });
    const review = claimReviewSchema.parse({
      ...commitment,
      mode: "UNSIGNED_CLAIM_REVIEW",
      fingerprint: createClaimFingerprint(commitment),
      warnings: [
        "No transaction was sent. Claim signing is disabled by the production safety flag.",
        "The review redeems the full live winning outcome balance to the connected account.",
      ],
    });
    validateClaimReview(review);
    return Response.json(review, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError("claim-review", error, "UNSIGNED_CLAIM_REVIEW");
  } finally {
    await exchange?.close();
  }
}
