export const DREAMDEX_INDEXER_URL =
  process.env.DREAMDEX_INDEXER_URL ??
  "https://dev.smk.somnia.host/v1/graphql";

export const DREAMDEX_WS_RPC_URL =
  process.env.DREAMDEX_WS_RPC_URL ??
  "wss://api.infra.testnet.somnia.network/ws";

export const DREAMDEX_HTTP_RPC_URL =
  process.env.DREAMDEX_HTTP_RPC_URL ??
  "https://dream-rpc.somnia.network";

/**
 * Current DreamDEX Event Contracts venue discovered on Shannon testnet on
 * 2026-08-27. Keep this overrideable because venue IDs can rotate.
 */
export const DREAMDEX_VENUE_ID =
  process.env.DREAMDEX_VENUE_ID ??
  "0x679795a0195a1b76cdebb7c51d74e058aee92919b8c3389af86ef24535e8a28c";

export const SHANNON_CHAIN_ID = 50_312;
