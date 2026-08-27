import { parseHedgePlanRequest } from "@/features/hedge-planner/parse-hedge-intent";
import { getLiveHedgePlanSnapshot } from "@/lib/dreamdex/hedge-plan-snapshot";
import { apiError, withTimeout } from "@/lib/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const intent = parseHedgePlanRequest(new URL(request.url).searchParams);
    const snapshot = await withTimeout(
      getLiveHedgePlanSnapshot(intent),
      15_000,
      "hedge plan",
    );
    return Response.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError("hedge-plan", error, "READ_ONLY");
  }
}
