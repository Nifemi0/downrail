import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  isAddress,
  isHash,
  parseAbi,
  type Hex,
} from "viem";

import {
  orderReviewSchema,
  SHANNON_CHAIN_ID,
  type OrderReview,
  type ReviewedCall,
} from "./review-schema";
import { validateReviewedOrder } from "./validate-reviewed-order";

export const PILOT_MAXIMUM_COST_RAW = 2_000_000n;
export { SHANNON_CHAIN_ID };
export type ReviewedPilot = OrderReview;
export type { ReviewedCall };

export type TransactionProvider = {
  request: (request: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
};

export type ReceiptRecord = {
  transactionHash?: string;
  status?: string | number;
  blockNumber?: string;
  from?: string;
  to?: string;
  [key: string]: unknown;
};

export type ExecutedReviewedCall = {
  call: ReviewedCall;
  hash: string;
  receipt: ReceiptRecord;
};

const ERC20_READ_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);

function parseRpcQuantity(name: string, value: unknown) {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) {
    throw new RangeError(`wallet RPC returned an invalid ${name}`);
  }
  return BigInt(value);
}

function parseStatus(status: ReceiptRecord["status"]) {
  if (typeof status === "number") return BigInt(status);
  if (typeof status === "string" && /^(0x[0-9a-f]+|\d+)$/i.test(status)) {
    return BigInt(status);
  }
  return null;
}

export function assertTinyPilot(
  input: OrderReview,
  account: string,
  now = Date.now(),
): OrderReview {
  const review = orderReviewSchema.parse(input);
  if (!isAddress(account) || getAddress(review.account) !== getAddress(account)) {
    throw new RangeError("review account no longer matches the connected wallet");
  }
  if (review.chainId !== SHANNON_CHAIN_ID) {
    throw new RangeError("review is not for Shannon testnet");
  }
  const maximumCostRaw = BigInt(review.plan.totalMaximumCostRaw);
  if (maximumCostRaw <= 0n || maximumCostRaw > PILOT_MAXIMUM_COST_RAW) {
    throw new RangeError("the first pilot is capped at 2.00 collateral units");
  }
  const generatedAt = Date.parse(review.generatedAt);
  if (generatedAt > now + 30_000) {
    throw new RangeError("review generation time is in the future");
  }
  if (Date.parse(review.legs[0].validUntil) <= now + 10_000) {
    throw new RangeError("review is expired or too close to expiry");
  }
  validateReviewedOrder(review);
  return review;
}

export async function assertCurrentWalletContext(
  provider: TransactionProvider,
  expectedAccount: string,
) {
  const [accountsResult, chainResult] = await Promise.all([
    provider.request({ method: "eth_accounts" }),
    provider.request({ method: "eth_chainId" }),
  ]);
  const currentAccount =
    Array.isArray(accountsResult) && typeof accountsResult[0] === "string"
      ? accountsResult[0]
      : null;
  if (!currentAccount || !isAddress(currentAccount)) {
    throw new RangeError("wallet no longer exposes the reviewed account");
  }
  if (getAddress(currentAccount) !== getAddress(expectedAccount)) {
    throw new RangeError("wallet account changed after review");
  }
  if (
    typeof chainResult !== "string" ||
    !/^0x[0-9a-f]+$/i.test(chainResult) ||
    BigInt(chainResult) !== BigInt(SHANNON_CHAIN_ID)
  ) {
    throw new RangeError("wallet network changed after review");
  }
}

export async function assertPilotFunding(
  provider: TransactionProvider,
  review: OrderReview,
) {
  const leg = review.legs[0];
  const [collateralResult, nativeResult, gasPriceResult] = await Promise.all([
    provider.request({
      method: "eth_call",
      params: [{
        from: getAddress(review.account),
        to: getAddress(leg.collateralToken),
        data: encodeFunctionData({
          abi: ERC20_READ_ABI,
          functionName: "balanceOf",
          args: [getAddress(review.account)],
        }),
      }, "latest"],
    }),
    provider.request({
      method: "eth_getBalance",
      params: [getAddress(review.account), "latest"],
    }),
    provider.request({ method: "eth_gasPrice" }),
  ]);
  if (typeof collateralResult !== "string" || !/^0x[0-9a-f]*$/i.test(collateralResult)) {
    throw new RangeError("wallet RPC returned an invalid collateral balance");
  }
  const collateralBalance = decodeFunctionResult({
    abi: ERC20_READ_ABI,
    functionName: "balanceOf",
    data: collateralResult as Hex,
  });
  if (collateralBalance < BigInt(review.plan.totalMaximumCostRaw)) {
    throw new RangeError("wallet has insufficient collateral for the reviewed maximum cost");
  }
  const nativeBalance = parseRpcQuantity("native balance", nativeResult);
  const gasPrice = parseRpcQuantity("gas price", gasPriceResult);
  if (nativeBalance === 0n) throw new RangeError("wallet has no native token for gas");
  return { collateralBalance, nativeBalance, gasPrice };
}

