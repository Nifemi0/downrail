# Downrail functional audit

Audit date: 2026-08-27  
Audited target: `https://downrail.vercel.app` and the local `hedgeflow` worktree  
Scope: product correctness, DreamDEX integration, transaction safety, lifecycle completeness, UI/accessibility, APIs, deployment, security, tests, documentation, and hackathon readiness.

## Executive verdict

Downrail is a polished, functioning **read-only market explorer and deterministic order-plan prototype**. It is not yet a functional end-to-end hedging product and does not meet its own MVP acceptance criteria.

The production page, live planner route, current market reads, unsigned call builder, local build, typecheck, lint, and 28 unit tests work. The critical blockers are:

1. The advertised coverage number is not a valid statement about protection against the chosen percentage loss. The loss percentage changes the denominator, but it does not select contracts whose resolution corresponds to that percentage move.
2. “Multi-window” planning does not construct rolling coverage. It selects contracts that individually remain open through the entire requested horizon and then assumes all selected winning payouts can be added together.
3. The client transaction guard does not cryptographically or semantically bind the reviewed fingerprint, budget, targets, calldata, native value, current account, and current chain at send time.
4. Settlement discovery, claiming, persistent lifecycle tracking, and rollover do not exist in the application source.
5. No real testnet order-to-fill-to-settlement-to-claim flow has been demonstrated.

Do not present the current build as a completed hedge product or allow a public transaction path until P0-3 is fixed.

## What was verified working

- Production returns meaningful content with no Next.js error overlay.
- The live planner returned HTTP 200 and a current ETH plan; malformed input returned HTTP 400.
- Production logs showed no 5xx response in the inspected 24-hour window.
- Desktop and 390 x 844 mobile layouts render without page-wide horizontal overflow.
- Lighthouse: Performance 96, Accessibility 87, Best Practices 100, SEO 100; LCP 2.3 s, TBT 140 ms, CLS 0.005.
- `npm run build`, `npm run typecheck`, `npm run lint`, and all 28 Vitest tests passed.
- `npm audit` reported zero known vulnerabilities across 713 dependency entries.
- No high-confidence private-key/token patterns were found in reachable Git history; only `.env.example` is tracked.
- The SDK confirms that `ORDER_TYPE.MARKET` is Immediate-or-Cancel and that `BUY_NO` consumes `noAsks`.
- The SDK already exposes `redeem`, `redeemMany`, `claimOwed`, and `finalizeMarket`, so the missing lifecycle can be built without inventing protocol primitives.

## P0 — release and product blockers

### P0-1: The coverage calculation is financially misleading

Evidence:

- `build-multi-window-plan.ts` computes the scenario loss as `exposure * downsideMoveBps`.
- It sums every selected leg's full winning protection.
- It divides that all-legs-win amount by the chosen scenario loss and labels the result coverage.
- No contract question, reference price, opening price, strike, oracle condition, or outcome correlation is used in this calculation.

Why this is wrong:

A DreamDEX UP/DOWN event resolves from its own binary condition. Selecting “5% loss” in Downrail does not select a contract that pays specifically when the portfolio falls 5%. The same winning payout is therefore shown against 1%, 5%, or 20% modeled loss merely by changing the denominator. With multiple independent windows, a portfolio drawdown does not imply that every DOWN leg wins.

Required correction:

- Rename the current metric to an explicit conditional value such as “payout if this DOWN contract wins.”
- Show an outcome matrix for every combination of selected binary legs, or use a defensible scenario model that maps the portfolio path to each market's exact resolution rule.
- Never call the number “loss offset” without stating the exact binary outcome assumptions beside it.
- Add tests for mixed outcomes, path dependency, unchanged price, tiny DOWN moves, and a large horizon loss with non-winning intermediate windows.

### P0-2: The planner is not rolling multi-window protection

Evidence:

- A candidate is rejected unless its expiry is at least `requested horizon + five-minute headroom`.
- Eligible contracts are sorted by overshoot and up to `maxMarkets` are selected.
- The budget is split among those contracts simultaneously.

That chooses contracts which each span the whole requested horizon. It does not build a sequence of 15m/1h windows that covers the timeline, monitor expiry, or roll proceeds/budget into the next window.

Required correction:

