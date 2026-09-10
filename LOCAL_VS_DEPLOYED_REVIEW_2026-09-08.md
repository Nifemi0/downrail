# Downrail: local versus deployed review

Reviewed September 8, 2026. Read-only product assessment; this report does not authorize deployment, GitHub changes, transactions, or submission edits.

## Local follow-up — September 9

The main findings below have now been addressed in the local candidate: the 3× recommendation gate was removed, labels were changed to factual scenario outcomes, executable candidates are compared before selection, rollover reserve defaults to zero and is explicitly controlled, gross and net returns are separated, the entry-price mismatch is prominent, both landing-demo outcomes are interactive, and stale input snapshots are hidden. The local candidate remains undeployed and still needs user visual review plus a fresh wallet lifecycle before release. The original findings remain below as the rationale and should not be read as the current implementation state.

## Verdict

The local rebuild has a stronger visual identity, but its new recommendation engine is not sufficiently justified to replace the deployed submission. The deployed app currently has the stronger established transaction-evidence story. Neither version solves the key explanation and hedge-alignment problems adequately.

Downrail is a credible engineering entry, not currently a clear winning product. First prize is a long shot; a prize remains plausible. These are qualitative judgments, not estimated probabilities or a verified rank among every competitor.

## Verification performed

- Local homepage, app, and docs returned HTTP 200.
- Local planning API returned chain-verified candidates and a computed plan.
- Local health check returned HTTP 503 during one check. This is a dependency-readiness warning, not proof the entire app was unavailable.
- Deployed homepage and health check returned HTTP 200; health reported ready on Shannon, chain 50312.
- Deployed planning API returned a computed live route at 22:10:51 UTC.
- Superseded baseline: 77 passing tests in 16 files at the time of this review. The current September 10 local candidate passes 101 tests in 21 files plus typecheck, lint and production build.
- Source lint: `npx eslint src` passed. This is not a claim that unrelated generated video assets pass repository-wide lint.
- Project type check: `npm run typecheck` passed. A preliminary bare TypeScript invocation failed because Next's validator encountered Vinext-generated route declarations; the project's prescribed type-generation step resolved it.
- Local desktop app screenshot inspected. The app displays a large introductory card and live inventory before the planning workflow, with portfolio alongside inventory.
- Official DoraHacks gallery inspected in Chrome; current account showed Downrail under Your BUIDL and registration/submission management controls.
- Competitor gallery descriptions and Watchman's public README reviewed. Competitor functionality is not independently verified by reading promotional descriptions.

Not performed: new signed transactions, a new full settlement cycle, mobile viewport verification, a new video viewing, exhaustive testing of all 62 competitors, or organizer approval verification. Existing transaction evidence was reviewed as repository documentation, not re-executed this turn.

## Local versus production

| Area | Deployed | Local rebuild |
| --- | --- | --- |
| Presentation | Older editorial identity; simpler existing pitch | More distinctive mint, lime, and forest palette; app still information-heavy |
| Execution history | Documented order, claim, recovery, rollover evidence | New planner and gate changes not given equivalent end-to-end transaction verification this turn |
| Recommendation logic | Presents conditional economics | Adds authoritative-sounding quality labels based on inadequate heuristics |
| Budget allocation | Equal division between current and future windows | Same issue retained |
| Explanation | Both payout outcomes appear in the original story | More explanations, but winning-only interactive scenario and net/gross confusion remain |
| Readiness | Responding successfully in checked production endpoints | Tests and project typecheck pass; dependency-health failure observed |

## Findings, in priority order

### High: the 3× gate is not a sound economic recommendation

`src/features/hedge-planner/evaluate-protection-quality.ts:3` sets a minimum winning net benefit/premium of 3×. At line 81 this helps decide whether a route is recommended. The evaluator does not receive an estimate of winning probability, a numeric settlement reference, or evidence of alignment with the user's feared loss.

Ignoring costs beyond premium, a binary share bought at price p has winning net benefit/premium of (1-p)/p. A 3× threshold therefore favors prices at or below 0.25; that does not establish a more useful hedge. It can favor less likely winning outcomes.

Correction to earlier advice: a $50 premium with $46.90 net benefit means $96.90 gross redemption if the purchased outcome wins, under those example assumptions. A ratio below 1× does not alone make that hedge worthless. Whether it is useful depends on its trigger, timing, likelihood, costs, and the user's objective.

Recommendation: present these as transparent scenario filters, not a validated protection standard or investment recommendation. Do not claim economically optimal selection without supporting analysis.

### High: the actual trigger is not aligned to the user's entry price

The planner's candidate model includes a question and expiry but not a numeric opening/reference price. A contract based on the market window's opening price is not automatically protection below the user's purchase price. The portfolio can lose money while the purchased DOWN outcome loses too.

Show the exact purchased outcome, official settlement rule, available reference price, and settlement time. Clearly distinguish them from user-modeled portfolio loss. Avoid suggesting any temporary dip during the window triggers payment.

### High: route search and resizing are overstated

