import { erc6909Abi } from "@somnia-chain/markets-sdk";
import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  isAddress,
  isHash,
  type Hex,
} from "viem";

import {
  assertCurrentWalletContext,
  waitForSuccessfulReceipt,
  type ReceiptRecord,
  type TransactionProvider,
} from "@/features/execution/run-reviewed-calls";
import {
  claimReviewSchema,
  validateClaimReview,
  type ClaimReview,
} from "./claim-review";

export type ExecutedClaimCall = {
  call: ClaimReview["calls"][number];
  hash: Hex;
  receipt: ReceiptRecord;
};

function rpcQuantity(name: string, value: unknown) {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) {
    throw new RangeError(`wallet RPC returned an invalid ${name}`);
  }
  return BigInt(value);
}

export function assertReviewedClaim(
  input: ClaimReview,
  account: string,
  now = Date.now(),
) {
  const review = claimReviewSchema.parse(input);
  if (!isAddress(account) || getAddress(account) !== getAddress(review.account)) {
    throw new RangeError("claim review account no longer matches the wallet");
  }
  if (review.chainId !== 50_312) throw new RangeError("claim review is not for Shannon");
  if (Date.parse(review.generatedAt) > now + 30_000) {
    throw new RangeError("claim review generation time is in the future");
  }
  if (Date.parse(review.validUntil) <= now + 10_000) {
    throw new RangeError("claim review is expired or too close to expiry");
  }
  validateClaimReview(review);
  return review;
}

export async function runReviewedClaim(
  provider: TransactionProvider,
  input: ClaimReview,
  account: string,
  onHash?: (call: ClaimReview["calls"][number], hash: Hex) => void,
): Promise<ExecutedClaimCall[]> {
  const review = assertReviewedClaim(input, account);
  await assertCurrentWalletContext(provider, account);
  const [balanceResult, nativeResult, gasPriceResult] = await Promise.all([
    provider.request({
      method: "eth_call",
      params: [{
        from: getAddress(account),
        to: getAddress(review.outcomeToken),
        data: encodeFunctionData({
          abi: erc6909Abi,
          functionName: "balanceOf",
          args: [getAddress(account), BigInt(review.outcomeId)],
        }),
      }, "latest"],
    }),
    provider.request({ method: "eth_getBalance", params: [getAddress(account), "latest"] }),
    provider.request({ method: "eth_gasPrice" }),
  ]);
  if (typeof balanceResult !== "string" || !/^0x[0-9a-f]*$/i.test(balanceResult)) {
    throw new RangeError("wallet RPC returned an invalid outcome balance");
  }
  const liveBalance = decodeFunctionResult({
    abi: erc6909Abi,
    functionName: "balanceOf",
    data: balanceResult as Hex,
  });
  if (liveBalance < BigInt(review.amountRaw)) {
    throw new RangeError("live outcome balance is below the reviewed claim amount");
  }
  let nativeBalance = rpcQuantity("native balance", nativeResult);
  const gasPrice = rpcQuantity("gas price", gasPriceResult);
  const completed: ExecutedClaimCall[] = [];
  for (const call of review.calls) {
    assertReviewedClaim(review, account);
    await assertCurrentWalletContext(provider, account);
    const transaction = {
      from: getAddress(account),
      to: getAddress(call.to),
      data: call.data,
      value: "0x0",
    };
    await provider.request({ method: "eth_call", params: [transaction, "latest"] });
    const estimate = rpcQuantity(
      "gas estimate",
      await provider.request({ method: "eth_estimateGas", params: [transaction] }),
    );
    const gasCost = estimate * gasPrice;
    if (nativeBalance < gasCost) throw new RangeError("wallet has insufficient native token for claim gas");
    nativeBalance -= gasCost;
    const hash = await provider.request({ method: "eth_sendTransaction", params: [transaction] });
    if (typeof hash !== "string" || !isHash(hash)) {
      throw new Error("wallet did not return a valid claim transaction hash");
    }
    const transactionHash = hash as Hex;
    onHash?.(call, transactionHash);
    const receipt = await waitForSuccessfulReceipt(provider, transactionHash);
    completed.push({ call, hash: transactionHash, receipt });
  }
  return completed;
}