- Define a coverage timeline and select a non-overlapping or deliberately overlapping sequence whose union covers the requested period.
- Model which legs are bought now versus proposed later.
- Distinguish manual rollover recommendations from automatic execution.
- Calculate cost and outcome per interval rather than summing simultaneous all-win payouts.

### P0-3: The send-time safety boundary accepts arbitrary reviewed calls

Evidence:

`assertTinyPilot` checks the displayed plan total, one-leg shape, expiry, valid address/hex syntax, and nonnegative native value. It does not:

- validate or recompute the fingerprint;
- bind `plan.totalMaximumCostRaw` to decoded approval/order calldata;
- restrict contract targets or function selectors;
- cap native `value`;
- decode and validate allowance, pool, side, order type, price, quantity, or expiry;
- query `eth_chainId` and `eth_accounts` immediately before each send;
- compare a receipt's transaction hash/chain to the request.

A safe local proof passed an arbitrary target, arbitrary `0xdeadbeef` calldata, a non-hash fingerprint, a displayed cost of one raw unit, and an enormous native value through `assertTinyPilot`.

This is not evidence of a remote exploit by itself—the payload currently originates from Downrail's server—but it proves the client guard cannot uphold its advertised spending and target boundary if state is malformed, tampered with, or compromised.

Required correction:

- Treat the fingerprint as a commitment, recompute it from a canonical payload, and require exact equality.
- Decode calls with the authoritative ABIs and allowlist chain, target addresses, selectors, side, IOC order type, pool, quantity, price, expiry, approval spender, approval amount, and zero native value.
- Recompute maximum collateral from decoded order values and compare it to the acknowledged cap.
- Query wallet account and chain immediately before every signature and abort on change.
- Simulate calls and estimate gas before opening the wallet.
- Add adversarial tests for every field and for account/chain changes between approval and order.

### P0-4: The core lifecycle is absent

No `settlement` or `rollover` feature directory, claim API, claim UI, finalized-market scanner, lifecycle state store, or rollover generator exists. The current reconciliation route only queries recent fills, positions, open orders, and one on-chain market.

This contradicts `project.md` and `agent.md`, which require submitted, filled, expired, cancelled, finalized, claimable, claimed, and rolled states.

Required correction:

- Introduce a persistent state model keyed by account + chain + market ID + transaction hash.
- Discover finalized markets independently of the live-market list.
- Calculate claimability from authoritative on-chain state.
- Build an unsigned claim review and a separately acknowledged claim sender.
- Reconcile claimed receipts and balances.
- Generate a new manual rollover recommendation from the remaining exposure and future timeline.

### P0-5: There is no real end-to-end transaction evidence

No verified transaction hash, fill/IOC-cancel result, position, finalization, or claim receipt is recorded. Unit mocks and unsigned calls cannot satisfy this acceptance criterion.

Required proof before “functional MVP”:

1. Funded Shannon test wallet and explicit human approval.
2. Exact bounded approval/order review.
3. Successful receipt(s) with explorer links.
4. Indexed fill or proven IOC cancellation.
5. Resulting position persisted and recovered after reload.
6. Finalized market discovered outside the live list.
7. Claim transaction and post-claim balance evidence.
8. Next rollover recommendation.

## P1 — high-priority reliability and security flaws

### P1-1: Execution and receipt state disappear on refresh

All wallet, review, hashes, receipts, and reconciliation state lives in React memory. Closing or refreshing the page loses the only recovery trail. Persist non-sensitive execution metadata locally or server-side and rebuild state from chain/indexer data.

### P1-2: Reconciliation can produce false “no fill” conclusions

The client polls five times at 1.5-second intervals, roughly six seconds total. The API uses a 15-minute default window and fixed limits of 50 without pagination. Indexer delay or a busy account can hide relevant data. A missing fill is reported as “may have cancelled” without proving cancellation.

Persist the transaction/order identity, use cursor pagination, poll with bounded backoff, expose a pending state, and verify cancellation/remaining quantity authoritatively.

### P1-3: No pre-transaction balance, allowance, gas, or simulation checks

The app does not verify collateral balance, native gas balance, current allowance, expected revert, or estimated gas before requesting signatures. Add an explicit preflight result and disable sending when any prerequisite fails.

### P1-4: The displayed plan can go stale indefinitely

