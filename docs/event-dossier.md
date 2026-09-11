# Event Contracts Hackathon — event dossier

Accessed September 10, 2026. Official source: https://dorahacks.io/hackathon/event-contracts/detail

## Event facts

- Platform: DoraHacks.
- Organizers: Somnia × DreamDEX.
- Format: virtual; individuals and teams are eligible worldwide.
- Prize pool: $5,000 USDso, Open Track.
- Current event page: submission deadline extended to September 11, 2026 at 19:00 in the participant's displayed interface. The page does not state the timezone in its copy, so the timezone remains an explicit unknown. Downrail was already submitted September 6.
- Current gallery observation: 74 BUIDLs and 403 hackers.

## Official requirements and our ledger

| Official requirement | Downrail evidence | State |
|---|---|---|
| Working prototype on testnet | Shannon reads, bounded order flow, settlement and claim lifecycle | Done; current planner hardening release is public |
| GitHub repository | Public MIT-licensed repository linked from the BUIDL | Done |
| 2–3 minute demo video | Public newer motion demo, about 2:53, with voiceover and burned-in captions | Done; linked from BUIDL |
| Meaningful DreamDEX integration | SDK/indexer reads, on-chain binding checks, unsigned calls, receipts | Done |
| Clear and intuitive UX | Simplified planner and plain-English refusal gate | Current release; deployed |
| Potential adoption and trading impact | Consumer downside-check workflow | Demonstrated thesis; no external users claimed |
| SDK/documentation feedback | `FEEDBACK.md` | Done; optional requirement |

## Judging criteria

| Criterion | Weight | Downrail response |
|---|---:|---|
| Innovation & Originality | 20% | Event Contracts used as a transparent conditional offset for holders, not presented as insurance. |
| Technical Implementation | 25% | Live DreamDEX reads, depth-aware integer sizing, bounded wallet calls, settlement, claims, rollover and receipts. |
| User Experience & Design | 20% | Three-question default planner, translated trigger, direct cash flows and conservative route refusal. |
| Business & Ecosystem Impact | 20% | A consumer entry point that can bring holders into Event Contracts without selling their asset. |
| Presentation & Demo | 15% | Existing 2:48 public submission plus a newer public motion demo aligned to the current product story and visual direction. |

## Candidate directions considered

| Direction | Sponsor fit | Complexity | Decision |
|---|---|---:|---|
| Plain-English conditional-offset planner | High | Medium | Chosen |
| Autonomous rollover vault | Medium | High | Rejected: custody and automation expand risk |
| Social protection templates | Medium | Medium | Rejected: feature zoo |
| AI market predictor | High | High | Rejected: crowded field and different thesis |
| Liquidity market maker | High | High | Rejected: different user and capital model |

## Sources

- Official event brief and rules: https://dorahacks.io/hackathon/event-contracts/detail
- Official event gallery and extension status: https://dorahacks.io/hackathon/event-contracts/buidl
- DreamDEX Event Contracts: https://app.dreamdex.io/docs/trading/event-contracts
- DreamDEX settlement and voids: https://app.dreamdex.io/docs/trading/event-contracts/settlement-and-voids
