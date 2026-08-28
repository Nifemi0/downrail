# Downrail — DoraHacks submission draft

> Status: draft. Do not submit until every item in the readiness gate is verified.

## Project name

Downrail

## Tagline

Keep the upside. Guard the downside.

## One-line description

Downrail turns live DreamDEX BTC and ETH Event Contracts into transparent, budget-capped downside-protection plans.

## Short description

Crypto holders often want short-term protection without selling the asset they still believe in. DreamDEX Event Contracts provide simple, fixed-payout UP and DOWN positions, but using a sequence of short windows as a hedge still requires market selection, sizing, order-book checks, execution, settlement monitoring, and rollover.

Downrail packages that workflow into one understandable product. A user chooses BTC or ETH, enters the value of the exposure, selects a protection horizon, and sets a strict spending limit. Downrail reads live Shannon testnet markets, verifies their on-chain state, prices executable DOWN liquidity, and generates a deterministic hedge plan. Before signing, the user sees every leg, maximum cost, possible payout, expiry, residual risk, and exact transaction call.

Downrail is a hedging interface—not insurance, a prediction-market creator, or an AI trading oracle.

## The problem

An isolated binary contract is simple; building continuous protection from many short-lived contracts is not. Users must answer several difficult questions:

- Which live market actually covers the requested time window?
- Is there enough executable DOWN liquidity at the displayed price?
- How many contracts fit within the budget after tick and lot quantization?
- What portion of a portfolio loss could the fixed payout offset?
- Did the submitted order mine, fill, rest, expire, or cancel?
- When should the position be claimed or rolled into the next window?

Downrail makes those decisions inspectable and keeps the spending boundary explicit.

## How it works

1. Read live BTC and ETH Event Contract markets from DreamDEX on Somnia Shannon.
2. Recheck each candidate's on-chain Trading status, pool parameters, and expiry headroom.
3. Convert live book depth into executable DOWN prices.
4. Allocate the user's budget across aligned windows using integer-only calculations.
5. Show current cost, conditional payout under each explicit outcome, residual risk, and every proposed leg.
6. Build a short-lived, fingerprint-bound transaction review for the connected wallet.
7. Replace unlimited token approval with the exact reviewed collateral allowance.
8. Submit calls sequentially only after explicit acknowledgement, verify mined receipts, and reconcile fills and positions by stable market ID.
9. Detect finalized positions, surface claims, and recommend the next rollover window. *(Implementation is present; live lifecycle evidence remains to be captured.)*

## Why it is different

Most Event Contract products help users speculate on an outcome or discover a trading signal. Downrail starts from an existing portfolio exposure and asks a different question: “How much temporary downside protection can this budget buy?”

The innovation is the product layer around the contracts: horizon-aware window selection, depth-aware sizing, explicit conditional-outcome modeling, bounded execution, lifecycle tracking, settlement discovery, and manual rollover as one coherent hedge.

## Technical implementation

- Next.js, React, and TypeScript.
- `@somnia-chain/markets-sdk` for DreamDEX market, order-book, portfolio, fill, and unsigned-order integration.
- Somnia Shannon testnet, chain ID `50312`.
- Deterministic `bigint` calculations for prices, quantities, costs, payouts, ticks, and lots.
- Live indexer discovery followed by on-chain status and pool-parameter verification.
- Native EIP-6963 wallet discovery and EIP-1193 transaction requests.
- One-leg pilot sender capped at `2.00` collateral units.
- Exact ERC-20 allowance rewriting instead of unlimited approval.
- Sequential transaction submission, receipt-status validation, timeout handling, and stop-on-revert behavior.
- Fill, position, and resting-order reconciliation keyed by market ID rather than reusable pool address.
- Public Vercel production deployment at `https://downrail.vercel.app`; the earlier Sites preview remains owner-only.

## Safety and honesty

- Downrail never asks for or stores a private key or seed phrase.
- Planning and unsigned review do not open the wallet.
- Every proposed order is visible before signing.
- The first live pilot is restricted to one IOC leg and at most 2.00 collateral units.
- Every wallet call still needs confirmation from the user.
- Quotes and reviews expire quickly and are rebound to the connected account and chain.
- The interface describes partial, scenario-dependent protection rather than guaranteed insurance.
- Simulated values and unfinished lifecycle behavior must not be presented as live on-chain proof.

## Ecosystem impact

Downrail creates a new source of recurring DreamDEX demand: holders and treasuries buying bounded downside protection instead of entering isolated speculative trades. Short windows become useful building blocks for a continuing product, which can increase repeat volume while keeping the underlying Event Contracts and settlement mechanics visible.

The same planning layer could later serve wallets, treasury dashboards, and developer APIs without changing DreamDEX's core contracts.

## Verified today

- Live Shannon venue, asset, market, on-chain status, book-parameter, and order-book reads.
- BTC and ETH market discovery across multiple available windows.
- Depth-aware, budget-safe hedge plans with tick, lot, expiry, and minimum-size guards.
- Responsive planner, scenario view, wallet/network control, and exact unsigned call review.
- A bounded tiny-pilot sender with receipt checks and post-transaction reconciliation.
- 28 passing unit tests plus clean lint, typecheck, Next.js build, and Worker build.

## Still required before submission

- Execute one deliberately small order from a funded Shannon test wallet with explicit user approval.
- Capture the transaction hash, successful receipt, and indexed fill or legitimate unfilled IOC result.
- Implement and verify finalized-market discovery, claimability, one claim path, and rollover recommendation.
- Publish the source in a public GitHub repository.
- Keep the verified Vercel deployment judge-accessible through submission.
- Record and link a two-to-three-minute demo video.
- Replace every placeholder below with final public links.

## Links

- Live application: https://downrail.vercel.app
- GitHub repository: https://github.com/Nifemi0/downrail
- Demo video: `TBD — 2–3 minute video`
- Transaction evidence: `TBD — Shannon explorer link`
- SDK and documentation feedback: [`FEEDBACK.md`](./FEEDBACK.md)

## Judging alignment

| Criterion | Weight | Downrail evidence |
| --- | ---: | --- |
| Innovation and Originality | 20% | Reframes short-duration Event Contracts as rolling portfolio protection rather than another signal or prediction interface. |
| Technical Implementation | 25% | Live SDK and on-chain reads, depth-aware bigint planner, bounded unsigned calls, wallet execution gates, receipt verification, and market-ID reconciliation. |
| User Experience and Design | 20% | Plain-language exposure, budget, protection, payout, and residual-risk flow with every order visible before signing. |
| Business and Ecosystem Impact | 20% | A recurring hedge use case that can bring holder and treasury demand to DreamDEX windows. |
| Presentation and Demo | 15% | A focused before/after portfolio-loss story designed for a two-to-three-minute live walkthrough. |

## Submission readiness gate

- [x] Meaningful DreamDEX Event Contract integration.
- [x] Deterministic hedge planner using live testnet data.
- [x] Polished product interface.
- [x] SDK and documentation feedback draft.
- [ ] Real testnet order and receipt evidence.
- [ ] Position lifecycle, finalized-market discovery, and claim proof.
- [ ] Rollover recommendation demonstrated.
- [ ] Public GitHub repository.
- [x] Judge-accessible deployment.
- [ ] Two-to-three-minute demo video.
- [ ] DoraHacks form reviewed and submitted.
