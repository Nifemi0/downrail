import { parseHedgePlanRequest } from "@/features/hedge-planner/parse-hedge-intent";
import { getLiveHedgePlanSnapshot } from "@/lib/dreamdex/hedge-plan-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const intent = parseHedgePlanRequest(new URL(request.url).searchParams);
    const snapshot = await getLiveHedgePlanSnapshot(intent);
    return Response.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to build hedge plan";
    const status = error instanceof RangeError ? 400 : 502;
    return Response.json(
      { error: message, mode: "READ_ONLY" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
