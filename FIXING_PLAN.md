# Downrail fixing plan

Plan date: 2026-08-27  
Source: `FUNCTIONAL_AUDIT.md`, `project.md`, and `agent.md`  
Target: a truthful, transaction-safe, end-to-end Shannon testnet MVP suitable for the DoraHacks demo.

## Strategy

Fix the project in dependency order:

1. Make the financial model and product language correct.
2. Make reviewed transactions enforceable at send time.
3. Persist and recover the complete order lifecycle.
4. Add settlement discovery and manual claims.
5. Generate manual rollover recommendations.
6. Harden production, automate verification, and finish submission evidence.

Do not send a wallet transaction until Gates 1 and 2 pass. Do not spend time on automatic rollover, AI recommendations, mainnet, new assets, social features, or design experiments until the complete manual MVP flow passes.

## Definition of done

The MVP is done only when one recorded Shannon flow proves:

`live market -> truthful plan -> decoded review -> bounded approval/order -> confirmed receipt -> fill or proven IOC cancellation -> recovered position after reload -> finalized market discovery -> claim -> verified post-claim balance -> next rollover recommendation`

The public repository, production deployment, tests, documentation, and demo must all describe that same verified behavior without placeholders or contradictory status labels.

## Phase 0 — establish a safe baseline

### Tasks

- Commit the existing reproducibility fixes:
  - `vercel.json` with the Next.js framework preset.
  - `package.json` typecheck using `next typegen` before `tsc`.
  - the matching README note.
- Pin the supported Node runtime in `package.json` and Vercel to the same major version.
- Add a temporary execution feature flag, defaulting to disabled in production, while the sender is rebuilt.
- Correct immediate contradictions:
  - replace “Read only · Phase 1” with an accurate status;
  - remove any claim that the MVP already enforces fingerprint binding;
  - update `agent.md` checklists and current status.
- Preserve the current production alias as the stable baseline; use preview deployments for all fixes.

### Verification

- Clean clone: `npm ci`, typecheck, lint, test, and production build.
- Preview deployment returns 200 for `/` and `/api/hedge-plan`.
- Production execution control is absent or visibly disabled.

### Exit gate

The repository and deployed status tell the truth, and no unsafe transaction can be initiated publicly.

## Phase 1 — repair the financial model

This is the first product-critical phase. The current “coverage” percentage must not survive unchanged.

### 1.1 Model exact market meaning

Create a domain type containing, for every candidate:

- market ID and pool;
- question/resolution description;
- interval start and expiry;
- reference/opening-price semantics available from DreamDEX;
- asset and outcome mapping;
- on-chain status and source timestamps;
- DOWN ask depth, tick, lot, minimum quantity, and fees.

Reject a candidate when its resolution semantics cannot be explained from authoritative data.

Primary files:

- `src/lib/dreamdex/hedge-plan-snapshot.ts`
- `src/features/hedge-planner/build-multi-window-plan.ts`
- a new `src/features/hedge-planner/domain.ts`

### 1.2 Replace misleading coverage

For the first safe version:

- Rename the output to **conditional payout**.
- Display “If this DOWN market resolves YES” on every leg.
- Show gross payout, cost, and net payout for each leg.
- Show an outcome matrix for all selected-leg win/loss combinations.
- Show portfolio loss separately as a user-defined scenario.
- Do not claim the binary payout offsets that loss unless the selected outcome combination is explicit.

The drop slider may remain, but it only defines the modeled portfolio loss. It must not imply that it changes the contracts' trigger condition.

### 1.3 Build a real protection timeline

Replace simultaneous “multi-window” selection with a timeline planner:

- Divide the requested horizon into protocol-supported intervals.
- Select the nearest eligible market for the first interval.
- Represent later intervals as **future rollover recommendations**, not orders submitted now.
- Require five-minute execution headroom for the current leg.
- Mark gaps where no suitable market exists.
- Calculate the current spend separately from future estimated rollover budgets.
- Keep automatic rollover out of the MVP.

Recommended first-release behavior: execute one current IOC leg and preview the remaining rollover schedule. This is simpler, safer, and matches the manual MVP.

### 1.4 Replace allocation logic

- Stop equal-splitting budget across unrelated simultaneous markets.
- For the current executable leg, consume depth up to the user's current-leg cap.
- Reserve future budget explicitly for proposed rollovers.
- Include settlement/protocol fees where exposed by the SDK.
- Keep gas separate from collateral cost.

