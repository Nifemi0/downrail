export type DownAskLevel = {
  priceRaw: bigint;
  quantityRaw: bigint;
};

export type HedgeMarketCandidate = {
  marketId: string;
  poolAddress?: string;
  asset: "BTC" | "ETH";
  expiryUnixSeconds: number;
  intervalSeconds: number;
  quoteDecimals: number;
  outcomeDecimals: number;
  tickSizeRaw: bigint;
  lotSizeRaw: bigint;
  minQuantityRaw: bigint;
  downAsks: DownAskLevel[];
};

export type MultiWindowHedgeInput = {
  asset: "BTC" | "ETH";
  exposureRaw: bigint;
  budgetRaw: bigint;
  downsideMoveBps: bigint;
  requestedHorizonSeconds: number;
  minExecutionHeadroomSeconds: number;
  nowUnixSeconds: number;
  maxMarkets: number;
  candidates: HedgeMarketCandidate[];
};

export type PlannedBookFill = {
  priceRaw: bigint;
  quantityRaw: bigint;
  estimatedCostRaw: bigint;
};

export type MultiWindowHedgeLeg = {
  marketId: string;
  poolAddress?: string;
  expiryUnixSeconds: number;
  intervalSeconds: number;
  limitPriceRaw: bigint;
  quantityRaw: bigint;
  estimatedBookCostRaw: bigint;
  maximumCostRaw: bigint;
  grossWinningPayoutRaw: bigint;
  netWinningProtectionRaw: bigint;
  fills: PlannedBookFill[];
};

export type ExcludedHedgeMarket = {
  marketId: string;
  reason:
    | "wrong_asset"
    | "expires_before_horizon"
    | "invalid_protocol_grid"
    | "empty_book";
};

export type MultiWindowHedgePlan = {
  asset: "BTC" | "ETH";
  requestedHorizonEndsAt: number;
  totalEstimatedBookCostRaw: bigint;
  totalMaximumCostRaw: bigint;
  budgetRemainingRaw: bigint;
  grossWinningPayoutRaw: bigint;
  netWinningProtectionRaw: bigint;
  scenarioPortfolioLossRaw: bigint;
  residualScenarioLossRaw: bigint;
  coverageBps: bigint;
  legs: MultiWindowHedgeLeg[];
  excludedMarkets: ExcludedHedgeMarket[];
  warnings: string[];
};

type EligibleCandidate = HedgeMarketCandidate & {
  asks: DownAskLevel[];
  horizonOvershootSeconds: number;
};

function assertPositive(name: string, value: bigint | number) {
  if (value <= 0) throw new RangeError(`${name} must be positive`);
}

function quantizeDown(value: bigint, increment: bigint) {
  return (value / increment) * increment;
}

function divideRoundUp(numerator: bigint, denominator: bigint) {
  return (numerator + denominator - 1n) / denominator;
}

function inspectCandidate(
  candidate: HedgeMarketCandidate,
  input: MultiWindowHedgeInput,
  horizonEndsAt: number,
): EligibleCandidate | ExcludedHedgeMarket {
  if (candidate.asset !== input.asset) {
    return { marketId: candidate.marketId, reason: "wrong_asset" };
  }

  if (
    candidate.expiryUnixSeconds <
    horizonEndsAt + input.minExecutionHeadroomSeconds
  ) {
    return {
      marketId: candidate.marketId,
      reason: "expires_before_horizon",
    };
  }

  const oneQuote = 10n ** BigInt(candidate.quoteDecimals);
  const invalidGrid =
    candidate.tickSizeRaw <= 0n ||
    candidate.lotSizeRaw <= 0n ||
    candidate.minQuantityRaw <= 0n ||
    candidate.minQuantityRaw % candidate.lotSizeRaw !== 0n;

  if (invalidGrid) {
    return { marketId: candidate.marketId, reason: "invalid_protocol_grid" };
  }

  const asks = candidate.downAsks
    .filter(
      (level) =>
        level.priceRaw > 0n &&
        level.priceRaw < oneQuote &&
        level.priceRaw % candidate.tickSizeRaw === 0n &&
        level.quantityRaw >= candidate.lotSizeRaw,
    )
    .map((level) => ({
      priceRaw: level.priceRaw,
      quantityRaw: quantizeDown(level.quantityRaw, candidate.lotSizeRaw),
    }))
    .filter((level) => level.quantityRaw > 0n)
    .sort((left, right) => {
      if (left.priceRaw === right.priceRaw) return 0;
      return left.priceRaw < right.priceRaw ? -1 : 1;
    });

  if (asks.length === 0) {
    return { marketId: candidate.marketId, reason: "empty_book" };
  }

  return {
    ...candidate,
    asks,
    horizonOvershootSeconds:
      candidate.expiryUnixSeconds -
      horizonEndsAt -
      input.minExecutionHeadroomSeconds,
  };
}

