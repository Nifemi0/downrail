import { isAddress, isHash } from "viem";

export const PILOT_MAXIMUM_COST_RAW = 2_000_000n;
export const SHANNON_CHAIN_ID = 50_312;

export type TransactionProvider = {
  request: (request: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
};

export type ReviewedCall = {
  kind: "APPROVAL" | "ORDER";
  to: string;
  data: string;
  value: string;
  description: string;
};

export type ReviewedPilot = {
  account: string;
  chainId: number;
  fingerprint: string;
  plan: { totalMaximumCostRaw: string };
  legs: Array<{
    validUntil: string;
    calls: ReviewedCall[];
  }>;
};

export type ReceiptRecord = {
  transactionHash?: string;
  status?: string | number;
  blockNumber?: string;
  [key: string]: unknown;
};

export type ExecutedReviewedCall = {
  call: ReviewedCall;
  hash: string;
  receipt: ReceiptRecord;
};

function parseStatus(status: ReceiptRecord["status"]) {
  if (typeof status === "number") return BigInt(status);
  if (typeof status === "string" && /^(0x[0-9a-f]+|\d+)$/i.test(status)) {
    return BigInt(status);
  }
  return null;
}

export function assertTinyPilot(
  pilot: ReviewedPilot,
  account: string,
  now = Date.now(),
) {
  if (!isAddress(account) || pilot.account.toLowerCase() !== account.toLowerCase()) {
    throw new RangeError("review account no longer matches the connected wallet");
  }
  if (pilot.chainId !== SHANNON_CHAIN_ID) {
    throw new RangeError("review is not for Shannon testnet");
  }
  if (pilot.legs.length !== 1) {
    throw new RangeError("the first pilot must contain exactly one protection leg");
  }
  const maximumCostRaw = BigInt(pilot.plan.totalMaximumCostRaw);
  if (maximumCostRaw <= 0n || maximumCostRaw > PILOT_MAXIMUM_COST_RAW) {
    throw new RangeError("the first pilot is capped at 2.00 collateral units");
  }
  const calls = pilot.legs[0]?.calls ?? [];
  if (
    calls.length < 1 ||
    calls.length > 2 ||
    calls.filter((call) => call.kind === "ORDER").length !== 1 ||
    calls.filter((call) => call.kind === "APPROVAL").length > 1
  ) {
    throw new RangeError("review must contain one order and at most one approval");
  }
  if (new Date(pilot.legs[0].validUntil).getTime() <= now + 10_000) {
    throw new RangeError("review is expired or too close to expiry");
  }
  for (const call of calls) {
    if (!isAddress(call.to) || !/^0x[0-9a-f]*$/i.test(call.data)) {
      throw new RangeError("review contains invalid transaction calldata");
    }
    if (BigInt(call.value) < 0n) {
      throw new RangeError("review contains an invalid native value");
    }
  }
}

export async function waitForSuccessfulReceipt(
  provider: TransactionProvider,
  hash: string,
  options: { timeoutMs?: number; pollMs?: number } = {},
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
  pilot: ReviewedPilot,
  account: string,
  onProgress?: (event: {
    index: number;
    total: number;
    phase: "AWAITING_SIGNATURE" | "MINING" | "CONFIRMED";
    call: ReviewedCall;
    hash?: string;
  }) => void,
): Promise<ExecutedReviewedCall[]> {
  assertTinyPilot(pilot, account);
  const calls = pilot.legs[0].calls;
  const completed: ExecutedReviewedCall[] = [];

  for (const [index, call] of calls.entries()) {
    assertTinyPilot(pilot, account);
    onProgress?.({ index, total: calls.length, phase: "AWAITING_SIGNATURE", call });
    const result = await provider.request({
      method: "eth_sendTransaction",
      params: [{
        from: account,
        to: call.to,
        data: call.data,
        value: `0x${BigInt(call.value).toString(16)}`,
      }],
    });
    if (typeof result !== "string" || !isHash(result)) {
      throw new Error("wallet did not return a valid transaction hash");
    }
    onProgress?.({ index, total: calls.length, phase: "MINING", call, hash: result });
    const receipt = await waitForSuccessfulReceipt(provider, result);
    completed.push({ call, hash: result, receipt });
    onProgress?.({ index, total: calls.length, phase: "CONFIRMED", call, hash: result });
  }

  return completed;
}