### Required tests

- One winning and one losing leg.
- Mixed outcomes across several windows.
- Large portfolio loss while a DOWN leg loses.
- Tiny DOWN move that wins the binary contract.
- Timeline with no gaps.
- Timeline with an unavailable interval.
- Insufficient depth and minimum-lot failure.
- Fees, tick, lot, expiry headroom, and deterministic tie-breaking.
- The displayed conditional payout exactly matches the selected outcome assumptions.

### Exit gate

No UI or API field called coverage implies a guaranteed relationship between a percentage drawdown and a binary outcome. A reviewer can explain exactly why every displayed payout occurs.

## Phase 2 — rebuild the transaction safety boundary

### 2.1 Introduce versioned runtime schemas

Add runtime validation for:

- hedge-plan requests and responses;
- order-review requests and responses;
- reviewed calls;
- execution journal records;
- reconciliation responses;
- settlement and claim responses.

Use one schema library consistently and include `schemaVersion` in persisted and API payloads. Reject unknown fields on security-sensitive payloads.

### 2.2 Canonical review commitment

Create a canonical, versioned review payload containing:

- account and chain ID;
- venue, market ID, pool, collateral token, and spender;
- side and IOC order type;
- DOWN price, encoded SDK YES price, quantity, and expiry;
- exact approval amount;
- zero native value;
- expected call targets, selectors, and calldata;
- generated-at and valid-until timestamps;
- total maximum collateral cost.

Serialize it deterministically and calculate the fingerprint from the complete payload. Recompute the fingerprint in the client immediately before every send.

Primary files:

- `src/app/api/order-preflight/route.ts`
- a new `src/features/execution/review-schema.ts`
- `src/features/execution/run-reviewed-calls.ts`

### 2.3 Decode and enforce every call

Before opening the wallet:

- ABI-decode every call.
- Allowlist Shannon chain, DreamDEX venue, collateral token, pool, and function selectors.
- Require exactly one optional bounded approval followed by exactly one order.
- Require approval spender = reviewed pool.
- Require approval amount = reviewed maximum cost, never unlimited.
- Require BUY_NO, IOC, reviewed quantity/price/expiry, and zero builder fee unless intentionally supported.
- Require native `value = 0` for both calls.
- Recompute maximum cost from decoded values and reject disagreement with the plan.
- Reject expired reviews or reviews with less than safe headroom.

### 2.4 Revalidate the wallet and chain per call

Immediately before approval and again before order:

- call `eth_accounts` and require the acknowledged account;
- call `eth_chainId` and require Shannon;
- abort if either changed;
- never rely solely on React state or wallet events.

### 2.5 Add simulation and funding checks

- Read collateral balance and current allowance.
- Read native STT gas balance.
- Simulate each call with the current account.
- Estimate gas and display it separately.
- Skip approval when a sufficient exact/safe allowance already exists.
- Show decoded function names and arguments alongside raw calldata.

### 2.6 Strengthen receipt handling

- Persist the transaction hash immediately after wallet submission.
- Verify receipt chain, hash, status, sender, destination, and confirmations.
- Treat timeout as pending, not failed.
- Rehydrate pending receipts after reload.
- Link every hash to the Shannon explorer.

### Adversarial tests

- Modified fingerprint.
- Arbitrary target or selector.
- Changed pool, spender, side, order type, quantity, price, or expiry.
- Unlimited or excessive approval.
- Nonzero native value.
- Account or chain change between approval and order.
- Malformed wallet hash/receipt.
- Revert, timeout, delayed receipt, and duplicate submission.
- Stale review and market-status change.

### Exit gate

No payload can reach `eth_sendTransaction` unless decoded call semantics independently prove the acknowledged chain, account, target, action, and spend cap.

## Phase 3 — persistent execution lifecycle

Use a versioned local execution journal for the hackathon MVP. Store only public/non-sensitive data; private keys and seed phrases never enter the app.

### State model

Use explicit states:

- `REVIEWED`
- `APPROVAL_SUBMITTED`
- `APPROVAL_CONFIRMED`
- `ORDER_SUBMITTED`
- `ORDER_CONFIRMED`
- `INDEXING_PENDING`
- `FILLED`
- `PARTIALLY_FILLED`
- `CANCELLED_IOC`
- `RESTING`
- `EXPIRED`
- `RESOLVED`
- `FINALIZED`
- `CLAIMABLE`
- `CLAIM_SUBMITTED`
- `CLAIMED`
- `FAILED`

