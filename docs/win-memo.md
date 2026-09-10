# Downrail win memo

**Product:** Downrail — a plain-English decision and execution layer for conditional downside offsets on DreamDEX.

> **Keep the upside. Check the downside before signing.**

## Why it can win

- **Innovation:** applies fixed-payout Event Contracts to a recognizable holder problem without pretending they are exact insurance.
- **Technical proof:** the complete Shannon order-to-claim lifecycle has explorer receipts, while the current local build adds live binding revalidation and permission cleanup.
- **UX:** a user answers asset, value held and horizon; advanced assumptions stay optional. The interface translates `BUY NO` into the actual below-opening-price trigger.
- **Impact:** safe refusal is part of adoption. Downrail can introduce users to DreamDEX without encouraging obviously poor-value orders.

## Scope lock

The two co-primary features are:

1. **Plain-English route decision** — live market and depth comparison, exact conditional cash flows, mismatch warning and deterministic `Worth reviewing` / `Skip this route` gate.
2. **Verified lifecycle** — bounded unsigned wallet review, live execution revalidation, receipt reconciliation, settlement discovery, claim and permission cleanup.

Not in scope: custody, automatic trading, a new liquidity pool, price prediction, guaranteed insurance or invented wallet exposure.

## Principal risk

DreamDEX windows settle against their own opening price, not the user's acquisition price. Downrail must keep that basis mismatch prominent and must never describe the product as full protection.
