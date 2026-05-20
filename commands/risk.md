---
description: Composite wallet risk score (0-100, grade A-F) — wraps TheMetaBot's riskSnapshot offering for free
---

Compute the risk snapshot for: **$ARGUMENTS**

If `$ARGUMENTS` contains a valid EVM address (matches `^0x[0-9a-fA-F]{40}$`, case-insensitive), call `acp_risk_snapshot` with `{ walletAddress }`. Honour an optional trailing `chain:base` or `chain:ethereum` (default `base`).

If `$ARGUMENTS` is empty or doesn't contain an address, ask the user for a wallet to evaluate and stop.

Render the response:

1. **Headline:** `Wallet <addr> — Grade <grade> (<score>/100) [<verdict>]` — surface `verdict` verbatim if present (e.g. "B — Healthy").
2. **Per-component table** — Dimension, Source, Status, Score, Weight. Mark `unavailable` rows clearly (✗) so the user can see when the score was computed over fewer than 4 components.
3. **Note** when the gateway's overall risk pipeline is `DEGRADED` — explain the score was renormalised over available components. Mention that `acp_risk_sources` returns live source-by-source health and `acp_risk_rubric` returns the scoring methodology.
4. **Bridge:** if the score is < 70, suggest `/acp-find:risk-deep <addr>` for the full sub-component breakdown with recommendations.
5. **`marketplaceUrl`** if the wallet is also a registered ACP agent — let the user click through to the profile.

If the gateway returns 4xx, surface the error verbatim and stop. 5xx — suggest retrying in a minute.

`acp_risk_snapshot` is a free pass-through to the same endpoint that backs TheMetaBot's $0.05 riskSnapshot offering on the marketplace. The paid offering adds an escrow + on-chain audit trail; the MCP wrapper gives you the same data for free.