Each record should contain account, chain, market ID, order ID when available, hashes, timestamps, reviewed values, latest authoritative evidence, and schema version.

### Tasks

- Add `src/features/execution/journal.ts` with migration and validation.
- Persist before and after every asynchronous boundary.
- Restore pending executions on page load and account connection.
- Replace the six-second terminal reconciliation with bounded exponential backoff.
- Paginate fills/orders instead of assuming the first 50 rows are complete.
- Distinguish unindexed, unfilled IOC, partial fill, resting, expired, and failed.
- Add a lifecycle timeline and activity/receipt panel.
- Add a manual “Recheck on chain” action.

### Tests

- Reload after approval, order submission, and receipt confirmation.
- Indexer lag longer than the initial polling window.
- Busy account with more than 50 fills/orders.
- Duplicate hashes and idempotent recovery.
- Corrupt/old persisted schema migration.
- Account and chain separation.

### Exit gate

A confirmed transaction can be recovered after refresh and reaches a proven final order state without relying on in-memory React state.

## Phase 4 — execute one tiny Shannon pilot

This phase requires a funded test wallet and deliberate user approval. It is the only phase that sends the first financial transaction.

### Checklist

1. Deploy Gates 1–3 to a protected preview.
2. Connect a funded Shannon-only test wallet.
3. Set the collateral cap to 2.00 units or less.
4. Record the canonical fingerprint and decoded calls.
5. Verify balances, allowance, simulation, account, chain, and expiry.
6. Obtain explicit user acknowledgement.
7. Submit sequentially through the wallet.
8. Capture explorer links and successful receipts.
9. Prove the fill, partial fill, or IOC cancellation.
10. Reload the page and prove lifecycle recovery.

### Exit gate

The repository contains a sanitized evidence record with real hashes and the app recovers the same authoritative result after reload.

## Phase 5 — settlement discovery and manual claims

### 5.1 Finalized-market discovery

- Add `src/features/settlement/`.
- Scan the connected account's historical positions independently of the live-market list.
- Query authoritative on-chain market status and settlement records.
- Identify winning balances, voided outcomes, already claimed balances, and owed fallback balances.
- Key everything by chain + market ID, never recycled pool address.

### 5.2 Claim review

- Use the SDK's settlement primitives (`redeem`, `redeemMany`, or `claimOwed`) according to current on-chain state.
- Build unsigned claim calls server-side or in a trusted SDK adapter.
- Apply the same canonical fingerprint, ABI decoding, allowlist, account/chain recheck, simulation, and receipt journal used for orders.
- Display payout, token, market, amount, gas estimate, and destination before signing.

### 5.3 Post-claim reconciliation

- Verify the claim receipt.
- Re-read claimable balance and wallet balance.
- Mark the journal entry `CLAIMED` only when authoritative state agrees.

### Tests

- Winning YES and NO balances.
- Losing balance.
- Voided market.
- Already claimed market.
- Owed fallback claim.
- Multiple claimable markets.
- Revert, timeout, and reload recovery.

### Exit gate

The app discovers a finalized claimable position, executes a reviewed manual claim, and proves the claim is no longer outstanding.

## Phase 6 — manual rollover recommendation

### Tasks

- Add `src/features/rollover/`.
- Trigger a recommendation when the current protection interval is near expiry, expired, finalized, or claimed.
- Reuse the repaired timeline planner with:
  - remaining protection horizon;
  - remaining user budget;
  - latest live markets and depth;
  - prior fills and unspent allocation;
  - explicit gaps and changed assumptions.
- Show a diff from the prior plan.
- Require a fresh review and acknowledgement; never auto-submit.
- Add dismiss/snooze and manual refresh controls.

### Tests

- Rollover after win, loss, partial fill, IOC cancellation, and no available market.
- Remaining-horizon and remaining-budget arithmetic.
- No duplicate recommendation for the same interval.
- Fresh market IDs and expiries.

### Exit gate

After the pilot lifecycle, the app produces a new bounded, truthful, manually executable recommendation for the next interval.

## Phase 7 — production hardening

### APIs and upstream reliability

