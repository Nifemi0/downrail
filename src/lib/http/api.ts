import { randomUUID } from "node:crypto";

const MAX_JSON_BYTES = 16 * 1024;

export type PublicApiError = {
  error: string;
  code: string;
  requestId: string;
};

export function assertJsonRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim();
  if (contentType !== "application/json") {
    throw new RangeError("content-type must be application/json");
  }
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_JSON_BYTES)) {
    throw new RangeError("request body is too large");
  }
}

export async function readJsonObject(request: Request) {
  assertJsonRequest(request);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    throw new RangeError("request body is too large");
  }
  const value: unknown = JSON.parse(text);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RangeError("request body must be a JSON object");
  }
  return value as Record<string, unknown>;
}

export function apiError(
  operation: string,
  error: unknown,
  mode: string,
) {
  const requestId = randomUUID();
  const clientError = error instanceof RangeError || error instanceof SyntaxError;
  const code = clientError ? "INVALID_REQUEST" : "UPSTREAM_UNAVAILABLE";
  console.error(JSON.stringify({
    level: "error",
    operation,
    requestId,
    code,
    errorName: error instanceof Error ? error.name : "UnknownError",
  }));
  return Response.json(
    {
      error: clientError
        ? (error instanceof Error ? error.message : "invalid request")
        : "A required Shannon service is temporarily unavailable.",
      code,
      requestId,
      mode,
    } satisfies PublicApiError & { mode: string },
    {
      status: clientError ? 400 : 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function withTimeout<T>(
  operation: Promise<T>,
  milliseconds: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out`)),
          milliseconds,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function mapWithConcurrency<T, U>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<U>,
): Promise<U[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }
  const results = new Array<U>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}
