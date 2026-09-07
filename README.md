# Downrail

## Keep the upside. Guard the downside.

Keep your BTC or ETH. Choose a spending limit. See exactly what a conditional downside payout would—and would not—cover.

Downrail turns DreamDEX Event Contracts into an exposure-first hedging workflow: plan a current DOWN position, review its cost and residual risk, sign with your wallet, then track settlement, claim and decide whether to roll into another window.

[Try the app](https://downrail.vercel.app/app) · [Watch the 2:48 demo](https://youtu.be/yLCXjO3UtFs) · [Read the docs](https://downrail.vercel.app/docs) · [DoraHacks entry](https://dorahacks.io/buidl/48288)

## The moment Downrail is built for

You hold ETH and want to stay exposed to its upside, but you are concerned about a near-term drop. Selling removes that exposure. Buying a DOWN contract adds a conditional payout without selling your ETH—but choosing the window, checking liquidity and understanding the remaining loss should not require piecing together several trading screens.

Downrail starts with what you already hold. It shows the available current hedge leg, purchase cost, settlement condition and scenario-specific residual loss before you sign.

**Illustration, not a live quote:** a $1,000 ETH position falls to $900. If a hedge costs $10 and pays $20 because its exact DOWN condition wins, its $10 net gain reduces the combined loss from $100 to $90, before fees. It does not restore the portfolio to $1,000.

If the DOWN condition loses, the purchase cost can be lost—even if your portfolio fell over a different interval. If ETH rises, you still hold the ETH, but the hedge cost reduces your combined return. Payouts come from Event Contract collateral under the settlement rules, not money created by Downrail.

## Inspect the proof

| What you can verify | Evidence |
| --- | --- |
| Live planning and wallet-controlled execution | [Deployed Shannon app](https://downrail.vercel.app/app) |
| Filled order and reload recovery | [Recorded order evidence](./EVIDENCE.md#filled-protection-order) |
| Finalized position, 1.652 TESDC claim and empty post-claim inbox | [Lifecycle receipts and observations](./EVIDENCE.md) |
| Reserved budget carried into a filled fresh-market rollover | [Rollover evidence](./EVIDENCE.md) |
| 70 tests, typecheck, source lint and production build passed September 7 | [Bug-fix verification](./BUGFIX_REVIEW.md) |
| Specific integration findings and SDK improvement requests | [SDK feedback](./FEEDBACK.md) |

These are recorded testnet results, not proof of customer demand or mainnet readiness. The user-need hypothesis still needs validation with real users.

## What the prototype does—and does not do

The current build discovers live BTC/ETH markets, sizes one depth-aware current DOWN leg with integer arithmetic, builds decoded unsigned reviews, verifies receipts, recovers activity after reload, discovers claims and prepares manual rollover checkpoints. No private key is accepted or stored.

- Shannon testnet only, chain `50312`; the public pilot allows one IOC leg and at most 10.00 collateral units.
- Protection is partial and conditional—not insurance, guaranteed returns or one-for-one loss compensation.
- An unfilled order provides no hedge. Thin liquidity, expiry and the selected settlement condition matter.
- Future rollover checkpoints are not already-purchased coverage. Each new leg needs a fresh review and wallet confirmation.
- Planning requires no wallet. Execution needs test tokens and wallet confirmations.

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

The public product specification and contributor guide are in [`project.md`](./project.md) and [`agent.md`](./agent.md).

Hackathon materials:

- [`SUBMISSION.md`](./SUBMISSION.md) — DoraHacks copy, judging alignment, and readiness gate.
- [`DEMO.md`](./DEMO.md) — timed two-to-three-minute recording runbook.
- [`FEEDBACK.md`](./FEEDBACK.md) — DreamDEX SDK and documentation feedback from the implementation.
- [`HACKATHON_REVIEW.md`](./HACKATHON_REVIEW.md) — official event snapshot, current competitors, positioning, and evidence cross-check.
- [`EVIDENCE.md`](./EVIDENCE.md) — public Shannon order, fill, finalized-position, claim, post-claim, and rollover evidence.
- [`FIXING_PLAN.md`](./FIXING_PLAN.md) — ordered path from the current build to a judge-verifiable submission.

Verified Shannon lifecycle: [order approval](https://shannon-explorer.somnia.network/tx/0xeff56d4f403f3937b28e56251977075066748afc1e8cf684d05c34f420376e09) · [filled order](https://shannon-explorer.somnia.network/tx/0xff6d45404a3e257eab9a4e2b87cad2086f0c6bc3a43e3d2de1b1c84107ea1c85) · [claim approval](https://shannon-explorer.somnia.network/tx/0xb164744d590b3007fedaa2a626e02598a07cf8dd2c18fb97f6e5fd89295ba827) · [redemption](https://shannon-explorer.somnia.network/tx/0x73b1d1f8ed2707d8869b92fb1a4b9e9546cc6295c89a856783e85de5b3df4a82) · [first horizon leg](https://shannon-explorer.somnia.network/tx/0xfa5f0fae7e729561f087fb2aea08a7d2fa40eeb5e3d88996cfacd2ae9158b0ec) · [filled rollover leg](https://shannon-explorer.somnia.network/tx/0xe02d355b2990c4e2624c42a3fba5a584b0fe973a5a22179d4d821f593a68c35d)

## Execution safety boundary

- Planning and unsigned review never open the wallet or send a transaction.
- The first live pilot is limited to one IOC protection leg and at most 10.00 collateral units.
- Every quote, market state, pool grid, and expiry is refreshed before the review is encoded.
- DOWN prices are converted to the SDK's complementary YES-price representation deterministically.
- ERC-20 approval calldata is rewritten from the SDK's unlimited default to the exact reviewed maximum cost.
- Order reviews expire after five minutes, claim reviews expire after two minutes, and both are bound to the connected account, Shannon chain ID, and a tamper-evident fingerprint.
- Submission remains disabled until the user checks the exact-review acknowledgement. Each call still requires confirmation inside the wallet.
- Calls are sent sequentially. A reverted or unconfirmed receipt stops the sequence.
- Confirmed execution is persisted as public device-local pointers and reconciled by stable market ID plus exact order transaction against indexed fills, order history, positions, and resting orders.
- Historical positions are rechecked against live outcome-token balances and finalized settlement payout vectors before an unsigned claim review can be built.
- Responses include restrictive wallet-app security headers; public APIs bound JSON bodies and expose stable request IDs rather than raw upstream errors.
- Downrail provides partial, scenario-dependent hedging—not insurance or guaranteed protection.

## Tiny testnet pilot

1. Connect a funded Shannon testnet wallet.
2. Set **Maximum spend** to `10.00` or less.
3. Build the unsigned one-leg review.
4. Inspect the fingerprint, approval target, exact allowance, order target, calldata, and expiry.
5. Check the authorization acknowledgement only if the calls are acceptable.
6. Confirm the deployment exposes the deliberately enabled Shannon-only pilot; the repository default remains false.
7. Submit and confirm each testnet call in the wallet only after a separate explicit live-test approval.
8. Downrail verifies receipts, persists hashes, and reconciles the resulting fill or proven IOC cancellation; the activity can be rechecked after reload.

Do not use a mainnet wallet, seed phrase, or private key with this project.

The live testnet lifecycle is documented in [`EVIDENCE.md`](./EVIDENCE.md), including successful order and claim receipts, exact indexed fills, reload recovery, the finalized winning position, the authoritative post-claim empty state, and the reserve-backed manual rollover into a new market.

## Deployment and submission record

- [Live app](https://downrail.vercel.app) on Vercel; [MIT-licensed source](https://github.com/Nifemi0/downrail).
- [Original public 2:48 demo](https://youtu.be/yLCXjO3UtFs) remains the submitted video.
- [BUIDL 48288](https://dorahacks.io/buidl/48288) was submitted September 6, 2026; the initial confirmation said **under review**.
- A later September 6 Chrome check confirmed the public BUIDL, its Open Track listing, Manage Submission access and the account's registered state. The inspected submission panel did not display an explicit approval decision; organizer approval is **not independently confirmed**.
- The engineering baseline remains September 3: 60 tests, typecheck and lint passing. This documentation update did not rerun tests or transactions.

The repository pins Vercel's Next.js framework preset in `vercel.json`. See [the submission record](./SUBMISSION.md) and [checklist](./SUBMISSION_CHECKLIST.md) for details.
