# Downrail — DoraHacks submission draft

> Status: code-ready, evidence incomplete. Do not submit until the real testnet lifecycle and demo-video links are added.

## Project name

Downrail

## Tagline

Keep the upside. Guard the downside.

## One-line description

Downrail turns live DreamDEX BTC and ETH Event Contracts into transparent, budget-capped downside-protection plans for assets users already hold.

## Short description

Crypto holders often want short-term protection without selling the asset they still believe in. DreamDEX Event Contracts provide fixed-payout UP and DOWN positions, but using short windows as a hedge still requires market selection, sizing, order-book checks, execution, settlement monitoring, and rollover.

Downrail packages that workflow into one understandable product. A user chooses BTC or ETH, enters the value of the exposure, selects a protection horizon, and sets a strict spending limit. Downrail reads live Shannon markets, verifies their on-chain state, prices executable DOWN liquidity, and generates a deterministic hedge plan. Before signing, the user sees the current leg, maximum cost, conditional payout, expiry, residual risk, future rollover checkpoints, and exact transaction calls.

Downrail is a hedging interface—not insurance, a prediction-market creator, an AI trading oracle, or a promise of complete protection.

## The problem

An isolated binary contract is simple; building continuing protection from short-lived contracts is not. Users must answer several difficult questions:

- Which live market best matches the requested protection window?
- Is there enough executable DOWN liquidity at the displayed price?
- How many contracts fit within the budget after tick and lot quantization?
- How much of a stated portfolio-loss scenario could the fixed payout offset?
- Did the order mine, fill, cancel as an unfilled IOC, or leave a position?
- When can a winning position be claimed, and when should protection be rolled forward?

Downrail makes those decisions inspectable and keeps the spending boundary explicit.

## How it works

1. Read live BTC and ETH Event Contract markets from DreamDEX on Somnia Shannon.
2. Recheck each candidate's on-chain Trading status, pool parameters, and expiry headroom.
3. Convert live order-book depth into executable DOWN prices.
4. Select and size one current protection leg using integer-only calculations.
5. Show maximum cost, explicit conditional payout, residual portfolio loss, and future rollover checkpoints.
6. Build a short-lived, fingerprint-bound transaction review for the connected wallet.
7. Replace the SDK's unlimited token approval with the exact reviewed collateral allowance.
8. Submit calls sequentially after explicit acknowledgement, verify receipts, and reconcile fills and positions by stable market ID.
9. Scan historical positions independently of the live-market list, identify claimability from finalized on-chain state, build a reviewed claim, and recommend the next protection window.

The code for the complete lifecycle is present. Real order, claim, and rollover evidence is still required before those steps are described as live-proven.

## Why it is different

Most Event Contract products begin with a prediction, signal, or acceptable betting loss. Downrail begins with an existing portfolio exposure and asks a different question: “How much temporary downside protection can this budget buy, and what loss remains after the conditional payout?”

That distinction matters in the current field. Sluice Markets already focuses on maximum-loss order sizing, while Runs and Let It Ride focus on chained or automatic wagers. Downrail's defensible product is portfolio-aware protection: exposure-first planning, scenario-specific residual loss, bounded execution, settlement discovery, and user-controlled continuation as one lifecycle.

## Technical implementation

- Next.js 16.3.3, React 19.2.8, and TypeScript.
- `@somnia-chain/markets-sdk` 0.28.1 for DreamDEX discovery, order books, portfolios, fills, unsigned orders, and settlement primitives.
- Somnia Shannon testnet, chain ID `50312`.
- Deterministic `bigint` calculations for prices, quantities, costs, payouts, ticks, and lots.
- Live indexer discovery followed by on-chain status and pool-parameter verification.
- Native EIP-6963 wallet discovery with EIP-1193 transaction requests.
- One-leg tiny-pilot sender capped at `2.00` collateral units.
- Exact ERC-20 allowance rewriting instead of unlimited approval.
- Sequential receipt validation, timeout handling, stop-on-revert behavior, and device-local recovery pointers.
- Fill, position, and resting-order reconciliation keyed by market ID rather than reusable pool address.
- Historical ERC-6909 position scanning, finalized payout-vector checks, reviewed redemption calls, claim journaling, and lifecycle-triggered rollover recommendations.
- Public Vercel deployment at `https://downrail.vercel.app` and public MIT-licensed source at `https://github.com/Nifemi0/downrail`.

## Safety and honesty

