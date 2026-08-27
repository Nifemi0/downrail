# Downrail demo runbook

Target length: 2 minutes 30 seconds. Record only after the public app, public repository, and testnet transaction evidence are ready.

## Recording rules

- Use a dedicated Shannon test wallet with only testnet assets.
- Preflight the exact live market shortly before recording; Event Contract windows expire quickly.
- Never reveal a seed phrase, private key, wallet recovery screen, or unrelated browser tab.
- Never label a simulation, unsigned call, or unfilled order as a completed hedge.
- Keep a backup transaction and finalized-market explorer link available in case live indexing is delayed.

## Shot plan

### 0:00–0:18 — Hook

**Screen:** Downrail hero and scenario panel.

**Voiceover:**

> Holding ETH through a volatile hour usually leaves you with two choices: sell the asset, or absorb the downside. Downrail adds a third. It turns DreamDEX's short-duration Event Contracts into transparent, budget-capped protection.

### 0:18–0:38 — Define the hedge

**Screen:** Select ETH, enter `$2,000` exposure, `4 hours`, and `$20` maximum spend.

**Voiceover:**

> I tell Downrail what I hold, how long I want protection, and the most I am willing to spend. This is not an AI price prediction. The hedge engine is deterministic and the budget is a hard limit.

### 0:38–1:02 — Explain the plan

**Screen:** Plan summary, scenario chart, selected DOWN legs, expiries, cost, payout, and warnings.

**Voiceover:**

> Downrail reads live DreamDEX markets, verifies Trading state on-chain, checks executable order-book depth, and sizes each leg on the protocol's tick and lot grid. I can see the maximum cost, possible fixed payout, coverage under each scenario, and the risk the hedge does not cover.

### 1:02–1:25 — Prove execution safety

**Screen:** Connect the dedicated wallet, reduce the live pilot to `2.00` or less, generate the exact review, and expand the calls.

**Voiceover:**

> For this testnet pilot, execution is restricted to one immediate-or-cancel leg and two collateral units. The review is short-lived, tied to this wallet and chain, and fingerprinted. Downrail also replaces unlimited token approval with the exact maximum collateral cost.

### 1:25–1:50 — Execute and reconcile

**Screen:** Check the acknowledgement, submit, confirm wallet calls, then show transaction receipts and the reconciliation state.

**Voiceover:**

> Nothing is signed automatically. I approve each wallet call, Downrail waits for successful receipts, then reconciles fills, positions, and any resting order by stable market ID. An unfilled IOC is reported honestly instead of being presented as protection.

### 1:50–2:10 — Settlement and rollover

**Screen:** Show a verified finalized position, claim state, claim receipt, and next-window recommendation.

**Voiceover:**

> After finalization, Downrail discovers a claimable payout, verifies the claim, and proposes the next protection window. That turns isolated contracts into a continuous workflow while the user stays in control.

> Do not record this segment until claim and rollover are implemented and verified.

### 2:10–2:30 — Close

**Screen:** Architecture/evidence panel or final branded view with public links.

**Voiceover:**

> Downrail creates a new reason to use DreamDEX: not just to predict the next move, but to manage the downside of an asset you already own. Keep the upside. Guard the downside.

## Evidence checklist before recording

- [ ] Public application loads in a fresh signed-out browser.
- [ ] Public GitHub repository contains setup instructions and no secrets.
- [ ] Live market board has usable BTC or ETH depth.
- [ ] Dedicated wallet has enough Shannon gas and collateral.
- [ ] Tiny pilot review is at or below 2.00 collateral units.
- [ ] Approval amount and order fingerprint have been inspected.
- [ ] At least one known-good transaction receipt is bookmarked.
- [ ] Fill or legitimate IOC result is visible.
- [ ] Finalization, claim, and rollover segment is backed by real evidence.
- [ ] Final video is between two and three minutes.
- [ ] Captions and link text are readable at 1080p.

## Contingency cut

If no suitable market is liquid during recording, use a previously captured real transaction and receipt, clearly label it as recorded Shannon evidence, and keep the current live market read on screen. Do not substitute mocked fills.