- Add content-type and request-size enforcement.
- Add abort timeouts around indexer, RPC, and SDK calls.
- Add bounded concurrency and request deduplication.
- Cache read-only market snapshots briefly; never cache wallet-specific execution state publicly.
- Add rate limiting through Vercel Firewall or a durable rate-limit store.
- Return stable public error codes, not raw upstream messages.
- Include data timestamps/block references and expose stale/degraded states.

### Security headers

Add and verify:

- Content-Security-Policy, including `frame-ancestors`;
- X-Content-Type-Options;
- Referrer-Policy;
- Permissions-Policy;
- appropriate cross-origin policies;
- removal of unnecessary `X-Powered-By` disclosure.

### Observability

- Add structured logs with request IDs and secret-safe fields.
- Record operation, latency, upstream, status class, and failure code.
- Add client error reporting and transaction-state breadcrumbs.
- Create a lightweight health/readiness route for indexer/RPC diagnostics.
- Add alerts for 5xx rate, upstream timeouts, and planner/preflight failures.

### Framework resilience

- Add `error.tsx`, `global-error.tsx`, `loading.tsx`, and `not-found.tsx`.
- Preserve transaction hashes in recovery screens.
- Add `manifest`, `robots`, and `sitemap` after functional gates pass.

### Exit gate

Expected upstream failures produce bounded latency, recoverable UI, structured evidence, and no unsafe signing path.

## Phase 8 — accessibility and UX completion

### Tasks

- Replace the custom ARIA table with a native table or complete grid semantics.
- Replace/narrate the scenario bar with a correctly labeled progress/meter element.
- Fix Lighthouse contrast failures.
- Increase supporting text to readable sizes.
- Keep Shannon network and execution status visible on mobile.
- Add complete wallet-menu keyboard behavior and focus management.
- Provide wallet installation/help and disconnect/reset actions.
- Change “Pilot confirmed” to distinguish receipt-confirmed from fully reconciled.
- Show decoded reviews, explorer links, lifecycle timeline, claim inbox, and rollover queue.
- Test 320, 390, 768, 1024, and 1440 px widths plus keyboard-only navigation.

### Exit gate

Lighthouse accessibility is at least 95, automated axe checks have no serious/critical findings, and the complete wallet/lifecycle flow works by keyboard.

## Phase 9 — CI, repository, and submission

### CI workflow

On every push/PR run:

1. clean `npm ci` on the pinned Node version;
2. typecheck;
3. lint;
4. unit and route-contract tests;
5. production Next.js build;
6. Playwright desktop/mobile smoke tests;
7. accessibility checks;
8. secret and dependency scans.

Keep testnet writes behind a separate manual workflow with protected secrets and explicit confirmation.

### Repository cleanup

- Publish a public GitHub repository.
- Add a license.
- Remove or isolate obsolete Cloudflare/Sites dependencies if Vercel is the sole production target.
- Commit environment examples without credentials.
- Ensure clean-checkout Vercel deployment does not depend on hidden dashboard state.
- Update README architecture, safety guarantees, setup, test, and demo instructions.

### Submission package

- Replace every placeholder in `SUBMISSION.md`.
- Include public app, repository, and demo-video links.
- Include real transaction, position, claim, and rollover evidence.
- Record a 2–3 minute path that demonstrates the complete story.
- Make the demo language match the repaired conditional financial model.
- Include the DreamDEX SDK feedback report.

### Exit gate

A judge can clone, build, inspect, and understand the project; the video and live app prove the same complete flow.

## Critical-path checklist

- [x] Phase 0: safe baseline and execution disabled
- [x] Phase 1: truthful financial model and rolling timeline
- [x] Phase 2: decoded, fingerprint-bound transaction safety
- [x] Phase 3: persistent lifecycle and recovery
- [ ] Phase 4: one real tiny Shannon order
- [ ] Phase 5: finalized discovery and one verified claim
- [ ] Phase 6: next manual rollover recommendation
- [ ] Phase 7: API/security/observability hardening
- [ ] Phase 8: accessible complete UX
- [ ] Phase 9: CI, public repository, video, and DoraHacks submission

## Work-stream rules

- Keep one phase in progress at a time on the critical path.
- A phase is complete only when its exit gate has direct evidence.
- Fix failing correctness/security tests before adding UI polish.
- Never weaken an invariant to make an existing test pass; rewrite tests that encode the old flawed model.
- Use preview deployments for every phase and promote only a verified artifact.
- Never send a transaction, claim, or approval without a fresh decoded review and explicit user action.
