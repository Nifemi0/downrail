import { getMarketBoardSnapshot } from "@/lib/dreamdex/market-board";
import { apiError, withTimeout } from "@/lib/http/api";
import { rateLimitResponse } from "@/lib/http/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const limited = rateLimitResponse(request, "market-board", {
    limit: 45,
    windowMs: 60_000,
  });
  if (limited) return limited;
  try {
    const snapshot = await withTimeout(getMarketBoardSnapshot(), 12_000, "market inventory");
    return Response.json(snapshot, { status: snapshot.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError("market-board", error, "READ_ONLY");
  }
}