The planner refreshes only when an input changes. The market board refreshes only on page reload. Building the unsigned review fetches a fresh plan, which may differ from the old visible recommendation without a clear diff.

Add snapshot age/staleness thresholds, periodic or focus-based revalidation, a manual refresh control, and a review diff when market, price, quantity, cost, or expiry changed.

### P1-5: Public APIs lack abuse and resource controls

The three public routes have no rate limiting, body-size guard, explicit upstream timeout, concurrency budget, retry policy, or abuse telemetry. Each planning request can open WebSocket-backed SDK resources and perform multiple chain/indexer calls. The input limit of four markets still permits expensive fan-out.

Add rate limits, strict content length, abort timeouts, bounded concurrency, caching/deduplication for read snapshots, and structured request metrics. Do not return raw upstream error text to clients.

### P1-6: API responses are trusted with TypeScript casts only

The client casts JSON to application types and then feeds strings to `BigInt` and dates. A malformed or version-skewed response can crash rendering. Add runtime schemas for every request and response, plus a schema version.

### P1-7: Missing security headers on a wallet-signing application

Production has HSTS but no Content-Security-Policy, `frame-ancestors`/X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, or cross-origin isolation policy. Add restrictive headers in `next.config.ts`/Vercel, beginning with CSP report-only if necessary.

### P1-8: No application observability

Handled route errors are converted to JSON without structured server logs, correlation IDs, upstream timings, or error tracking. Therefore an empty Vercel error-log query does not prove the routes are healthy. Add structured logs with secret-safe fields, request IDs, latency, upstream operation, and result class.

### P1-9: No CI or end-to-end test gate

There is no GitHub Actions workflow and no route, component, wallet-event, browser, accessibility, deployment, or true SDK integration suite. The 28 tests cover pure calculations and mocked provider behavior only.

Add CI gates for clean `npm ci`, typecheck, lint, unit tests, route contract tests, production build, and Playwright smoke tests. Add a testnet-gated integration suite that never runs writes without an explicit secret/flag.

### P1-10: Missing error recovery UI

There is no app `error.tsx`, `global-error.tsx`, `loading.tsx`, or custom `not-found.tsx`. Unexpected serialization, SDK, or component errors fall back to generic framework behavior. Add user-safe recovery states that preserve transaction hashes.

### P1-11: Runtime version drift

README requires Node 22.20.0, while the inspected Vercel deployment uses Node 24.x because `package.json` has no `engines.node`. Pin and test one supported runtime in package metadata and Vercel.

### P1-12: Source-of-truth documents contradict the application

`agent.md` says no sender is exposed and leaves receipt/reconciliation checklist items unchecked, while later sections and the UI say the sender exists. The page says “Read only · Phase 1” although transaction code is present. Correct the status model before judges or collaborators rely on it.

## P2 — correctness, UX, and maintainability flaws

### Planning and market selection

- Only the first eight closing-soon candidates are chain-checked, before final cost/liquidity ranking; a better ninth candidate can never win.
- Ranking uses expiry overshoot, top ask, and market ID, not the documented cost/liquidity/alignment score.
- Budget splitting is equal plus leftover redistribution, not an optimization of conditional protection or timeline coverage.
- Only eight book levels are considered; deeper executable liquidity is ignored.
- Fees, gas, price movement, failed approval, partial fills, and opportunity cost are absent from the scenario model.
- Market/indexer timestamps and block numbers are not returned, so freshness and cross-source consistency cannot be proven.
- Production uses hardcoded public endpoint/venue fallbacks and has no explicit Vercel environment variables. Rotation requires a code deploy unless environment values are added.

### Wallet and transaction UX

- There is no disconnect/reset control.
- Initial wallet state errors are swallowed.
- A successful network-switch request relies on the wallet emitting `chainChanged`; it does not explicitly re-read the chain.
- The wallet chooser lacks focus placement, Escape/outside-click handling, `aria-haspopup`, and `aria-controls`.
- Raw calldata is shown, but decoded human-readable function arguments and verified contract labels are not.
- There is no approval-revocation path or allowance status.
- The main status can say “Pilot confirmed” while indexer reconciliation is unresolved.
- No explorer links are rendered for every completed call/receipt in a durable receipt view.

### Accessibility

