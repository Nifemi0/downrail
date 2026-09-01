# Downrail top-submission plan

Plan date: 2026-09-01

Deadline displayed by DoraHacks: 2026-09-08 19:00; verify the account timezone before final submission.

Objective: convert the strong implemented prototype into a judge-verifiable, clearly differentiated submission.

## Strategy

The project does not need a broader feature set. It needs real on-chain evidence, a sharper portfolio-protection story, a frictionless judge path, and a disciplined presentation.

The critical path is:

```text
enable Shannon pilot
  → reviewed tiny order
  → confirmed receipt
  → fill or proven IOC cancellation
  → reload recovery
  → finalized position
  → reviewed claim
  → verified post-claim state
  → rollover recommendation
  → evidence panel
  → 2–3 minute video
  → DoraHacks submission
```

## Phase 1 — documentation consistency

Status: complete on September 1.

- Centralize the official rules, rubric, resources, competitors, and readiness status in `HACKATHON_REVIEW.md`.
- Update the README, project specification, agent guide, submission draft, demo runbook, SDK feedback, audit, and this plan.
- Use one verified test baseline: 57 passing tests plus clean typecheck and lint.
- Mark the public repository, MIT license, and Vercel deployment complete.
- Distinguish implemented lifecycle code from real transaction evidence.
- State truthfully that the bounded Shannon order, exact fill, reload recovery, and finalized claimability are live-proven.

## Phase 2 — enable and prove the tiny Shannon order

Status: complete on September 1. See `EVIDENCE.md`.

### Release preparation

- Confirm the dedicated wallet is on Shannon chain `50312`.
- Confirm enough STT exists for gas and enough DreamDEX test collateral exists for the order.
- Keep the pilot cap at 2.00 collateral units and one IOC leg.
- Generate and inspect a fresh decoded review immediately before sending.
- Keep `NEXT_PUBLIC_EXECUTION_ENABLED=true` limited to production Shannon and reverify the deployed one-leg, 2.00-unit boundary.
- Recheck the live deployment, planner, review expiry, account binding, exact approval, and order calldata.

### Required evidence

- Approval transaction hash when approval is needed.
- Order transaction hash and successful receipt.
- Market ID, pool address, side, price, quantity, expiry, and maximum cost.
- Indexed fill or an explicitly proven unfilled IOC cancellation.
- Screenshot or capture of the Downrail activity state.
- Successful recovery and reconciliation after reloading the page.

### Stop conditions

- Wrong chain or account.
- Review expired or fingerprint changed.
- Market no longer Trading.
- Insufficient gas or collateral.
- Maximum cost above 2.00.
- Simulation failure, reverted receipt, or unexpected calldata.

## Phase 3 — prove settlement, claim, and rollover

Status: ready for wallet-confirmed claim; the real winning position is finalized and claimable.

- Track the pilot market until finalization.
- Verify the user's outcome-token balance and payout vector on-chain.
- If the position is claimable, generate a fresh decoded claim review.
- Submit the claim only after explicit wallet confirmation.
- Save the claim transaction hash and successful receipt.
- Refresh authoritative balances and prove the claim is no longer outstanding.
- Display and capture the resulting manual rollover recommendation.
- If the position loses or the order is unfilled, create a second tiny pilot only when necessary to capture a legitimate claim path.

## Phase 4 — judge-facing product upgrades

Status: in progress; the first real receipt and finalized position are now available.

### Make the differentiation obvious

- Lead with an existing BTC or ETH holding, not with a market bet.
- Make “Without Downrail” versus “With Downrail” the dominant scenario comparison.
- Keep maximum spend, conditional payout, and residual loss visible together.
- Explain that the payout is conditional on the exact Event Contract outcome and is not insurance.

### Add an evidence surface

- Chain and network.
- SDK version.
- Current market ID.
- Reviewed maximum cost.
- Order and claim explorer links.
- Reconciliation state.
- Public repository, deployment, and test status.

### Reduce judge friction

- Provide a one-click demo preset for the $2,000 ETH / four-hour / $20 scenario.
- Keep a read-only path usable without a wallet.
- Explain how to obtain test gas and collateral in the docs.
- Provide a recorded-evidence fallback if the live market rolls during judging.

## Phase 5 — quantify ecosystem impact

Status: pending.

- Show how a four-hour or twenty-four-hour protection request creates repeated Event Contract demand rather than one isolated trade.
- Include one conservative example of orders per user per protection horizon.
- Describe wallet, treasury-dashboard, and developer-API expansion without claiming unbuilt integrations.
- Avoid invented user counts, revenue, or volume.

## Phase 6 — record the demo

Status: blocked on Phase 3 claim and rollover proof.

- Follow `DEMO.md` and target 2 minutes 30 seconds.
- Record at 1080p with readable wallet and explorer details.
- Use the live app for planning and reviewed execution.
- Use bookmarked real evidence if indexing or market rollover makes the live path unstable.
- Add captions.
- Publish a public, judge-accessible URL and place it in `SUBMISSION.md`, `README.md`, and the DoraHacks form.

## Phase 7 — submission preflight

Status: pending.

- Verify the app in a fresh signed-out browser.
- Verify the GitHub repository is public and contains no secrets.
- Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run doctor`.
- Confirm every explorer, repository, deployment, and video link.
- Remove every `TBD` from submission-facing copy.
- Compare the final DoraHacks form against `HACKATHON_REVIEW.md` and `SUBMISSION.md`.
- Submit before the final hours of the deadline.

## Scope lock

Until the submission is complete, do not spend time on:

- AI recommendations or LLM-generated trades;
- automatic rollover or custodial automation;
- assets beyond BTC and ETH;
- mainnet execution;
- social feeds, copy trading, or leaderboards;
- a visual redesign unrelated to the judge journey.

## Completion gate

- [x] Live DreamDEX reads and deterministic planner.
- [x] Wallet review, guarded sender, receipts, and reconciliation implemented.
- [x] Settlement, reviewed claims, and rollover implemented.
- [x] Public app, repository, license, and SDK feedback.
- [x] 57 tests, typecheck, and lint passing.
- [x] Documentation synchronized with the current build.
- [x] Production Shannon pilot enabled with the one-leg, 2.00-unit boundary.
- [x] Real order, exact fill, reload recovery, and finalized claimability captured.
- [ ] Real claim and post-claim evidence captured.
- [ ] Rollover demonstrated from real lifecycle state.
- [ ] Judge-facing evidence surface complete.
- [ ] Two-to-three-minute video published.
- [ ] DoraHacks submission completed.
