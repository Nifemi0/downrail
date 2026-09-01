# Event Contracts Hackathon review

Review date: 2026-09-01  
Source of truth: https://dorahacks.io/hackathon/event-contracts/detail

This file centralizes the event brief, Downrail readiness, and competitive strategy. If the organizer changes the DoraHacks page, update this file first and then propagate only material changes to submission-facing documents.

## Official event snapshot

- Event: Somnia × DreamDEX Event Contracts Hackathon.
- Format: virtual.
- Prize pool: $5,000 USDso.
- Registration opened: August 18, 2026.
- Submission period: August 25 through September 8, 2026.
- Deadline displayed during this review: September 8, 2026 at 19:00. Confirm the timezone in the participant's DoraHacks account.
- Field during this review: 13 BUIDLs and 287 hackers.

## Required submission materials

- Working prototype on testnet.
- Public GitHub, GitLab, or Bitbucket repository link.
- Two-to-three-minute demo video.

## Optional materials

- Presentation deck.
- Feedback report about the SDK and documentation.

Downrail already includes the optional SDK and documentation feedback report. A deck is lower priority than real transaction evidence and the required video.

## Judging criteria

| Criterion | Weight | What organizers ask |
| --- | ---: | --- |
| Technical Implementation | 25% | Effective Event Contract and API/SDK use plus strong functional implementation. |
| Innovation and Originality | 20% | Creative use of Event Contracts to solve a real problem. |
| User Experience and Design | 20% | Intuitive, accessible, usable, and compelling experience. |
| Business and Ecosystem Impact | 20% | Potential to attract users, generate trading activity, increase adoption, expand DreamDEX, and sustain a product. |
| Presentation and Demo | 15% | Clear communication of the problem, solution, product, demonstration, and future vision. |

## Official resources

- DreamDEX Event Contracts documentation: https://docs.dreamdex.io/developers/event-contracts
- DreamDEX Bot Kit: https://github.com/somnia-chain/dreamdex-bot-kit
- DreamDEX Bot Builder: https://dreambot-builder.vercel.app/
- Somnia/DreamDEX developer Telegram: https://t.me/+XHq0F0JXMyhmMzM0
- Somnia developer documentation: https://docs.somnia.network/

The previously shared X post at `https://x.com/itsNikku876/status/2055701271513026563` describes a separate Somnia Agentathon from May 2026. It is not a source for this Event Contracts hackathon.

## Downrail readiness

| Item | Status | Evidence or gap |
| --- | --- | --- |
| Working testnet prototype | Complete | Live reads plus successful filled orders, reload recovery, finalized position, successful claim, and a reserve-backed fresh-market rollover. |
| Public repository | Complete | https://github.com/Nifemi0/downrail; public, `main`, MIT. |
| Public deployment | Complete | https://downrail.vercel.app |
| Event Contract integration | Complete | SDK 0.28.1, live books, on-chain checks, orders, settlement primitives. |
| SDK feedback | Complete | `FEEDBACK.md` |
| Demo plan | Complete | `DEMO.md` |
| Demo video | Missing | Public 2–3 minute link required. |
| Shannon tiny pilot | Enabled | One IOC leg, at most 2.00 collateral units, Shannon only. |
| Real order evidence | Complete | Successful approval/order receipts and exact indexed fill in `EVIDENCE.md`. |
| Real claim evidence | Complete | Successful approval/redemption receipts and authoritative post-claim empty state in `EVIDENCE.md`. |
| Real rollover evidence | Complete | Near-expiry lifecycle trigger, exact reserve loading, fresh review, bounded stale-quote rejection, and a filled follow-on position in `EVIDENCE.md`. |
| DoraHacks form | Pending | Final submission not yet made. |

## Current competitive field

The closest entries during this review are:

- **Sluice Markets** — maximum acceptable loss converted into a policy-valid wallet-signed order: https://dorahacks.io/buidl/48108
- **Runs** — unattended chained windows with live buy, settle, redeem, and rollover claims: https://dorahacks.io/buidl/48198
- **Let It Ride** — automatic win rollovers with cash-out, stop-loss, and round limits: https://dorahacks.io/buidl/48189

Other entries focus on fair-value models, AI market audits, agent evaluation, social prediction, liquidity quality, games, and conditional paths.

## Positioning decision

Do not lead with “maximum spend,” “safe trading,” or “rolling windows” alone; competitors already occupy those ideas.

Lead with:

> Downrail is the portfolio-protection layer for DreamDEX: it starts with what you already hold, prices a bounded DOWN hedge from live liquidity, shows the loss that remains, and carries the position through settlement and the next protection window.

The demo must make four distinctions visible:

1. The user starts with an existing BTC or ETH exposure.
2. The plan is deterministic and constrained by executable order-book depth.
3. The interface compares unhedged loss with conditional protected loss and shows residual risk.
4. The product covers the complete lifecycle rather than stopping at order placement.

## Evidence standard

Implementation is not the same as proof. Mark an item live-verified only when backed by the current Shannon network, a successful receipt, and authoritative post-transaction state.

Required evidence bundle:

- current chain, wallet, venue, market ID, and pool address;
- decoded approval and order review;
- approval and order hashes;
- receipt status;
- fill or proven IOC cancellation;
- recovered state after reload;
- finalized position and payout vector;
- decoded claim review and claim hash;
- post-claim balance/state;
- rollover recommendation derived from that lifecycle.

## Final cross-check

- [x] Official brief and rubric captured.
- [x] Public application and repository available.
- [x] SDK feedback complete.
- [x] Differentiation reviewed against current competitors.
- [x] Production Shannon tiny pilot enabled with bounded execution.
- [x] Real order lifecycle captured.
- [x] Real claim lifecycle captured.
- [x] Real current-horizon rollover lifecycle captured.
- [ ] Final video published.
- [ ] Every submission link tested.
- [ ] DoraHacks form compared against `SUBMISSION.md`.
- [ ] Submission sent before the deadline.
