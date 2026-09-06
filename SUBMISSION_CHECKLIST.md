# Downrail hackathon submission checklist

Status checked: September 6, 2026

Event: Somnia × DreamDEX Event Contracts Hackathon
Official pages: [BUIDL page](https://dorahacks.io/hackathon/event-contracts/buidl) · [event details](https://dorahacks.io/hackathon/event-contracts/detail)

## Official minimum requirements

- [x] Working prototype deployed on testnet. Production health is `ready` on Somnia Shannon, chain `50312`; live planner and bounded execution paths are available at [downrail.vercel.app](https://downrail.vercel.app).
- [x] Public source repository. [github.com/Nifemi0/downrail](https://github.com/Nifemi0/downrail) is reachable, uses `main`, and includes an MIT license and setup instructions.
- [x] Two-to-three-minute demo video. The final 2:48, 1280×720 MP4 is public on YouTube: https://youtu.be/yLCXjO3UtFs

## Product proof and judge readiness

- [x] Meaningful DreamDEX Event Contract integration using live markets, order books, on-chain checks, orders, settlement, and rollover primitives.
- [x] Deterministic, depth-aware planning with exposure, horizon, budget, tick, lot, expiry, minimum-size, and liquidity constraints.
- [x] Exact decoded approval and order review before wallet signing.
- [x] Shannon tiny-pilot boundary: one IOC leg and no more than 10.00 collateral units.
- [x] Real order approval and fill receipts, exact fill reconciliation, reload recovery, finalized position, claim, post-claim empty state, and filled rollover evidence in [`EVIDENCE.md`](./EVIDENCE.md).
- [x] Public links tested on September 4: app, health endpoint, GitHub, DoraHacks pages, and all recorded Shannon explorer receipts returned HTTP 200.
- [x] Historical engineering baseline: 60 tests, typecheck, lint, and production build passed. These were not rerun for this documentation-only update.
- [x] SDK and documentation feedback included in [`FEEDBACK.md`](./FEEDBACK.md).
- [ ] Capture or select 3–5 final screenshots for the form or project page. This is a presentation-strengthening item, not one of the three minimum materials listed above.

## Final form checklist

- [x] Upload the final MP4 to a public, judge-accessible video URL: https://youtu.be/yLCXjO3UtFs
- [x] Add the public video URL to [`SUBMISSION.md`](./SUBMISSION.md), [`DEMO.md`](./DEMO.md), and the DoraHacks form.
- [x] Paste the final title, tagline, problem, solution, technology, and testing instructions into the DoraHacks form.
- [x] Verify the repository URL, live demo URL, video URL, team details, and any required track/category fields in the form.
- [x] Confirm the account is registered for the hackathon and that the form is open for editing/submission.
- [x] Submit the form before the displayed deadline: September 8, 2026 at 19:00. Confirm the timezone shown in the DoraHacks account.
- [x] Save the final DoraHacks project URL and submission confirmation after sending.

## Current verdict

**Submitted and under review.** Downrail was submitted September 6 to Open Track: https://dorahacks.io/buidl/48288. Separate hacker registration also completed successfully. The original public 2:48 YouTube demo is linked. Organizer acceptance and judging outcome are not yet confirmed.

The September 6 check confirmed app inventory, public repository, video playback/duration and DoraHacks success states. Historical test/receipt evidence retains its original dates. Optional screenshots or caption improvements are not completed merely because the entry was submitted.
