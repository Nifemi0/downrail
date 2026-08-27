import {
  SOMNIA_TESTNET_ADDRESSES,
  SomniaMarkets,
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { createWalletClient, http, type Address } from "viem";

import {
  DREAMDEX_INDEXER_URL,
  DREAMDEX_HTTP_RPC_URL,
  DREAMDEX_WS_RPC_URL,
} from "./config";

/** Creates an unauthenticated, read-only exchange. */
function exchangeConfig() {
  return {
    indexerUrl: DREAMDEX_INDEXER_URL,
    chain: somniaShannon,
    wsRpcUrl: DREAMDEX_WS_RPC_URL,
    addresses: SOMNIA_TESTNET_ADDRESSES,
  };
}

export function createReadOnlyExchange() {
  return new SomniaMarkets(exchangeConfig());
}

/** Creates a build-only exchange bound to an address, without signing power. */
export function createUnsignedExchange(account: Address) {
  const walletClient = createWalletClient({
    account,
    chain: somniaShannon,
    transport: http(DREAMDEX_HTTP_RPC_URL),
  });

  return new SomniaMarkets({
    ...exchangeConfig(),
    walletClient,
  });
}
