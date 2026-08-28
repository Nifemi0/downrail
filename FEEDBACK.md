# DreamDEX SDK and documentation feedback

This report records feedback from building Downrail against `@somnia-chain/markets-sdk` 0.28.1 on Somnia Shannon testnet. It distinguishes behavior verified in our implementation from ideas that still need protocol confirmation.

## What worked well

### A useful read-only surface

The SDK made it possible to build a no-key diagnostic that discovers binary venues and assets, lists live Event Contract markets, verifies a sampled market on-chain, reads pool tick/lot/minimum-quantity parameters, and retrieves order-book depth. That was enough to validate the product idea before introducing wallet risk.

### Clear separation between reads and signing

Downrail can create an SDK client for public reads and a build-only client bound to an address without owning signing power. This supports a safer browser architecture: the server constructs exact unsigned calls, while the injected wallet remains the only signer.

### Useful portfolio and fill APIs

`getPortfolio`, `getUserFills`, and `getMarketOnchain` provide the pieces needed to reconcile a submitted order. We can filter the returned fills, positions, and open orders by stable market ID and compare them with on-chain status.

### Integer-compatible order parameters

The order builder accepts bigint price, quantity, and nanosecond expiry values. This lets applications keep financial values on protocol grids without floating-point conversion.

## Friction encountered

### 1. BUY_NO price semantics need a canonical example

For a desired DOWN limit price, Downrail must pass the complementary YES price to the SDK's `BUY_NO` order path. The conversion is deterministic—`oneQuote - downPrice`—but it is subtle enough to deserve a complete Event Contract example showing:

- the displayed DOWN probability or price;
- the raw quote-unit representation;
- the complementary price passed to `BUY_NO`;
- expected execution against YES-side book liquidity;
- tick quantization before call construction.

Without one end-to-end example, a correct-looking interface can encode the wrong limit.

### 2. Automatic approval should support a bounded amount

The unsigned-call builder produced an unlimited ERC-20 approval for the collateral path we tested. Downrail rewrites that calldata to approve exactly the reviewed maximum order cost.

A safer SDK API would offer one of these options:

- `approvalAmount: "exactCost"` as the default;
- an explicit bigint allowance parameter;
- a clearly named `unlimitedApproval: true` opt-in.

Returning typed metadata for token, spender, required amount, and current allowance would also avoid decoding or replacing calldata downstream.

### 3. Market ID versus pool address deserves stronger guidance

Pool addresses are operationally useful for book and order calls, but market IDs are the stable identity applications need for lifecycle tracking. The docs should explicitly state where pools may be reused and provide a lifecycle example keyed by market ID from discovery through fill, finalization, and redemption.

### 4. Finalized-market and claim documentation should be one complete flow

The live-market path is discoverable, but a production application also needs to:

1. list finalized binary markets;
2. recheck resolution and void status on-chain;
3. locate the user's outcome-token balance;
4. determine whether a claim is available;
5. build or submit the correct claim transaction;
6. verify its receipt and post-claim balance.

A single official TypeScript example covering normal resolution and voided outcomes would reduce the largest remaining integration risk for Downrail.

### 5. Receipt semantics should be emphasized

An SDK call or wallet request resolving is not equivalent to a successful transaction. Application examples should always wait for a receipt, verify the status, stop a dependent sequence after a revert, and then reconcile protocol state. This is especially important when approval and order placement are separate calls.

### 6. Indexer consistency expectations should be documented

Immediately after a receipt, a fill or position may not yet appear in indexed APIs. It would help to document:

- expected indexing delay ranges;
- recommended polling and backoff;
- cursor or `since` semantics;
- how to distinguish an unfilled IOC from delayed indexing;
- which on-chain event is authoritative for each state transition.

### 7. Client shutdown behavior can surprise one-shot scripts

In our Node diagnostic, awaited client cleanup did not release every process handle after WebSocket-backed reads, so the script explicitly exits after cleanup. A documented `close()` guarantee, a read-only HTTP mode, or a diagnostic for remaining subscriptions would make command-line checks easier to compose.

### 8. Protocol-grid helpers would prevent duplicated mistakes

The SDK exposes the raw parameters needed for safe calculations, but applications still duplicate helpers for:

- quantizing price to tick size;
- quantizing quantity to lot size;
- enforcing minimum quantity;
- computing maximum quote cost;
- formatting raw quote values by market decimals;
- validating order expiry against market lock.

Official pure helper functions with tests would improve consistency across bots and consumer applications.

## Suggested documentation example

The most valuable addition would be one browser-oriented Event Contract walkthrough:

```text
discover live market
  → verify Trading on-chain
  → read tick/lot/minimum and executable depth
  → build BUY_NO with complementary price
  → request exact collateral approval if needed
  → submit short-expiry IOC order
  → verify both receipts
  → poll fill/position by market ID
  → discover finalization
  → claim/redeem
  → verify post-claim state
```

The example should keep raw values as bigint until display formatting and should show failure branches for a stale market, insufficient depth, a reverted receipt, an unfilled IOC, and indexer delay.

## Downrail integration evidence

The repository contains concrete implementations for:

- live market and order-book diagnostics in `scripts/doctor.ts`;
- deterministic depth-aware planning in `src/features/hedge-planner/`;
- bounded approval and BUY_NO construction in `src/features/hedge-planner/build-execution-preflight.ts`;
- sequential receipt verification in `src/features/execution/run-reviewed-calls.ts`;
- market-ID reconciliation in `src/app/api/execution-reconciliation/route.ts`.

Finalized-market claiming is implemented behind the production signing lock; a real finalized position and claim receipt are still required before that path can be called live-verified.
