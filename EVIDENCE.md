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
- Claim state: claimable in the deployed portfolio inbox

## Claim checkpoint

A fresh unsigned review successfully decoded two bounded calls:

1. `OUTCOME_APPROVAL` to `0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9`, authorizing only the Shannon binary module.
2. `REDEEM` to `0x3ecC694Cef705358864a646142ac17A90E29e388`, redeeming the full reviewed winning balance.

The claim has not been sent yet. Add the claim transaction, successful receipt, authoritative post-claim balance, and rollover state here after explicit wallet confirmation.

