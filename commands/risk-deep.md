---
description: Full risk breakdown for a wallet — sub-component context + recommendations, ~3-5 sec
---

Run the deep-dive risk analysis for: **$ARGUMENTS**

If `$ARGUMENTS` contains a valid EVM address, call `acp_risk_deep_dive` with `{ walletAddress }`. Honour an optional trailing `chain:base` or `chain:ethereum` (default `base`).

This call is slower than `/acp-find:risk` (~3-5 sec) because it does live RPC reads against LiquidGuard, RevokeBot, and MEVProtect to pull sub-component context. Warn the user up front so they don't abandon.

Render the response:

1. **Headline:** same as `/acp-find:risk` — wallet + grade + score + verdict.
2. **Per-dimension deep dive** — for each of the 4 dimensions (healthFactor, approvals, mevExposure, reputation), surface:
   - The 0-100 sub-score and its source bot
   - The sub-component context (active borrows / top approvals / recent MEV-bundled txs / reputation trajectory) when present in the response
   - The per-dimension recommendation when present
3. **Note any `unavailable` dimensions** — explain that the deep-dive can only enrich dimensions whose source bot is reachable.
4. **Bridge:** if the user wants the same wallet compared against others, suggest `/acp-find:risk-compare`. If they want to anchor the verdict on-chain, suggest `/acp-find:risk-attestation`.

`acp_risk_deep_dive` is a free pass-through to the same endpoint that backs TheMetaBot's $0.20 riskDeepDive offering on the marketplace.