- Downrail never asks for or stores a private key or seed phrase.
- Planning and unsigned review do not open the wallet.
- Every proposed call is decoded and visible before signing.
- The tiny pilot is restricted to one IOC leg and at most 2.00 collateral units.
- Every wallet call requires confirmation from the user.
- Quotes and reviews expire quickly and are bound to the connected account and Shannon chain.
- The interface describes partial, scenario-dependent protection rather than guaranteed insurance.
- Simulated values and unproven lifecycle behavior are never presented as live on-chain proof.
- Public signing is currently disabled in the Vercel environment; enabling the Shannon-only pilot and capturing real receipts is the next release gate.

## Ecosystem impact

Downrail creates a new source of recurring DreamDEX demand: holders and treasuries buying bounded downside protection instead of entering isolated speculative trades. Short Event Contract windows become building blocks for a continuing product while DreamDEX remains the venue for pricing, execution, and settlement.

The same planning layer could later serve wallets, treasury dashboards, and developer APIs without changing DreamDEX's core contracts.

## Verified on September 1, 2026

- Public application and health route are ready on Shannon chain `50312`.
- Public GitHub repository is accessible, uses the `main` branch, and is MIT licensed.
- Live diagnostic discovered BTC and ETH markets with populated depth across currently available 5m, 15m, 1h, 4h, and 24h windows.
- Live venue, asset, market, on-chain status, tick, lot, minimum quantity, expiry, and order-book reads pass.
- Depth-aware, budget-safe planning with tick, lot, expiry, minimum-size, and liquidity guards is implemented.
- Responsive three-page product interface, wallet/network controls, scenario review, portfolio settlement inbox, and exact decoded call review are deployed.
- Bounded order execution, receipt checks, persistent recovery, transaction-keyed reconciliation, finalized-position discovery, reviewed claims, and manual rollover recommendation are implemented.
- All 57 tests pass; typecheck and lint pass.
- SDK and documentation feedback is complete.

## Still required before submission

- Enable the Shannon-only production pilot deliberately after confirming the dedicated wallet is funded.
- Execute one order capped at 2.00 collateral units with explicit wallet approval.
- Capture the transaction hash, successful receipt, and indexed fill or legitimate unfilled IOC result.
- Capture position recovery after reload.
- Use a finalized position to prove claimability, one reviewed claim, post-claim state, and the resulting rollover recommendation.
- Add the final explorer links to this document and the demo.
- Record and publish a two-to-three-minute demo video.
- Review the final DoraHacks form and submit before the displayed September 8, 2026 deadline.

## Links

- Live application: https://downrail.vercel.app
- GitHub repository: https://github.com/Nifemi0/downrail
- Hackathon brief: https://dorahacks.io/hackathon/event-contracts/detail
- Demo video: `TBD — 2–3 minute public video`
- Order evidence: `TBD — Shannon explorer link`
- Claim evidence: `TBD — Shannon explorer link`
- SDK and documentation feedback: [`FEEDBACK.md`](./FEEDBACK.md)
- Current readiness review: [`HACKATHON_REVIEW.md`](./HACKATHON_REVIEW.md)

## Judging alignment

| Criterion | Weight | Downrail evidence | Remaining proof |
| --- | ---: | --- | --- |
| Innovation and Originality | 20% | Reframes Event Contracts as exposure-first, scenario-specific portfolio protection rather than another prediction or risk-sized wager. | Make the unhedged-versus-protected outcome the central demo visual. |
| Technical Implementation | 25% | Live SDK/on-chain reads, deterministic depth-aware planning, exact approvals, decoded calls, guarded sends, receipt checks, recovery, settlement scanning, claims, and rollover logic. | Add real order, claim, and rollover transaction evidence. |
| User Experience and Design | 20% | Plain-language exposure, horizon, spending cap, conditional payout, residual risk, and portfolio lifecycle across focused routes. | Validate the complete wallet flow with a fresh test user. |
| Business and Ecosystem Impact | 20% | Creates recurring holder and treasury demand for DreamDEX windows and a reusable protection-planning layer. | Add one quantified example showing repeat Event Contract usage. |
| Presentation and Demo | 15% | Focused 2:30 before/after portfolio-loss story and evidence plan. | Record, caption, publish, and link the final video. |

## Submission readiness gate

- [x] Meaningful DreamDEX Event Contract integration.
- [x] Deterministic hedge planner using live testnet data.
- [x] Settlement discovery, reviewed claim, and rollover implementation.
- [x] Polished product interface.
- [x] Public MIT-licensed GitHub repository.
- [x] Judge-accessible Vercel deployment.
- [x] SDK and documentation feedback report.
- [x] 57 tests, typecheck, and lint passing.
- [ ] Production Shannon pilot enabled and reverified.
- [ ] Real testnet order, receipt, and fill/IOC evidence.
- [ ] Real finalized-position, claim, post-claim, and rollover evidence.
- [ ] Two-to-three-minute demo video.
- [ ] DoraHacks form reviewed and submitted.
