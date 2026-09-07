# September 7 bug-fix verification

## Scope

Preserve the existing design, contract limits, wallet-only signing and submitted demo. No wallet transactions were sent during this review.

| Finding | Change | Verification |
| --- | --- | --- |
| A reviewed order could be submitted again, overwriting its journal hash | Reserve each review before opening the wallet, serialize reservation across browser tabs, block used reviews and reject hash replacement | Journal regression tests cover reuse, legacy hashes and distinct fresh reviews |
| Rollover reminders used snapshot time | Use a live clock, refreshed on timer, focus and visibility changes | Fake-clock test crosses the near-expiry threshold without a new snapshot |
| A failed post-claim balance read could label a confirmed claim failed | Preserve confirmed receipt state and offer a read-only balance recheck | Tests cover unavailable verification, successful later recheck and wrong-account rejection |
| Inventory discovery blocked the entire app page | Load inventory separately, bound discovery/quote/cleanup time and expose inventory/planner retries | Server-render test and browser check show planner and portfolio while inventory is unavailable; service tests cover timeout and recovery |

## Checks performed

- `npm test`: 70 tests passed across 15 files.
- `npm run typecheck`: passed.
- `npx eslint src`: passed. This is source lint, not a claim that unrelated local video drafts were linted.
- `npm run build`: passed, including the new `/api/market-board` route.
- Local production `/app`: HTTP 200 in 759 ms; planner, portfolio and inventory loading state were present in the initial response.
- Browser: inventory showed an unavailable message and retry control while the planner rendered a chain-verified ETH plan.
- Pre-release production check: `/api/health` returned 503 degraded at 21:13 UTC; a separate planner request returned a valid ETH plan. Availability is intermittent. Neither a working quote nor a passing build proves sustained dependency health.

## Limits

These changes do not repair DreamDEX or RPC outages, create liquidity, or prove a new on-chain lifecycle. Historical transaction evidence remains in `EVIDENCE.md`. Previously mislabelled claim records are not automatically migrated. Review reuse protection is browser-local, not an on-chain idempotency guarantee; clearing local storage or using another device removes that local history.

Submission and hacker registration were last confirmed September 6. No new organizer approval decision was verified during this check. The original public 2:48 video remains the submitted demo.
