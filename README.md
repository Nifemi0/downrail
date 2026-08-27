# Downrail

Downrail turns DreamDEX BTC and ETH Event Contracts into transparent, short-duration downside protection plans. It is a hedging interface—not a prediction-market creator, insurer, or guaranteed-protection product.

The current build reads live DreamDEX inventory on Somnia Shannon, constructs one depth-aware current DOWN leg plus explicit future rollover checkpoints, connects injected wallets, and builds canonical decoded unsigned order reviews. A strict tiny-pilot sender and recovery journal are present, but signing is feature-flagged off by default. No private key is accepted or stored.

Production deployment: https://downrail.vercel.app

The repository pins Vercel's framework preset in `vercel.json`, so a fresh
project deploys as Next.js instead of depending on a dashboard-only setting.

## Requirements

- Node.js 22.20.0
- npm 11.6.2

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run doctor
npm run dev
```

Open http://localhost:3000. The diagnostic and planner perform no writes and require no wallet.

## Commands

- `npm run dev` — start the development server.
- `npm run doctor` — verify discovery, on-chain status, book parameters, and an order-book read.
- `npm test` — run planner, preflight, approval-cap, and execution-state tests.
- `npm run typecheck` — run TypeScript without emitting files.
- `npm run lint` — run ESLint.
- `npm run build` — create a production build.

## Structure

```text
scripts/doctor.ts                              Read-only DreamDEX diagnostic
src/app/api/hedge-plan/                        Live chain-verified planner
src/app/api/order-preflight/                   Unsigned bounded-call builder
src/app/api/execution-reconciliation/          Fill and position reconciliation
src/app/api/settlement-inbox/                  Historical position and claimability discovery
src/app/api/claim-review/                      Canonical decoded unsigned redemption review
src/app/api/health/                            Shannon/indexer readiness check
src/components/                               Planner, wallet, and execution UI
src/features/hedge-planner/                    Pure bigint planning and preflight
src/features/execution/                        Tiny-pilot validation and receipts
src/features/settlement/                       Claimability, review, and guarded claim sender
src/features/rollover/                         Lifecycle-triggered manual rollover queue
src/lib/dreamdex/                              Network config and SDK adapters
```

The complete product specification and execution guide are in `../project.md` and `../agent.md`.

Hackathon materials:

- [`SUBMISSION.md`](./SUBMISSION.md) — DoraHacks copy, judging alignment, and readiness gate.
- [`DEMO.md`](./DEMO.md) — timed two-to-three-minute recording runbook.
- [`FEEDBACK.md`](./FEEDBACK.md) — DreamDEX SDK and documentation feedback from the implementation.

## Execution safety boundary

- Planning and unsigned review never open the wallet or send a transaction.
- The first live pilot is limited to one IOC protection leg and at most 2.00 collateral units.
- Every quote, market state, pool grid, and expiry is refreshed before the review is encoded.
- DOWN prices are converted to the SDK's complementary YES-price representation deterministically.
- ERC-20 approval calldata is rewritten from the SDK's unlimited default to the exact reviewed maximum cost.
- Reviews expire after two minutes and are bound to the connected account, Shannon chain ID, and a tamper-evident fingerprint.
- Submission remains disabled until the user checks the exact-review acknowledgement. Each call still requires confirmation inside the wallet.
- Calls are sent sequentially. A reverted or unconfirmed receipt stops the sequence.
- Confirmed execution is persisted as public device-local pointers and reconciled by stable market ID plus exact order transaction against indexed fills, order history, positions, and resting orders.
- Historical positions are rechecked against live outcome-token balances and finalized settlement payout vectors before an unsigned claim review can be built.
- Responses include restrictive wallet-app security headers; public APIs bound JSON bodies and expose stable request IDs rather than raw upstream errors.
- Downrail provides partial, scenario-dependent hedging—not insurance or guaranteed protection.

## Tiny testnet pilot

1. Connect a funded Shannon testnet wallet.
2. Set **Maximum spend** to `2.00` or less.
3. Build the unsigned one-leg review.
4. Inspect the fingerprint, approval target, exact allowance, order target, calldata, and expiry.
5. Check the authorization acknowledgement only if the calls are acceptable.
6. A maintainer must deliberately enable `NEXT_PUBLIC_EXECUTION_ENABLED=true`; it is false by default.
7. Submit and confirm each testnet call in the wallet only after a separate explicit live-test approval.
8. Downrail verifies receipts, persists hashes, and reconciles the resulting fill or proven IOC cancellation; the activity can be rechecked after reload.

Do not use a mainnet wallet, seed phrase, or private key with this project.
