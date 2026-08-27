export type SingleLegHedgeInput = {
  exposureRaw: bigint;
  budgetRaw: bigint;
  downsideMoveBps: bigint;
  downAskRaw: bigint;
  quoteDecimals: number;
  outcomeDecimals: number;
  lotSizeRaw: bigint;
  minQuantityRaw: bigint;
  availableQuantityRaw?: bigint;
};

export type SingleLegHedgePlan = {
  quantityRaw: bigint;
  estimatedCostRaw: bigint;
  conditionalGrossPayoutRaw: bigint;
  conditionalNetPayoutRaw: bigint;
  modeledPortfolioLossRaw: bigint;
  downWinCombinedChangeRaw: bigint;
  downLossCombinedChangeRaw: bigint;
  budgetRemainingRaw: bigint;
};

function assertPositive(name: string, value: bigint) {
  if (value <= 0n) throw new RangeError(`${name} must be positive`);
}

function quantizeDown(value: bigint, increment: bigint) {
  assertPositive("increment", increment);
  return (value / increment) * increment;
}

function divideRoundUp(numerator: bigint, denominator: bigint) {
  assertPositive("denominator", denominator);
  return (numerator + denominator - 1n) / denominator;
}

/** Integer-only indicative calculation for one DOWN contract window. */
export function calculateSingleLegHedge(
  input: SingleLegHedgeInput,
): SingleLegHedgePlan {
  assertPositive("exposureRaw", input.exposureRaw);
  assertPositive("budgetRaw", input.budgetRaw);
  assertPositive("downAskRaw", input.downAskRaw);
  assertPositive("lotSizeRaw", input.lotSizeRaw);
  assertPositive("minQuantityRaw", input.minQuantityRaw);

  if (input.downsideMoveBps <= 0n || input.downsideMoveBps > 10_000n) {
    throw new RangeError("downsideMoveBps must be between 1 and 10000");
  }

  const oneQuote = 10n ** BigInt(input.quoteDecimals);
  const oneOutcome = 10n ** BigInt(input.outcomeDecimals);
  if (input.downAskRaw >= oneQuote) {
    throw new RangeError("downAskRaw must be less than one collateral unit");
  }

  let quantityRaw = (input.budgetRaw * oneOutcome) / input.downAskRaw;
  if (input.availableQuantityRaw !== undefined) {
    quantityRaw = quantityRaw < input.availableQuantityRaw
      ? quantityRaw
      : input.availableQuantityRaw;
  }
  quantityRaw = quantizeDown(quantityRaw, input.lotSizeRaw);

  if (quantityRaw < input.minQuantityRaw) quantityRaw = 0n;

  const estimatedCostRaw = divideRoundUp(
    input.downAskRaw * quantityRaw,
    oneOutcome,
  );
  const conditionalGrossPayoutRaw = (quantityRaw * oneQuote) / oneOutcome;
  const conditionalNetPayoutRaw = conditionalGrossPayoutRaw - estimatedCostRaw;
  const modeledPortfolioLossRaw =
    (input.exposureRaw * input.downsideMoveBps) / 10_000n;

  return {
    quantityRaw,
    estimatedCostRaw,
    conditionalGrossPayoutRaw,
    conditionalNetPayoutRaw,
    modeledPortfolioLossRaw,
    downWinCombinedChangeRaw:
      conditionalNetPayoutRaw - modeledPortfolioLossRaw,
    downLossCombinedChangeRaw: -estimatedCostRaw - modeledPortfolioLossRaw,
    budgetRemainingRaw: input.budgetRaw - estimatedCostRaw,
  };
}
