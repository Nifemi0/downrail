# Downrail Shannon evidence

Evidence captured: September 1, 2026  
Network: Somnia Shannon testnet, chain ID `50312`  
Wallet: [`0x249e79De269e54a901A3d2Ce660496563103b470`](https://shannon-explorer.somnia.network/address/0x249e79de269e54a901a3d2ce660496563103b470)

This file records public testnet evidence only. It contains no private key, seed phrase, or secret.

## Filled protection order

- Market ID: `0x000000000000000000000000000000000000000000000000000000000000fee8`
- Side: `BUY_NO`
- Pool: `0xd548d450d76f8f3e9cc13b2a910d3ec0ab4423b8`
- Venue: `0x679795a0195a1b76cdebb7c51d74e058aee92919b8c3389af86ef24535e8a28c`
- Operator: `2`
- Approval: [`0xeff56d4f403f3937b28e56251977075066748afc1e8cf684d05c34f420376e09`](https://shannon-explorer.somnia.network/tx/0xeff56d4f403f3937b28e56251977075066748afc1e8cf684d05c34f420376e09)
- Order: [`0xff6d45404a3e257eab9a4e2b87cad2086f0c6bc3a43e3d2de1b1c84107ea1c85`](https://shannon-explorer.somnia.network/tx/0xff6d45404a3e257eab9a4e2b87cad2086f0c6bc3a43e3d2de1b1c84107ea1c85)
- Receipt status: both successful (`0x1`)
- Order block: `476814651`
- Indexed at: `2026-09-01T09:21:53Z`
- Fill: `826000 / 826000` raw quantity at `55000` raw price
- Quote quantity: `45430` raw TESDC
- Order state: `Filled`; no resting quantity and no open order
- Reload recovery: verified in the deployed Downrail activity journal

The live reconciliation endpoint matched the exact order transaction to fill `476814651_38`, the finalized market, and the resulting position.

## Finalized position

- Market state: finalized and resolved; not voided
- Outcome held: `NO`, outcome index `1`
- Winning balance: `1652000` raw units (`1.652000`)
- Estimated claim payout: `1652000` raw TESDC (`1.652000`)
- Pre-claim state: claimable in the deployed portfolio inbox

## Verified claim

A fresh unsigned review successfully decoded two bounded calls:

1. `OUTCOME_APPROVAL` to `0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9`, authorizing only the Shannon binary module.
2. `REDEEM` to `0x3ecC694Cef705358864a646142ac17A90E29e388`, redeeming the full reviewed winning balance.

- Outcome-token operator approval: [`0xb164744d590b3007fedaa2a626e02598a07cf8dd2c18fb97f6e5fd89295ba827`](https://shannon-explorer.somnia.network/tx/0xb164744d590b3007fedaa2a626e02598a07cf8dd2c18fb97f6e5fd89295ba827)
- Approval block: `477094542`
- Approval timestamp: `2026-09-01T17:08:28Z`
- Redemption: [`0x73b1d1f8ed2707d8869b92fb1a4b9e9546cc6295c89a856783e85de5b3df4a82`](https://shannon-explorer.somnia.network/tx/0x73b1d1f8ed2707d8869b92fb1a4b9e9546cc6295c89a856783e85de5b3df4a82)
- Redemption block: `477094594`
- Redemption timestamp: `2026-09-01T17:08:34Z`
- Receipt status: both successful (`0x1`)
- Deployed claim journal: `CLAIMED`

The deployed settlement inbox was refreshed after the receipts and returned `positions: []` and `owedFallbacks: []` for the wallet. The previously claimable `1652000` raw NO balance is therefore no longer outstanding.

## Verified current-horizon rollover

A separate ETH plan was created specifically to prove a real rollover while the requested horizon still extended beyond the first market. The plan used a `1.50` TESDC total budget: `0.75` for the current leg and `0.75` reserved for a fresh review.

### First horizon leg

- Market ID: `0x0000000000000000000000000000000000000000000000000000000000010533`
- Market expiry: `2026-09-01T18:00:00Z`
- Filled order: [`0xfa5f0fae7e729561f087fb2aea08a7d2fa40eeb5e3d88996cfacd2ae9158b0ec`](https://shannon-explorer.somnia.network/tx/0xfa5f0fae7e729561f087fb2aea08a7d2fa40eeb5e3d88996cfacd2ae9158b0ec)
- Order state: `Filled`; `795000 / 795000` raw quantity, no resting quantity
- Indexed fill: `477118254_6`
- Fill: `795000` raw quantity at `144000` raw price
- Quote quantity: `114480` raw TESDC
- Resulting position: `795000` raw `NO`

Five minutes before expiry, the deployed lifecycle queue produced one deduplicated `near expiry` recommendation and preserved the exact `0.750000` TESDC reserve. `Load reserved rollover` restored ETH, testnet mode, the reserve amount, and the closest supported remaining horizon before running fresh market discovery.

### Fresh rollover leg

- New market ID: `0x00000000000000000000000000000000000000000000000000000000000105e5`
- New market expiry: `2026-09-01T19:00:00Z`
- Exact collateral approval: [`0x05c6ea8134d00333c6a8c602a0464c22e1931f9140d2b35d971f77d96247ea16`](https://shannon-explorer.somnia.network/tx/0x05c6ea8134d00333c6a8c602a0464c22e1931f9140d2b35d971f77d96247ea16)
- Stale-quote IOC: [`0xf05777f3794cf8d2cc4aa83891a45902b721fe1fbe8b4c46b3724bbd3054d2eb`](https://shannon-explorer.somnia.network/tx/0xf05777f3794cf8d2cc4aa83891a45902b721fe1fbe8b4c46b3724bbd3054d2eb) reverted with `ImmediateOrCancelNoFill`; the bounded order did not accept a worse fill
- Refreshed filled order: [`0xe02d355b2990c4e2624c42a3fba5a584b0fe973a5a22179d4d821f593a68c35d`](https://shannon-explorer.somnia.network/tx/0xe02d355b2990c4e2624c42a3fba5a584b0fe973a5a22179d4d821f593a68c35d)
- Order state: `Filled`; `559000 / 559000` raw quantity, no resting quantity
- Indexed fill: `477130634_5`
- Fill: `559000` raw quantity at `330000` raw price
- Quote quantity: `184470` raw TESDC
- Resulting position: `559000` raw `NO`
- Open orders after reconciliation: none

This proves the intended manual rollover boundary end to end: lifecycle trigger, preserved reserve, fresh market discovery, a new decoded review, explicit wallet confirmation, stop-on-revert protection, refreshed retry, successful receipt, exact indexed fill, and a new on-chain position. Downrail did not create an automatic or custodial order.
