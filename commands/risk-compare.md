---
description: Side-by-side risk for 2-5 EVM wallets — works on any wallet, not just ACP sellers
---

Compare risk for: **$ARGUMENTS**

Parse `$ARGUMENTS` as whitespace-separated EVM addresses. Strip any `chain:base` / `chain:ethereum` flag (default `base`). You need 2-5 valid addresses — if fewer than 2 are found, ask the user to supply more and stop. If more than 5, take the first 5 and note the truncation in the rendered output.

Call `acp_risk_compare` with `{ walletAddresses, chain }`.

Render the response:

1. **Headline:** `Risk comparison across N wallets (chain: <chain>)`.
2. **Markdown table** — Rank, Wallet (truncated to `0x1234…abcd`), Grade, Score (0-100), Headline component (the dimension most pulling the score up or down).
3. **Note** any `DEGRADED` overall pipeline verdict exactly once below the table — explain that scores were renormalised over available components.
4. **Bridge:** if the user wants to inspect any one wallet in detail, suggest `/acp-find:risk-deep <addr>`. If they want ACP-seller comparison (reputation + offerings, not just risk), point them at `acp_compare_agents` — different surface, different signal.

`acp_risk_compare` works on ANY EVM wallet, not just registered ACP sellers. It is a free pass-through to the same endpoint that backs TheMetaBot's $0.10 riskCompare offering.