function planCandidate(
  candidate: EligibleCandidate,
  budgetLimitRaw: bigint,
): MultiWindowHedgeLeg | null {
  const oneQuote = 10n ** BigInt(candidate.quoteDecimals);
  const oneOutcome = 10n ** BigInt(candidate.outcomeDecimals);
  const fills: PlannedBookFill[] = [];
  let quantityRaw = 0n;
  let estimatedBookCostRaw = 0n;
  let limitPriceRaw = 0n;

  for (const level of candidate.asks) {
    const maximumTotalQuantityAtLevel = quantizeDown(
      (budgetLimitRaw * oneOutcome) / level.priceRaw,
      candidate.lotSizeRaw,
    );
    const affordableAtLevel =
      maximumTotalQuantityAtLevel > quantityRaw
        ? maximumTotalQuantityAtLevel - quantityRaw
        : 0n;
    const fillQuantity =
      level.quantityRaw < affordableAtLevel
        ? level.quantityRaw
        : affordableAtLevel;

    if (fillQuantity === 0n) continue;

    const fillCost = divideRoundUp(
      level.priceRaw * fillQuantity,
      oneOutcome,
    );
    fills.push({
      priceRaw: level.priceRaw,
      quantityRaw: fillQuantity,
      estimatedCostRaw: fillCost,
    });
    quantityRaw += fillQuantity;
    estimatedBookCostRaw += fillCost;
    limitPriceRaw = level.priceRaw;
  }

  if (quantityRaw < candidate.minQuantityRaw || limitPriceRaw === 0n) {
    return null;
  }

  const maximumCostRaw = divideRoundUp(
    limitPriceRaw * quantityRaw,
    oneOutcome,
  );
  const grossWinningPayoutRaw = (quantityRaw * oneQuote) / oneOutcome;

  return {
    marketId: candidate.marketId,
    poolAddress: candidate.poolAddress,
    expiryUnixSeconds: candidate.expiryUnixSeconds,
    intervalSeconds: candidate.intervalSeconds,
    limitPriceRaw,
    quantityRaw,
    estimatedBookCostRaw,
    maximumCostRaw,
    grossWinningPayoutRaw,
    netWinningProtectionRaw: grossWinningPayoutRaw - maximumCostRaw,
    fills,
  };
}

