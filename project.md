# Downrail project specification

## Snapshot

- Product: Downrail
- Product thesis: Know what the contract actually covers.
- Event: Somnia × DreamDEX Event Contracts Hackathon
- Network: Somnia Shannon testnet, chain ID `50312`
- Assets: BTC and ETH
- Deployment: https://downrail.vercel.app
- Repository: https://github.com/Nifemi0/downrail
- Status date: September 9, 2026
- BUIDL: https://dorahacks.io/buidl/48288 — submitted, under review.
- Hacker registration: confirmed.
- Public 2:48 demo: https://youtu.be/yLCXjO3UtFs

## Product

Downrail is a consumer-facing conditional-offset planning and execution layer for DreamDEX Event Contracts. A user starts with an existing BTC or ETH exposure and selects a horizon; advanced controls hold the modeled loss, spending limit, offset threshold and optional rollover reserve. Downrail reads live NO liquidity, translates the exact below-opening-price trigger, compares executable routes, refuses weak wallet reviews, exposes the entry-price gap, and carries reviewed positions through reconciliation, settlement, claim review, and optional manual rollover.

Downrail is not insurance, a prediction-market creator, an AI trading oracle, or a promise of complete protection.

## Problem

Event Contracts are simple as isolated UP or DOWN trades. Using them for continued portfolio protection is not. A user must select the correct market, inspect executable depth, size to protocol grids, stay within budget, monitor expiry, verify receipts, distinguish fills from unfilled IOC orders, find finalized positions, claim payouts, and repeat the process when protection should continue.

Downrail makes that lifecycle one understandable product.

## Core user journey

1. Open the read-only product and inspect live BTC/ETH protection windows.
2. Select an asset and enter exposure value, loss scenario, comparison target, horizon, maximum spend, and optional rollover reserve.
3. Generate a deterministic plan from live DreamDEX inventory and executable depth.
4. Read the exact market question, entry-price mismatch warning, premium, gross return, net result, and both binary outcomes.
5. Connect a Shannon wallet and inspect exact decoded calls when the selected route is executable.
6. Confirm one bounded IOC protection leg.
7. Verify receipts and reconcile the fill, position, resting order, or unfilled IOC result.
8. Recover public transaction state after reload.
9. Discover finalized historical positions and reviewed claim calls.
10. Verify post-claim state and generate the next manual rollover recommendation.

## Differentiation

Current competing entries already cover maximum-loss order sizing and chained or automatic Event Contract wagers. Downrail must lead with four distinctions:

- It starts from an asset the user already holds.
- It sizes against live executable liquidity with deterministic integer calculations.
- It separates premium, gross winning return, net result, conditional loss offset, and residual loss rather than presenting one ambiguous payout number.
- It warns when the contract's settlement reference is not the user's portfolio entry price.
- It treats execution, settlement, claiming, and continuation as one user-controlled protection lifecycle.

## Architecture

```text
Next.js interface
  ├─ live protection window board
  ├─ deterministic route comparison and contract-fit summary
  ├─ wallet and decoded-call review
  └─ portfolio settlement inbox

Application APIs
  ├─ /api/hedge-plan
  ├─ /api/order-preflight
  ├─ /api/order-execution-check
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
- Order review is available only when an executable route reaches the user's loss-offset threshold and its possible net gain is at least the premium at risk. Scenario labels never represent probability estimates or guaranteed protection.
- Rollover collateral is zero by default and changes only when the user explicitly selects a reserve.
- Every transaction is decoded and visible before signing.
- Reviews are short-lived and bound to wallet, chain, market, and fingerprint; immediately before submission the server rechecks the exact venue, pool, collateral, decimals, expiry and active chain status.
- The SDK's unlimited approval is replaced with the exact reviewed allowance.
- Remaining collateral allowances and claim-operator permissions are surfaced for explicit wallet-controlled revocation.
- RPC-heavy public endpoints have bounded per-instance request throttling; shared distributed throttling remains a deployment hardening concern.
- State is keyed by stable market ID, not a recyclable pool address.
- No private key or seed phrase is accepted, stored, logged, or committed.
- Automatic or custodial rollover is outside the MVP.

## Implemented

- Live venue, asset, market, on-chain status, grid, expiry, and order-book reads.
- Depth-aware current DOWN leg plus explicit future rollover checkpoints.
- Factual conditional-offset label, exact market-question translation, gross/net cash flows, entry-price gap warning, and both binary outcomes.
- Native injected-wallet discovery and Shannon network control.
- Exact bounded approval and BUY_NO IOC review.
- Live indexer-plus-chain review validation immediately before the wallet opens.
- Guarded sequential sender, receipts, recovery journal, and reconciliation.
- Historical ERC-6909 position scanning and finalized payout-vector checks.
- Canonical reviewed redemption calls and claim journal.
- Lifecycle-triggered manual rollover recommendations.
- Responsive landing, application, and documentation routes.
- Public Vercel deployment, public MIT repository, CI, and 101 passing local tests. The September 10 simplified decision and hardening rebuild remains local until approved for release.
- Shannon-only production pilot deliberately enabled behind the one-leg, 10.00-unit execution boundary.
- Real Shannon order and claim receipts, exact filled-order reconciliation, reload recovery, a finalized winning position, authoritative post-claim state, and a reserve-backed rollover into a fresh ETH market.

## Submission status

Deployment, public demo, BUIDL submission and separate hacker registration are complete. Organizer review is pending. See `SUBMISSION_CHECKLIST.md`.

## Post-submission scope

Do not add AI price predictions, automatic rollover, more assets, mainnet execution, social features, or unrelated design experiments during judging without a separately approved scope change.

## Submission documents

- [`HACKATHON_REVIEW.md`](./HACKATHON_REVIEW.md)
- [`EVIDENCE.md`](./EVIDENCE.md)
- [`SUBMISSION.md`](./SUBMISSION.md)
- [`DEMO.md`](./DEMO.md)
- [`FEEDBACK.md`](./FEEDBACK.md)
- [`FUNCTIONAL_AUDIT.md`](./FUNCTIONAL_AUDIT.md)
- [`FIXING_PLAN.md`](./FIXING_PLAN.md)
