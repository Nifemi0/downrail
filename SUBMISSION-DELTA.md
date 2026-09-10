# Submission delta

## September 10 local candidate

- Reduced the default planner to asset, value held and horizon; moved spending and scenario assumptions under Advanced.
- Translated `BUY NO` into the exact below-opening-price trigger.
- Added a deterministic refusal gate: weak, below-target, oversized or unavailable routes cannot create an unsigned wallet review.
- Reframed outputs as cost, total return, possible profit and remaining modeled loss.
- Added automatic expiry invalidation and testnet wallet funding readiness.
- Preserved the DreamDEX SDK/on-chain lifecycle, tiny-pilot cap and non-custodial wallet boundary.
- Verification: 101 tests across 21 files, typecheck, lint and production build pass.

This delta is local only. It is not on GitHub, Vercel, YouTube or DoraHacks yet.
