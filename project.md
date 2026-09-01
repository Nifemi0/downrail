# Downrail project specification

## Snapshot

- Product: Downrail
- Tagline: Keep the upside. Guard the downside.
- Event: Somnia × DreamDEX Event Contracts Hackathon
- Network: Somnia Shannon testnet, chain ID `50312`
- Assets: BTC and ETH
- Deployment: https://downrail.vercel.app
- Repository: https://github.com/Nifemi0/downrail
- Status date: September 1, 2026

## Product

Downrail is a consumer-facing portfolio-protection layer for DreamDEX Event Contracts. A user starts with an existing BTC or ETH exposure, chooses a protection horizon, and sets a strict spending limit. Downrail reads live DOWN liquidity, builds a deterministic current hedge leg, shows the conditional payout and loss that remains, and carries the position through reconciliation, settlement, claim review, and the next manual protection window.

Downrail is not insurance, a prediction-market creator, an AI trading oracle, or a promise of complete protection.

## Problem

Event Contracts are simple as isolated UP or DOWN trades. Using them for continued portfolio protection is not. A user must select the correct market, inspect executable depth, size to protocol grids, stay within budget, monitor expiry, verify receipts, distinguish fills from unfilled IOC orders, find finalized positions, claim payouts, and repeat the process when protection should continue.

Downrail makes that lifecycle one understandable product.

## Core user journey

1. Open the read-only product and inspect live BTC/ETH protection windows.
2. Select an asset and enter exposure value, protection horizon, and maximum spend.
3. Generate a deterministic plan from live DreamDEX inventory and executable depth.
4. Compare the unhedged loss scenario with the conditional protected outcome and residual loss.
5. Connect a Shannon wallet and inspect the exact decoded approval/order review.
6. Confirm one bounded IOC protection leg.
7. Verify receipts and reconcile the fill, position, resting order, or unfilled IOC result.
8. Recover public transaction state after reload.
9. Discover finalized historical positions and reviewed claim calls.
10. Verify post-claim state and generate the next manual rollover recommendation.

## Differentiation

Current competing entries already cover maximum-loss order sizing and chained or automatic Event Contract wagers. Downrail must lead with four distinctions:

- It starts from an asset the user already holds.
- It sizes against live executable liquidity with deterministic integer calculations.
- It shows conditional offset and residual portfolio loss rather than only order size or win probability.
- It treats execution, settlement, claiming, and continuation as one user-controlled protection lifecycle.

## Architecture

```text
Next.js interface
  ├─ live protection window board
  ├─ deterministic hedge planner
  ├─ wallet and decoded-call review
  └─ portfolio settlement inbox

Application APIs
  ├─ /api/hedge-plan
  ├─ /api/order-preflight
  ├─ /api/execution-reconciliation
  ├─ /api/settlement-inbox
  ├─ /api/claim-review
  └─ /api/health

DreamDEX / Shannon
  ├─ SDK and indexer discovery
  ├─ on-chain market and settlement checks
  ├─ order-book liquidity
  ├─ wallet-signed approval/order/claim calls
  └─ receipt and portfolio reconciliation
```

## Product invariants

- BTC and ETH only for the hackathon MVP.
- Shannon testnet only until the complete lifecycle is proven.
- Financial calculations use integer or `bigint` values.
- User spending never exceeds the reviewed budget.
- Every transaction is decoded and visible before signing.
- Reviews are short-lived and bound to wallet, chain, market, and fingerprint.
- The SDK's unlimited approval is replaced with the exact reviewed allowance.
- State is keyed by stable market ID, not a recyclable pool address.
- No private key or seed phrase is accepted, stored, logged, or committed.
- Automatic or custodial rollover is outside the MVP.

## Implemented

- Live venue, asset, market, on-chain status, grid, expiry, and order-book reads.
- Depth-aware current DOWN leg plus explicit future rollover checkpoints.
- Conditional payout and residual-risk scenario display.
- Native injected-wallet discovery and Shannon network control.
- Exact bounded approval and BUY_NO IOC review.
- Guarded sequential sender, receipts, recovery journal, and reconciliation.
- Historical ERC-6909 position scanning and finalized payout-vector checks.
- Canonical reviewed redemption calls and claim journal.
- Lifecycle-triggered manual rollover recommendations.
- Responsive landing, application, and documentation routes.
- Public Vercel deployment, public MIT repository, CI, and 57 tests.

## Evidence still required

- Production Shannon signing deliberately enabled and reverified.
- Real order receipt and fill or proven unfilled IOC result.
- Recovery after reload using that transaction.
- Real finalized position and reviewed claim receipt.
- Authoritative post-claim state and resulting rollover recommendation.
- Public two-to-three-minute demo video.
- Completed DoraHacks submission.

## Scope lock before submission

Do not add AI trading decisions, automatic rollover, more assets, mainnet execution, social features, or unrelated design experiments before the evidence and video are complete.

## Submission documents

- [`HACKATHON_REVIEW.md`](./HACKATHON_REVIEW.md)
- [`SUBMISSION.md`](./SUBMISSION.md)
- [`DEMO.md`](./DEMO.md)
- [`FEEDBACK.md`](./FEEDBACK.md)
- [`FUNCTIONAL_AUDIT.md`](./FUNCTIONAL_AUDIT.md)
- [`FIXING_PLAN.md`](./FIXING_PLAN.md)