`build-multi-window-plan.ts:357` takes `eligible[0]` before sizing and quality evaluation. It does not quality-grade every candidate, retry another candidate after an unusable fill, or automatically resize to satisfy the target.

The claim in `src/app/docs/page.tsx:119` that it grades each route is therefore too broad. Recommendation: either implement comparative candidate evaluation and explain its objective, or narrow the claim immediately.

### High: a short rollover tail receives half the budget

`build-multi-window-plan.ts:374` divides the budget by window count, not duration or a user-chosen reserve policy.

Observed locally: a one-hour ETH request with budget 10 reserved 5 for a final 172-second rollover, leaving approximately 5 for the current route. Observed in production later: budget 10 again split approximately 5/5, with a 651-second tail. These were separate timestamps with changing quotes, not a controlled price comparison.

This materially changes current coverage. Define a transparent reserve policy and avoid silently treating a tiny tail as a full equal-budget window. Future liquidity remains unconfirmed and fresh review remains necessary.

### Medium: the interface still hides the number the user actually asks for

`src/components/hedge-preview.tsx:796` foregrounds premium and net benefit but not gross money received as an equally prominent figure. The UI also combines a DOWN label with the raw question about ETH closing at or above its opening price.

Use an explicit sequence: amount paid now; total received if the selected outcome wins; net result after premium; amount lost if it loses. Explain that existing ETH stays separate and redemption is in the venue's collateral token, not replacement ETH. Label test collateral accurately rather than implying real USDT cash.

### Medium: the landing simulator cannot demonstrate rejection

`src/components/protection-lens.tsx` fixes premium at 20 and gross payout at 80. Across its 2–20% loss range, coverage is 300–30% and efficiency is always 3×. The Do not buy branch is unreachable; the scenario assumes the selected DOWN condition wins.

It illustrates a favorable fixture, not current market feasibility or a robust recommendation engine. Include a losing/mismatched outcome and explicitly label assumptions. The illustrative premium also exceeds the current 10-unit signing cap, so it is not a directly executable walkthrough.

### Medium: remaining quote-state and documentation issues

- The planner retains the prior snapshot while inputs debounce. Demo construction can use that snapshot with the new intent key. This is a source-derived state-consistency concern, not a reproduced unauthorized transaction. Bind snapshots to the input request that produced them.
- `build-multi-window-plan.ts:404` attributes any unused allocation to depth, even rounding dust. Production returned this warning with only 0.000002 collateral units left.
- Docs describe a fingerprint binding the quality-tested intent, but the reviewed fingerprint schema does not include every target/quality field. Existing transaction fields remain bound; this is not evidence those transaction bounds can be bypassed.
- The repository's hackathon review still says September 8 and 22 entries, despite the current gallery showing an extension and 62 entries.

## Product and layout priorities

Keep the local visual identity; do not restart the design again. Put the user's task before market inventory. Show a compact exposure/budget/time form, its exact contract condition, and the four cash-flow numbers. Move raw market IDs and execution detail into progressive disclosure. Keep portfolio visible without letting it displace the central decision.

The most defensible story is a transparent, wallet-signed DOWN-contract planning and lifecycle tool. It can model a conditional offset; it does not guarantee recovery of a portfolio's dollar loss. More visual polish does not change that economic constraint.

## Competition and event status

The official gallery showed 62 BUIDLs and 392 hackers, with a displayed extension to September 11 at 19:00. The timezone was not independently established; verify it before treating that time as a local deadline.

Sources: [official event](https://dorahacks.io/hackathon/event-contracts/detail), [public entries](https://dorahacks.io/hackathon/event-contracts/buidl), [Downrail entry](https://dorahacks.io/buidl/48288).

The saved official rubric allocates 25% technical implementation, 20% innovation, 20% UX, 20% business/ecosystem impact, and 15% presentation. The detail-page refresh failed during this review, so those weights were taken from the existing sourced event review, not freshly reverified page content.

Relevant competitive pressure includes Abadi and Ballast's liquidity-focused narratives, Edge Lab's quantitative decision narrative, and Watchman's directly overlapping hedge-receipt workflow. Gallery claims are not audited performance evidence.

[Watchman's README](https://github.com/levithefirst/Watchman#readme) clearly distinguishes binary payout from loss-proportional insurance and emphasizes the difference between hedged and unhedged results. That is an explanation benchmark Downrail should meet. Similarity alone does not establish copying.

Downrail's strongest evidence is engineering discipline and an already documented transaction lifecycle. Its weakest areas are economic justification, first-use clarity, and proof that users want this workflow. I cannot justify a precise rank or percentage chance from the available evidence. First place is a long shot; a credible prize bid requires improving those weaknesses, not merely shipping the local color palette.

## Recommended release decision

Do not replace production with the local rebuild as-is. First correct recommendation claims and cash-flow clarity, resolve candidate selection and reserve allocation, exercise pass/reject/no-liquidity scenarios, and verify mobile plus the existing transaction lifecycle. Only then consider a user-approved deployment and submission update.

No production, GitHub, or submission changes were made in this review.