export async function estimateReviewedCall(
  provider: TransactionProvider,
  account: string,
  call: ReviewedCall,
) {
  const result = await provider.request({
    method: "eth_estimateGas",
    params: [{
      from: getAddress(account),
      to: getAddress(call.to),
      data: call.data,
      value: "0x0",
    }],
  });
  const estimatedGas = parseRpcQuantity("gas estimate", result);
  if (estimatedGas === 0n) throw new RangeError("wallet RPC returned a zero gas estimate");
  return estimatedGas;
}

export async function waitForSuccessfulReceipt(
  provider: TransactionProvider,
  hash: string,
  options: {
    timeoutMs?: number;
    pollMs?: number;
    expectedFrom?: string;
    expectedTo?: string;
  } = {},
): Promise<ReceiptRecord> {
  if (!isHash(hash)) throw new RangeError("wallet returned an invalid transaction hash");
  const timeoutMs = options.timeoutMs ?? 120_000;
  const pollMs = options.pollMs ?? 1_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    });
    if (result && typeof result === "object") {
      const receipt = result as ReceiptRecord;
      if (
        receipt.transactionHash &&
        (!isHash(receipt.transactionHash) ||
          receipt.transactionHash.toLowerCase() !== hash.toLowerCase())
      ) {
        throw new Error("wallet RPC returned a receipt for a different transaction");
      }
      if (
        options.expectedFrom
        && typeof receipt.from === "string"
        && getAddress(receipt.from) !== getAddress(options.expectedFrom)
      ) {
        throw new Error("wallet RPC returned a receipt from a different account");
      }
      if (
        options.expectedTo
        && typeof receipt.to === "string"
        && getAddress(receipt.to) !== getAddress(options.expectedTo)
      ) {
        throw new Error("wallet RPC returned a receipt for a different destination");
      }
      if (parseStatus(receipt.status) !== 1n) {
        throw new Error(`transaction ${hash} reverted on chain`);
      }
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(`timed out waiting for transaction ${hash}`);
}

export async function runReviewedPilot(
  provider: TransactionProvider,
  input: OrderReview,
  account: string,
  onProgress?: (event: {
    index: number;
    total: number;
    phase: "CHECKING_FUNDS" | "SIMULATING" | "AWAITING_SIGNATURE" | "MINING" | "CONFIRMED";
    call: ReviewedCall;
    hash?: string;
    estimatedGas?: bigint;
  }) => void,
): Promise<ExecutedReviewedCall[]> {
  const review = assertTinyPilot(input, account);
  const calls = review.legs[0].calls;
  const completed: ExecutedReviewedCall[] = [];

  onProgress?.({
    index: 0,
    total: calls.length,
    phase: "CHECKING_FUNDS",
    call: calls[0],
  });
  const funding = await assertPilotFunding(provider, review);
  let remainingNative = funding.nativeBalance;

  for (const [index, call] of calls.entries()) {
    assertTinyPilot(review, account);
    await assertCurrentWalletContext(provider, account);
    onProgress?.({ index, total: calls.length, phase: "SIMULATING", call });
    const estimatedGas = await estimateReviewedCall(provider, account, call);
    const estimatedGasCost = estimatedGas * funding.gasPrice;
    if (remainingNative < estimatedGasCost) {
      throw new RangeError("wallet has insufficient native token for estimated gas");
    }
    remainingNative -= estimatedGasCost;
    onProgress?.({
      index,
      total: calls.length,
      phase: "AWAITING_SIGNATURE",
      call,
      estimatedGas,
    });
    const result = await provider.request({
      method: "eth_sendTransaction",
      params: [{
        from: getAddress(account),
        to: getAddress(call.to),
        data: call.data,
        value: "0x0",
      }],
    });
    if (typeof result !== "string" || !isHash(result)) {
      throw new Error("wallet did not return a valid transaction hash");
    }
    onProgress?.({ index, total: calls.length, phase: "MINING", call, hash: result });
    const receipt = await waitForSuccessfulReceipt(provider, result, {
      expectedFrom: account,
      expectedTo: call.to,
    });
    completed.push({ call, hash: result, receipt });
    onProgress?.({ index, total: calls.length, phase: "CONFIRMED", call, hash: result });
  }

  return completed;
}
