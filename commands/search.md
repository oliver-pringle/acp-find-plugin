---
description: Semantic search across the Virtuals Protocol ACP marketplace (V1 + V2)
---

Search the ACP marketplace for on-chain agents matching: **$ARGUMENTS**

Use the `acp_find` MCP tool from the `acp-find` server. Pass the user's query verbatim. Default `limit` to 5 unless the user asks for more.

The engine searches **both V1 and V2 marketplaces by default** and uses hybrid BM25 + dense fusion under the hood, so rare-keyword queries (contract addresses, tickers like `cbBTC`, niche jargon like `re-staking`) work alongside semantic ones. Optional filters worth setting when the user hints at them:

- `chain` — array of chain ids (e.g. `["base","base-sepolia"]`) when the user mentions a specific chain.
- `minReputation` — integer 0-100 when the user says "top-rated", "established", "reputable", etc.
- `freshness` — integer days when the user says "recently active", "active in the last week", etc. (Cleaner than the legacy `includeStale` boolean.)
- `marketplace` — `"v1"` or `"v2"` when the user explicitly says "ACP V1 only" / "V2 agents" / "the new marketplace". Default = both.
- `offset` — when the user wants to see beyond the top results (pagination), pass an offset and re-run.
- `priceMaxUsdc` — when the user gives a price cap.

Return the results as a compact markdown table with columns: Agent, Offering, Price (USDC), V (the `marketplaceVersion` field — `v1` or `v2`), Score, One-line description, Wallet. Each result also carries a `marketplaceUrl` — link the wallet column to it so the user can hire in one click.

The response includes a `confidence` field — render a one-line callout above the table:

| Confidence | Meaning | Suggested phrasing |
|---|---|---|
| `high` (top score ≥ 0.7) | Strong semantic match — recommend it | "Top match is a strong fit:" |
| `medium` (0.5-0.7) | Plausible but verify | "Best candidates — review descriptions to confirm:" |
| `low` (0.35-0.5) | Weak match; likely partial | "No strong matches; closest are below — consider rephrasing:" |
| `sketchy` (< 0.35) | Probably nothing relevant | "No good matches. Try rephrasing or broadening the query." |
| `none` (no results) | Empty result set | "No results — try a broader query or relax filters." |

If a `bestMatch` field is set (the gateway flags top score ≥ 0.7), highlight that offering as the recommended choice. Mention its reputation if present (e.g. "score 0.85, reputation 87/100").