Lighthouse accessibility scored 87 and identified:

- prohibited ARIA naming on the generic scenario-bar `div`;
- `role="table"` rows without required `cell`/`columnheader` children;
- insufficient contrast in the hero loss plane and residual-loss metric.

Manual review also found very small text (roughly 9–11 px in several labels), incomplete wallet-menu keyboard behavior, and status information hidden on mobile. Use native table/progress elements where practical, 12–14 px minimum supporting text, and test keyboard/screen-reader flows.

### Responsive and information design

- Mobile hides the network and phase chips, removing critical transaction context.
- The hero's static `+$78.50` example can be mistaken for the live plan unless its illustrative status remains visually prominent throughout scrolling.
- “Chain checked” on the global trust strip overstates the market board, which reads indexed markets and book tops without per-row on-chain status verification.
- The disabled “No wallet” button gives users no installation/help path.
- The main screen does not provide a lifecycle timeline, persistent activity/history, claim inbox, or rollover queue.

### API and data handling

- Client numeric validation accepts JavaScript numeric forms the exact server decimal parser rejects, producing avoidable error churn.
- `request.json()` is accepted without content-type enforcement or a size limit.
- `Promise.all` performs all leg preflights simultaneously; there is no concurrency or partial-failure strategy.
- Fixed 15-minute reconciliation and 50-row limits have no cursor or continuation token.
- Raw upstream error messages are exposed in the market board and API responses.
- The SDK exchange is opened for each request with no shared read cache; this increases cold-start and upstream connection load.

### Deployment and repository hygiene

- The Vercel framework correction and robust typecheck command currently exist only as uncommitted local changes (`vercel.json`, `package.json`, README).
- A local `vercel build --prod` requires pulled project settings, so a clean environment cannot reproduce that exact Vercel build from Git alone.
- Cloudflare/Vinext/Sites dependencies and scripts remain in the Vercel-first app, increasing dependency and build complexity.
- There is no public Git remote, public GitHub repository, or license.
- Submission placeholders still need a public repository, demo video, and real transaction evidence.
- There is no `manifest`, `robots`, or `sitemap`; these are lower priority than the product flow but easy submission-quality wins.

## Required implementation order

### Gate 1 — make the product claim honest

1. Replace “coverage” with explicit conditional payout until a valid outcome/path model exists.
2. Define exact contract resolution semantics in the UI and domain model.
3. Implement mixed-outcome scenario calculations and tests.
4. Redesign the horizon algorithm as a real coverage timeline/manual rollover sequence.

### Gate 2 — make transaction review enforceable

1. Canonicalize and recompute the fingerprint.
2. ABI-decode and allowlist every call.
3. Recompute spend from calldata and require zero native value.
4. Re-read account/chain per call.
5. Simulate, estimate gas, and check balances.
6. Persist the execution journal before the first send.

### Gate 3 — complete one order lifecycle

1. Execute one explicitly approved tiny Shannon order.
2. Persist receipts and order identity.
3. Reconcile fill/open/cancelled state with pagination and backoff.
4. Recover the same state after reload.

### Gate 4 — settlement, claim, and rollover

1. Scan finalized markets separately from live inventory.
2. Discover and display claimable balances.
3. Build and execute an exact claim review.
4. Verify post-claim state.
5. Generate the next bounded manual rollover recommendation.

### Gate 5 — production and submission quality

1. Add schemas, timeouts, rate limits, logging, and security headers.
2. Add error boundaries and accessible semantics.
3. Add CI, route/integration/E2E/accessibility tests.
4. Pin Node consistently and commit deployment config.
5. Publish the repository with a license.
6. Record the 2–3 minute demo using real evidence and complete the DoraHacks submission.

## Definition of functional MVP

Downrail is functional only when all of the following are proven, not merely implemented:

- The displayed financial language matches exact contract outcomes.
- The requested horizon maps to an explicit protection/rollover timeline.
- Every send-time invariant is independently enforced from decoded calls.
- A real order is confirmed and its final state survives reload.
- Finalization and claimability are discovered.
- A real eligible payout can be claimed and verified.
- A next rollover recommendation is generated.
- Clean checkout CI and production browser tests pass.
- The public repository, deployment, demo video, and submission contain no placeholders or contradictory claims.

