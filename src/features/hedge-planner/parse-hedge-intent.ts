export type HedgePlanRequest = {
  asset: "BTC" | "ETH";
  exposureRaw: bigint;
  budgetRaw: bigint;
  downsideMoveBps: bigint;
  requestedHorizonSeconds: number;
  maxMarkets: number;
};

const USDC_DECIMALS = 6;
const ONE_USDC = 10n ** BigInt(USDC_DECIMALS);
const MIN_BUDGET_RAW = 10_000n;
const MAX_EXPOSURE_RAW = 100_000_000n * ONE_USDC;

function parseDecimalToRaw(name: string, value: string | null) {
  if (value === null) throw new RangeError(`${name} is required`);
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/.exec(value);
  if (!match) {
    throw new RangeError(
      `${name} must be a non-negative decimal with at most 6 places`,
    );
  }

  const whole = BigInt(match[1]);
  const fraction = (match[2] ?? "").padEnd(USDC_DECIMALS, "0");
  return whole * ONE_USDC + BigInt(fraction || "0");
}

function parseInteger(name: string, value: string | null) {
  if (value === null || !/^\d+$/.test(value)) {
    throw new RangeError(`${name} must be an integer`);
  }
  return Number(value);
}

/** Parses public query parameters without introducing floating-point money. */
export function parseHedgePlanRequest(
  searchParams: URLSearchParams,
): HedgePlanRequest {
  const asset = searchParams.get("asset");
  if (asset !== "BTC" && asset !== "ETH") {
    throw new RangeError("asset must be BTC or ETH");
  }

  const exposureRaw = parseDecimalToRaw(
    "exposureUsd",
    searchParams.get("exposureUsd"),
  );
  const budgetRaw = parseDecimalToRaw(
    "budgetUsd",
    searchParams.get("budgetUsd"),
  );
  const downsideMoveBps = parseInteger(
    "downsideMoveBps",
    searchParams.get("downsideMoveBps"),
  );
  const requestedHorizonSeconds = parseInteger(
    "horizonSeconds",
    searchParams.get("horizonSeconds"),
  );
  const maxMarkets = parseInteger(
    "maxMarkets",
    searchParams.get("maxMarkets") ?? "3",
  );

  if (exposureRaw < ONE_USDC || exposureRaw > MAX_EXPOSURE_RAW) {
    throw new RangeError("exposureUsd must be between 1 and 100000000");
  }
  if (budgetRaw < MIN_BUDGET_RAW || budgetRaw > exposureRaw) {
    throw new RangeError(
      "budgetUsd must be at least 0.01 and no greater than exposureUsd",
    );
  }
  if (downsideMoveBps < 1 || downsideMoveBps > 5_000) {
    throw new RangeError("downsideMoveBps must be between 1 and 5000");
  }
  if (
    requestedHorizonSeconds < 15 * 60 ||
    requestedHorizonSeconds > 24 * 60 * 60
  ) {
    throw new RangeError("horizonSeconds must be between 900 and 86400");
  }
  if (maxMarkets < 1 || maxMarkets > 4) {
    throw new RangeError("maxMarkets must be between 1 and 4");
  }

  return {
    asset,
    exposureRaw,
    budgetRaw,
    downsideMoveBps: BigInt(downsideMoveBps),
    requestedHorizonSeconds,
    maxMarkets,
  };
}
