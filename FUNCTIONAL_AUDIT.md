# Downrail functional audit

Audit date: 2026-09-01

Audited targets: `https://downrail.vercel.app` and the local `hedgeflow` worktree

Scope: product correctness, DreamDEX integration, transaction safety, lifecycle completeness, deployment, tests, documentation, and hackathon readiness.

## Executive verdict

Downrail is a strong, differentiated testnet product with a working live-data path and a substantially implemented order-to-settlement lifecycle. It is no longer merely a read-only planner. The bounded Shannon production pilot is enabled; the remaining weakness is evidence because no real order, fill or IOC cancellation, finalized claim, post-claim state, or rollover has been captured for judges.

The application is technically competitive today. It becomes submission-ready only after the implemented write paths are exercised with a dedicated Shannon wallet and the resulting receipts are linked in the demo and submission.

## Verified baseline

- Vercel production responds successfully and `/api/health` reports `ready` on chain `50312`.
- The public repository at `https://github.com/Nifemi0/downrail` is accessible and MIT licensed.
- `@somnia-chain/markets-sdk` 0.28.1 is installed.
- The read-only doctor discovers live DreamDEX venues, BTC/ETH assets, on-chain Trading status, pool grids, expiries, and populated order books.
- The September 1 diagnostic found 10 live BTC/ETH markets across 5m, 15m, 1h, 4h, and 24h windows.
- The planner uses integer-only, depth-aware, budget-capped calculations with expiry, tick, lot, minimum-size, and liquidity guards.
- The order path builds one bounded BUY_NO IOC leg, rewrites unlimited approval to exact reviewed cost, fingerprints the review, validates decoded calldata, checks wallet context, and verifies receipts.
- Execution recovery persists public transaction pointers and reconciles fills, positions, resting orders, and legitimate IOC cancellation by stable market ID and transaction hash.
- Settlement discovery scans historical positions independently of the current live-market list and checks ERC-6909 balances plus finalized payout vectors.
- Reviewed claim calls, claim journaling, post-claim refresh, and lifecycle-triggered manual rollover recommendations are implemented.
- All 57 tests pass; typecheck and lint pass.
- The repository includes a submission draft, 2:30 demo runbook, SDK feedback report, and this current rules/readiness review.

## Current blockers

### Release gate passed: bounded public signing enabled

`NEXT_PUBLIC_EXECUTION_ENABLED=true` is set in the Vercel production environment. The deployed sender remains restricted to Shannon chain `50312`, one IOC leg, an exact bounded approval, and no more than 2.00 collateral units.

### Evidence blocker: no real wallet lifecycle

The sender, reconciliation, settlement, claim, and rollover code cannot be represented as live-proven until the project captures:

1. reviewed approval/order calls;
2. successful transaction receipts;
3. a fill or proven unfilled IOC result;
4. position recovery after reload;
5. finalized claimability;
6. a reviewed claim and successful receipt;
7. post-claim authoritative state;
8. the resulting rollover recommendation.

### Submission blocker: no demo video

The official event requires a two-to-three-minute demo video. `DEMO.md` is ready, but no public video URL exists.

## Judging review

| Criterion | Weight | Current strength | Risk before submission |
| --- | ---: | --- | --- |
| Technical Implementation | 25% | Strong implementation breadth, safety boundaries, live reads, and 57 tests. | Judges may discount unexecuted write paths without explorer evidence. |
| Innovation and Originality | 20% | Exposure-first portfolio protection is distinct from AI signals and simple betting interfaces. | Sluice overlaps on safe budget sizing; Runs and Let It Ride overlap on rollover. |
| User Experience and Design | 20% | Focused landing, app, and docs routes with plain-language planning and portfolio views. | The end-to-end wallet path must be tested by a fresh user after signing is enabled. |
| Business and Ecosystem Impact | 20% | Credible recurring-demand story for holders, treasuries, wallets, and future APIs. | The submission needs one quantified recurring-volume example. |
| Presentation and Demo | 15% | Strong hook and timed script. | No published video or real lifecycle footage yet. |

## Competitive positioning

- **Sluice Markets** converts maximum acceptable loss into a safe order. Downrail must lead with existing portfolio exposure, conditional offset, and residual loss—not merely its spending cap.
- **Runs** chains windows and already claims live buy, settlement, redemption, and rollover proof. Downrail must close the evidence gap and emphasize protection rather than compounding a wager.
- **Let It Ride** automates winning-streak rollovers with guardrails. Downrail should keep user-controlled manual continuation as a safety and transparency advantage for the MVP.

The strongest one-sentence position is:

> Downrail is the portfolio-protection layer for DreamDEX: it starts with what you already hold, prices a bounded DOWN hedge from live liquidity, shows the loss that remains, and carries the position through settlement and the next protection window.

## Acceptance status

| Capability | Implementation | Live evidence |
| --- | --- | --- |
| Live market and order-book reads | Complete | Verified |
| Exposure, horizon, and budget configuration | Complete | Verified |
| Deterministic budget-safe plan | Complete | Verified |
| Scenario-specific residual-risk display | Complete | Verified |
| Exact decoded order review | Complete | Verified unsigned |
| Wallet order execution | Complete and enabled for bounded Shannon pilot | Missing real transaction |
| Receipt and fill/IOC reconciliation | Complete | Missing real transaction |
| Reload recovery | Complete | Missing real transaction |
| Finalized-position discovery | Complete | Missing funded position |
| Reviewed claim and post-claim refresh | Complete behind flag | Missing real claim |
| Rollover recommendation | Complete | Missing real lifecycle demonstration |
| Public deployment | Complete | Verified |
| Public repository and license | Complete | Verified |
| Demo video | Planned | Missing |

## Release recommendation

Do not add AI agents, automatic rollover, more assets, social features, or a redesign before submission. The highest-scoring path is to prove the existing lifecycle, expose concise judge-facing evidence, quantify ecosystem impact, and record the demo.

See `FIXING_PLAN.md` for the ordered execution plan and `HACKATHON_REVIEW.md` for the official event cross-check.
