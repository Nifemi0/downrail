export type DownAskLevel = { priceRaw: bigint; quantityRaw: bigint };

export type HedgeMarketCandidate = {
  marketId: string;
  poolAddress?: string;
  asset: "BTC" | "ETH";
  question: string;
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
  question: string;
  expiryUnixSeconds: number;
  intervalSeconds: number;
  limitPriceRaw: bigint;
  quantityRaw: bigint;
  estimatedBookCostRaw: bigint;
  maximumCostRaw: bigint;
  conditionalGrossPayoutRaw: bigint;
  conditionalNetPayoutRaw: bigint;
  fills: PlannedBookFill[];
};

export type RolloverCheckpoint = {
  sequence: number;
  startsAt: number;
  targetEndsAt: number;
  intervalSeconds: number;
  estimatedBudgetRaw: bigint;
  status: "FUTURE_MARKET_REQUIRED";
};

export type ConditionalOutcome = {
  outcome: "DOWN_WINS" | "DOWN_LOSES";
  hedgeNetRaw: bigint;
  combinedScenarioChangeRaw: bigint;
};

export type ExcludedHedgeMarket = {
  marketId: string;
  reason:
    | "wrong_asset"
    | "expires_too_soon"
    | "invalid_interval"
    | "invalid_protocol_grid"
    | "empty_book";
};

export type MultiWindowHedgePlan = {
  asset: "BTC" | "ETH";
  requestedHorizonEndsAt: number;
  currentEstimatedBookCostRaw: bigint;
  currentMaximumCostRaw: bigint;
  futureBudgetReserveRaw: bigint;
  budgetRemainingRaw: bigint;
  conditionalGrossPayoutRaw: bigint;
  conditionalNetPayoutRaw: bigint;
  modeledPortfolioLossRaw: bigint;
  outcomes: ConditionalOutcome[];
  legs: MultiWindowHedgeLeg[];
  rolloverCheckpoints: RolloverCheckpoint[];
  excludedMarkets: ExcludedHedgeMarket[];
  warnings: string[];
};

