# Downrail contributor guide

## Purpose

This guide keeps contributors and coding agents aligned with Downrail's product direction, verified state, safety boundaries, and hackathon priorities. Read `project.md` before changing architecture, financial calculations, wallet behavior, or submission claims.

## Current status

- Status date: September 1, 2026.
- Core product, order lifecycle, settlement discovery, reviewed claims, and manual rollover recommendations are implemented.
- Vercel production and the public MIT repository are ready.
- All 57 tests pass; typecheck, lint, recent builds, live health, and read-only DreamDEX diagnostics pass.
- `NEXT_PUBLIC_EXECUTION_ENABLED=true` is set for Vercel production; the Shannon-only sender remains capped at one IOC leg and 2.00 collateral units.
- Real order, fill, reload recovery, and finalized claimability are verified in `EVIDENCE.md`; the claim receipt, post-claim state, rollover proof, and required demo video remain incomplete.

## Active goal

Produce a judge-verifiable lifecycle, add concise evidence to the product and submission, record the two-to-three-minute video, and submit to DoraHacks. Do not broaden the product until those gates pass.

## Immediate priorities

1. Confirm the dedicated wallet has Shannon gas and DreamDEX test collateral.
2. Reverify the enabled production pilot and build a fresh one-leg, ≤2.00-unit review.
3. Submit the prepared claim only after explicit wallet confirmation, then capture its receipt and post-claim state.
4. Capture the resulting rollover recommendation.
5. Add judge-facing explorer and implementation evidence.
6. Record the demo and finish the DoraHacks form.

## Source-of-truth order

1. Current on-chain state and verified transaction receipts.
2. Official DreamDEX Event Contracts documentation and Bot Kit.
3. Official DoraHacks event page for requirements and deadlines.
4. `project.md` for product scope and invariants.
5. `HACKATHON_REVIEW.md` for the current event and competitive snapshot.
6. `FIXING_PLAN.md` for execution order.

## Safety invariants

- Never accept, store, print, upload, or commit a private key or seed phrase.
- Keep all financial values as integer or `bigint` protocol units until display formatting.
- Recheck chain, account, on-chain Trading state, balance, gas, expiry, and decoded calldata before every send.
- Keep the tiny pilot to one IOC leg and no more than 2.00 collateral units.
- Never send an unlimited token approval.
- Stop a dependent transaction sequence after a rejection, timeout, revert, account change, or chain change.
- Do not call a write path verified until its receipt and authoritative post-transaction state agree.
- Do not describe conditional Event Contract payouts as insurance or guaranteed coverage.
- Do not introduce automatic or custodial rollover into the hackathon MVP.

## Engineering rules

- Keep DreamDEX SDK interactions behind adapters.
- Separate pure planning math from reads, wallet requests, and persistence.
- Add or update focused tests before changing pricing, sizing, payout, tick, lot, expiry, approval, fingerprint, or reconciliation behavior.
- Key lifecycle state by market ID and exact transaction hash, not pool address alone.
- Treat indexer data as discovery and on-chain state as authority before writes and claims.
- Preserve restrictive API bounds, stable request IDs, and sanitized upstream errors.
- Never add mocked production fallbacks or present fixtures as live data.

## Verification baseline

Before a release or submission update, run:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run doctor
```

Also verify:

- `https://downrail.vercel.app/api/health` reports ready on chain `50312`;
- the public repository and every submission link load without owner access;
- no secret or funded private key exists in the repository;
- documentation distinguishes implemented behavior from live evidence;
- the final demo uses real receipts or clearly labeled recorded real evidence.

## Documentation discipline

- Update `HACKATHON_REVIEW.md` first when official event details or competitors change.
- Update `SUBMISSION.md` only with claims backed by current code or evidence.
- Replace video and explorer placeholders only with public, tested links.
- Keep the test count, SDK version, deployment, repository, signing status, and evidence checklist consistent across all public documents.
