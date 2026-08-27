# Downrail

Downrail turns DreamDEX BTC and ETH Event Contracts into transparent, short-duration downside protection plans. It is a hedging interface—not a prediction-market creator, insurer, or guaranteed-protection product.

The current build reads live DreamDEX inventory on Somnia Shannon, constructs deterministic depth-aware multi-window plans, connects injected wallets, builds exact unsigned order calls, and includes an explicitly gated tiny-pilot sender with receipt and indexer reconciliation. No private key is accepted or stored.

Owner-only production deployment: https://downrail.sky11120.chatgpt.site

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
src/components/                               Planner, wallet, and execution UI
src/features/hedge-planner/                    Pure bigint planning and preflight
src/features/execution/                        Tiny-pilot validation and receipts
src/lib/dreamdex/                              Network config and SDK adapters
```

The complete product specification and execution guide are in `../project.md` and `../agent.md`.

## Execution safety boundary

- Planning and unsigned review never open the wallet or send a transaction.
- The first live pilot is limited to one IOC protection leg and at most 2.00 collateral units.
- Every quote, market state, pool grid, and expiry is refreshed before the review is encoded.
- DOWN prices are converted to the SDK's complementary YES-price representation deterministically.
- ERC-20 approval calldata is rewritten from the SDK's unlimited default to the exact reviewed maximum cost.
- Reviews expire after two minutes and are bound to the connected account, Shannon chain ID, and a tamper-evident fingerprint.
- Submission remains disabled until the user checks the exact-review acknowledgement. Each call still requires confirmation inside the wallet.
- Calls are sent sequentially. A reverted or unconfirmed receipt stops the sequence.
- Confirmed execution is reconciled by stable market ID against indexed fills, positions, and resting orders.
- Downrail provides partial, scenario-dependent hedging—not insurance or guaranteed protection.

## Tiny testnet pilot

1. Connect a funded Shannon testnet wallet.
2. Set **Maximum spend** to `2.00` or less.
3. Build the unsigned one-leg review.
4. Inspect the fingerprint, approval target, exact allowance, order target, calldata, and expiry.
5. Check the authorization acknowledgement only if the calls are acceptable.
6. Submit and confirm each testnet call in the wallet.
7. Keep the page open while Downrail verifies receipts and reconciles the resulting fill or IOC cancellation.

Do not use a mainnet wallet, seed phrase, or private key with this project.