/** Builds a conservative, deterministic hedge plan from executable DOWN depth. */
export function buildMultiWindowHedgePlan(
  input: MultiWindowHedgeInput,
): MultiWindowHedgePlan {
  assertPositive("exposureRaw", input.exposureRaw);
  assertPositive("budgetRaw", input.budgetRaw);
  assertPositive("requestedHorizonSeconds", input.requestedHorizonSeconds);
  assertPositive(
    "minExecutionHeadroomSeconds",
    input.minExecutionHeadroomSeconds,
  );
  assertPositive("nowUnixSeconds", input.nowUnixSeconds);
  assertPositive("maxMarkets", input.maxMarkets);

  if (input.downsideMoveBps <= 0n || input.downsideMoveBps > 10_000n) {
    throw new RangeError("downsideMoveBps must be between 1 and 10000");
  }

  const horizonEndsAt =
    input.nowUnixSeconds + input.requestedHorizonSeconds;
  const eligible: EligibleCandidate[] = [];
  const excludedMarkets: ExcludedHedgeMarket[] = [];

  for (const candidate of input.candidates) {
    const inspected = inspectCandidate(candidate, input, horizonEndsAt);
    if ("reason" in inspected) excludedMarkets.push(inspected);
    else eligible.push(inspected);
  }

  eligible.sort((left, right) => {
    if (left.horizonOvershootSeconds !== right.horizonOvershootSeconds) {
      return left.horizonOvershootSeconds - right.horizonOvershootSeconds;
    }
    const leftPrice = left.asks[0]?.priceRaw ?? 0n;
    const rightPrice = right.asks[0]?.priceRaw ?? 0n;
    if (leftPrice !== rightPrice) return leftPrice < rightPrice ? -1 : 1;
    return left.marketId.localeCompare(right.marketId);
  });

  const selected = eligible.slice(0, input.maxMarkets);
  const allocations = new Map<string, bigint>();
  const baseAllocation =
    selected.length === 0 ? 0n : input.budgetRaw / BigInt(selected.length);
  let allocationRemainder =
    selected.length === 0
      ? input.budgetRaw
      : input.budgetRaw % BigInt(selected.length);

  for (const candidate of selected) {
    const extra = allocationRemainder > 0n ? 1n : 0n;
    allocations.set(candidate.marketId, baseAllocation + extra);
    allocationRemainder -= extra;
  }

  let legs = selected
    .map((candidate) =>
      planCandidate(candidate, allocations.get(candidate.marketId) ?? 0n),
    )
    .filter((leg): leg is MultiWindowHedgeLeg => leg !== null);

  let totalMaximumCostRaw = legs.reduce(
    (total, leg) => total + leg.maximumCostRaw,
    0n,
  );
  let unspentRaw = input.budgetRaw - totalMaximumCostRaw;

  // Recalculate with leftover budget in ranking order. This redistributes
  // budget that another market could not use because of depth or minimum size.
  for (const candidate of selected) {
    if (unspentRaw === 0n) break;
    const current = legs.find((leg) => leg.marketId === candidate.marketId);
    const currentAllocation = current?.maximumCostRaw ?? 0n;
    const expanded = planCandidate(
      candidate,
      currentAllocation + unspentRaw,
    );
    if (!expanded || expanded.maximumCostRaw <= currentAllocation) continue;

    legs = [
      ...legs.filter((leg) => leg.marketId !== candidate.marketId),
      expanded,
    ];
    totalMaximumCostRaw = legs.reduce(
      (total, leg) => total + leg.maximumCostRaw,
      0n,
    );
    unspentRaw = input.budgetRaw - totalMaximumCostRaw;
  }

  legs.sort((left, right) => {
    if (left.expiryUnixSeconds !== right.expiryUnixSeconds) {
      return left.expiryUnixSeconds - right.expiryUnixSeconds;
    }
    return left.marketId.localeCompare(right.marketId);
  });

  const totalEstimatedBookCostRaw = legs.reduce(
    (total, leg) => total + leg.estimatedBookCostRaw,
    0n,
  );
  const grossWinningPayoutRaw = legs.reduce(
    (total, leg) => total + leg.grossWinningPayoutRaw,
    0n,
  );
  const netWinningProtectionRaw = legs.reduce(
    (total, leg) => total + leg.netWinningProtectionRaw,
    0n,
  );
  const scenarioPortfolioLossRaw =
    (input.exposureRaw * input.downsideMoveBps) / 10_000n;
  const residualScenarioLossRaw =
    scenarioPortfolioLossRaw > netWinningProtectionRaw
      ? scenarioPortfolioLossRaw - netWinningProtectionRaw
      : 0n;
  const rawCoverageBps =
    (netWinningProtectionRaw * 10_000n) / scenarioPortfolioLossRaw;
  const warnings: string[] = [];

  if (selected.length === 0) {
    warnings.push("No market remains open through the requested horizon.");
  } else if (legs.length === 0) {
    warnings.push("Eligible markets have insufficient executable depth.");
  }
  if (unspentRaw > 0n && legs.length > 0) {
    warnings.push("Some budget remains unallocated because of market depth.");
  }
  if (netWinningProtectionRaw < scenarioPortfolioLossRaw) {
    warnings.push("The plan provides partial scenario coverage.");
  }

  return {
    asset: input.asset,
    requestedHorizonEndsAt: horizonEndsAt,
    totalEstimatedBookCostRaw,
    totalMaximumCostRaw,
    budgetRemainingRaw: unspentRaw,
    grossWinningPayoutRaw,
    netWinningProtectionRaw,
    scenarioPortfolioLossRaw,
    residualScenarioLossRaw,
    coverageBps: rawCoverageBps > 10_000n ? 10_000n : rawCoverageBps,
    legs,
    excludedMarkets,
    warnings,
  };
}
