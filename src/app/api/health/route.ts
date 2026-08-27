import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { createPublicClient, http } from "viem";

import { DREAMDEX_HTTP_RPC_URL } from "@/lib/dreamdex/config";
import { createReadOnlyExchange } from "@/lib/dreamdex/exchange";
import { withTimeout } from "@/lib/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const exchange = createReadOnlyExchange();
  const publicClient = createPublicClient({
    chain: somniaShannon,
    transport: http(DREAMDEX_HTTP_RPC_URL),
  });
  try {
    const [blockNumber, assets] = await withTimeout(Promise.all([
      publicClient.getBlockNumber(),
      exchange.client.listBinaryAssets(),
    ]), 8_000, "health dependencies");
    return Response.json({
      status: "ready",
      chainId: 50_312,
      blockNumber: blockNumber.toString(),
      binaryAssetCount: assets.length,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({
      status: "degraded",
      chainId: 50_312,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  } finally {
    await exchange.close();
  }
}
