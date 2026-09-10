import { orderReviewSchema } from "@/features/execution/review-schema";
import { consumeExecutionReview } from "@/features/execution/execution-ticket";
import { assertTinyPilot } from "@/features/execution/run-reviewed-calls";
import { verifyLiveOrderReview } from "@/lib/dreamdex/review-validation";
import { apiError, readJsonObject } from "@/lib/http/api";
import { rateLimitResponse } from "@/lib/http/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "order-execution-check", {
    limit: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = await readJsonObject(request);
    const review = orderReviewSchema.parse(body.review);
    assertTinyPilot(review, review.account);
    const verified = await verifyLiveOrderReview(review);
    consumeExecutionReview(review);
    return Response.json({
      mode: "LIVE_EXECUTION_CHECK",
      verified: true,
      checkedAt: new Date().toISOString(),
      ...verified,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError("order-execution-check", error, "LIVE_EXECUTION_CHECK");
  }
}
