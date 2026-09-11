# Claims ledger

| Claim | Evidence | Scope |
|---|---|---|
| Downrail reads live DreamDEX Event Contracts on Shannon | Runtime implementation and `EVIDENCE.md` | Local and deployed build |
| A real order filled and was reconciled | Order/fill explorer links in `EVIDENCE.md` | Verified historical testnet evidence |
| A finalized winning position was claimed | Claim explorer links and post-claim observation in `EVIDENCE.md` | Verified historical testnet evidence |
| A reserve-backed rollover leg filled | Rollover explorer link in `EVIDENCE.md` | Verified historical testnet evidence |
| Current route bindings are revalidated before wallet submission | Execution validation tests and `/api/order-execution-check` | Shipped in the current deployed build |
| Current UI refuses routes that miss its deterministic value checks | `route-decision.test.ts` and preflight gate | Shipped in the current deployed build |
| Downrail guarantees portfolio protection | Withdrawn — this is not a valid claim | Never claim |
| Downrail has production users or revenue | No evidence | Never claim |