type EligibleCandidate = HedgeMarketCandidate & {
  asks: DownAskLevel[];
  intervalDistanceSeconds: number;
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
): EligibleCandidate | ExcludedHedgeMarket {
  if (candidate.asset !== input.asset) {
    return { marketId: candidate.marketId, reason: "wrong_asset" };
  }
  if (
    candidate.expiryUnixSeconds <=
    input.nowUnixSeconds + input.minExecutionHeadroomSeconds
  ) {
    return { marketId: candidate.marketId, reason: "expires_too_soon" };
  }
  if (!Number.isInteger(candidate.intervalSeconds) || candidate.intervalSeconds <= 0) {
    return { marketId: candidate.marketId, reason: "invalid_interval" };
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
    intervalDistanceSeconds: Math.abs(
      candidate.intervalSeconds - input.requestedHorizonSeconds,
    ),
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
  const conditionalGrossPayoutRaw = (quantityRaw * oneQuote) / oneOutcome;
  return {
    marketId: candidate.marketId,
    poolAddress: candidate.poolAddress,
    question: candidate.question,
    expiryUnixSeconds: candidate.expiryUnixSeconds,
    intervalSeconds: candidate.intervalSeconds,
    limitPriceRaw,
    quantityRaw,
    estimatedBookCostRaw,
    maximumCostRaw,
    conditionalGrossPayoutRaw,
    conditionalNetPayoutRaw: conditionalGrossPayoutRaw - maximumCostRaw,
    fills,
  };
}

function buildRolloverCheckpoints(
  firstExpiry: number,
  intervalSeconds: number,
  horizonEndsAt: number,
  futureBudgetRaw: bigint,
): RolloverCheckpoint[] {
  const windows: Array<Omit<RolloverCheckpoint, "estimatedBudgetRaw">> = [];
  let startsAt = firstExpiry;
  while (startsAt < horizonEndsAt) {
    const targetEndsAt = Math.min(startsAt + intervalSeconds, horizonEndsAt);
    windows.push({
      sequence: windows.length + 1,
      startsAt,
      targetEndsAt,
      intervalSeconds: targetEndsAt - startsAt,
      status: "FUTURE_MARKET_REQUIRED",
    });
    startsAt = targetEndsAt;
  }
  if (windows.length === 0) return [];

  const baseBudget = futureBudgetRaw / BigInt(windows.length);
  let remainder = futureBudgetRaw % BigInt(windows.length);
  return windows.map((window) => {
    const extra = remainder > 0n ? 1n : 0n;
    remainder -= extra;
    return { ...window, estimatedBudgetRaw: baseBudget + extra };
  });
}

function emptyPlan(
  input: MultiWindowHedgeInput,
  requestedHorizonEndsAt: number,
  modeledPortfolioLossRaw: bigint,
  excludedMarkets: ExcludedHedgeMarket[],
  warning: string,
): MultiWindowHedgePlan {
  return {
    asset: input.asset,
    requestedHorizonEndsAt,
    currentEstimatedBookCostRaw: 0n,
    currentMaximumCostRaw: 0n,
    futureBudgetReserveRaw: 0n,
    budgetRemainingRaw: input.budgetRaw,
    conditionalGrossPayoutRaw: 0n,
    conditionalNetPayoutRaw: 0n,
    modeledPortfolioLossRaw,
    outcomes: [
      {
        outcome: "DOWN_WINS",
        hedgeNetRaw: 0n,
        combinedScenarioChangeRaw: -modeledPortfolioLossRaw,
      },
      {
        outcome: "DOWN_LOSES",
        hedgeNetRaw: 0n,
        combinedScenarioChangeRaw: -modeledPortfolioLossRaw,
      },
    ],
    legs: [],
    rolloverCheckpoints: [],
    excludedMarkets,
    warnings: [warning],
  };
}

/**
 * Builds one currently executable DOWN leg plus explicit future rollover
 * checkpoints. Payouts are conditional on the exact market resolving DOWN;
 * they are never represented as guaranteed portfolio-loss coverage.
 */
export function buildMultiWindowHedgePlan(
  input: MultiWindowHedgeInput,
): MultiWindowHedgePlan {
  assertPositive("exposureRaw", input.exposureRaw);
  assertPositive("budgetRaw", input.budgetRaw);
  assertPositive("requestedHorizonSeconds", input.requestedHorizonSeconds);
  assertPositive("minExecutionHeadroomSeconds", input.minExecutionHeadroomSeconds);
  assertPositive("nowUnixSeconds", input.nowUnixSeconds);
  assertPositive("maxMarkets", input.maxMarkets);
  if (input.downsideMoveBps <= 0n || input.downsideMoveBps > 10_000n) {
    throw new RangeError("downsideMoveBps must be between 1 and 10000");
  }

  const requestedHorizonEndsAt = input.nowUnixSeconds + input.requestedHorizonSeconds;
  const modeledPortfolioLossRaw =
    (input.exposureRaw * input.downsideMoveBps) / 10_000n;
  const eligible: EligibleCandidate[] = [];
  const excludedMarkets: ExcludedHedgeMarket[] = [];
  for (const candidate of input.candidates) {
    const inspected = inspectCandidate(candidate, input);
    if ("reason" in inspected) excludedMarkets.push(inspected);
    else eligible.push(inspected);
  }

  eligible.sort((left, right) => {
    if (left.intervalDistanceSeconds !== right.intervalDistanceSeconds) {
      return left.intervalDistanceSeconds - right.intervalDistanceSeconds;
    }
    if (left.expiryUnixSeconds !== right.expiryUnixSeconds) {
      return left.expiryUnixSeconds - right.expiryUnixSeconds;
    }
    const leftPrice = left.asks[0]?.priceRaw ?? 0n;
    const rightPrice = right.asks[0]?.priceRaw ?? 0n;
    if (leftPrice !== rightPrice) return leftPrice < rightPrice ? -1 : 1;
    return left.marketId.localeCompare(right.marketId);
  });

  const selected = eligible[0];
  if (!selected) {
    return emptyPlan(
      input,
      requestedHorizonEndsAt,
      modeledPortfolioLossRaw,
      excludedMarkets,
      "No executable DOWN market has enough time and valid depth.",
    );
  }

  const provisionalCheckpoints = buildRolloverCheckpoints(
    selected.expiryUnixSeconds,
    selected.intervalSeconds,
    requestedHorizonEndsAt,
    0n,
  );
  const totalWindows = 1 + provisionalCheckpoints.length;
  const baseWindowBudget = input.budgetRaw / BigInt(totalWindows);
  const currentWindowBudget =
    baseWindowBudget + (input.budgetRaw % BigInt(totalWindows));
  const futureBudgetReserveRaw = input.budgetRaw - currentWindowBudget;
  const rolloverCheckpoints = buildRolloverCheckpoints(
    selected.expiryUnixSeconds,
    selected.intervalSeconds,
    requestedHorizonEndsAt,
    futureBudgetReserveRaw,
  );
  const currentLeg = planCandidate(selected, currentWindowBudget);
  if (!currentLeg) {
    return emptyPlan(
      input,
      requestedHorizonEndsAt,
      modeledPortfolioLossRaw,
      excludedMarkets,
      "The current-window allocation cannot reach executable minimum depth.",
    );
  }

  const warnings = [
    "The payout is conditional on the selected market resolving DOWN; the loss slider does not change that contract condition.",
  ];
  if (rolloverCheckpoints.length > 0) {
    warnings.unshift(
      `${rolloverCheckpoints.length} future rollover ${rolloverCheckpoints.length === 1 ? "window requires" : "windows require"} fresh markets and a new review.`,
    );
  }
  if (currentLeg.maximumCostRaw < currentWindowBudget) {
    warnings.unshift("Some current-window budget remains unused because of depth.");
  }

  const conditionalNetPayoutRaw = currentLeg.conditionalNetPayoutRaw;
  const downLossRaw = -currentLeg.maximumCostRaw;
  return {
    asset: input.asset,
    requestedHorizonEndsAt,
    currentEstimatedBookCostRaw: currentLeg.estimatedBookCostRaw,
    currentMaximumCostRaw: currentLeg.maximumCostRaw,
    futureBudgetReserveRaw,
    budgetRemainingRaw: currentWindowBudget - currentLeg.maximumCostRaw,
    conditionalGrossPayoutRaw: currentLeg.conditionalGrossPayoutRaw,
    conditionalNetPayoutRaw,
    modeledPortfolioLossRaw,
    outcomes: [
      {
        outcome: "DOWN_WINS",
        hedgeNetRaw: conditionalNetPayoutRaw,
        combinedScenarioChangeRaw: conditionalNetPayoutRaw - modeledPortfolioLossRaw,
      },
      {
        outcome: "DOWN_LOSES",
        hedgeNetRaw: downLossRaw,
        combinedScenarioChangeRaw: downLossRaw - modeledPortfolioLossRaw,
      },
    ],
    legs: [currentLeg],
    rolloverCheckpoints,
    excludedMarkets,
    warnings,
  };
}
