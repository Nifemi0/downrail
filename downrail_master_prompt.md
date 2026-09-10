# Downrail — master build prompt

## Context

Downrail is a consumer decision and execution layer for holders evaluating DreamDEX Event Contracts on Somnia Shannon. It is built for the Somnia × DreamDEX Event Contracts Hackathon, a virtual $5,000 USDso Open Track event whose submission deadline is displayed as extended to September 11, 2026.

> **Keep the upside. Check the downside before signing.**

## The problem

A holder may want temporary downside exposure without selling BTC or ETH, but a binary contract is not exact insurance. Its trigger, opening-price basis, expiry, liquidity, premium and possible payout all need to be understood before signing.

## What we ship

1. **Plain-English route decision:** inspect live DreamDEX depth, translate the exact below-opening-price trigger, show both cash-flow outcomes and refuse weak or mismatched routes.
2. **Verified lifecycle:** prepare bounded unsigned calls, revalidate bindings immediately before wallet submission, reconcile receipts and positions, then support settlement, claim, rollover review and permission cleanup.

## Stack and settlement

- Chain: Somnia Shannon testnet, chain ID 50312.
- Primitive: DreamDEX Event Contracts and `@somnia-chain/markets-sdk`.
- Frontend: Next.js application with landing, app and documentation routes.
- Funds: the user pays TESDC collateral and STT gas from their wallet. Downrail has no custody or treasury.
- Settlement: DreamDEX's prefunded pool pays the winning outcome; losing tokens expire worthless and voided outcomes follow the protocol payout vector.

## Acceptance criteria

- [x] Live Shannon market discovery and depth-aware planning.
- [x] Conservative route decision tested independently.
- [x] Wallet review bound to account, market, chain, limit, quantity, cost and expiry.
- [x] Real order, fill, settlement, claim and rollover receipts documented.
- [x] 101 tests, typecheck, lint and production build passing locally.
- [ ] Local UX and hardening candidate deployed after explicit owner approval.
- [ ] Public demo/submission copy updated after deployment approval.

## Hard rules

- Two co-primary features only.
- Never call this insurance or guaranteed protection.
- Never infer BTC or ETH holdings from a Shannon wallet.
- Never deploy, push or mutate the submission without explicit approval.
- Every public implementation claim must map to a test, screenshot or explorer receipt.
