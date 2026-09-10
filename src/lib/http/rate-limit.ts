type RateLimitRule = {
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 5_000;

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();
  return request.headers.get("x-real-ip")?.trim() || forwarded || "local";
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimitResponse(
  request: Request,
  scope: string,
  rule: RateLimitRule,
  now = Date.now(),
) {
  if (!Number.isInteger(rule.limit) || rule.limit < 1) {
    throw new RangeError("rate limit must be a positive integer");
  }
  if (!Number.isInteger(rule.windowMs) || rule.windowMs < 1_000) {
    throw new RangeError("rate limit window must be at least one second");
  }

  pruneExpiredBuckets(now);
  const key = `${scope}:${clientAddress(request)}`;
  const previous = buckets.get(key);
  const bucket = !previous || previous.resetAt <= now
    ? { count: 1, resetAt: now + rule.windowMs }
    : { ...previous, count: previous.count + 1 };
  buckets.set(key, bucket);

  const remaining = Math.max(0, rule.limit - bucket.count);
  const headers = {
    "Cache-Control": "no-store",
    "RateLimit-Limit": String(rule.limit),
    "RateLimit-Remaining": String(remaining),
    "RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1_000)),
  };
  if (bucket.count <= rule.limit) return null;

  return Response.json(
    {
      error: "Too many requests. Wait briefly and try again.",
      code: "RATE_LIMITED",
      mode: "REQUEST_GUARD",
    },
    {
      status: 429,
      headers: {
        ...headers,
        "Retry-After": String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000))),
      },
    },
  );
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
