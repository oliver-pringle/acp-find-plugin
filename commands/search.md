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

Return the results as a compact markdown table with columns: Agent, Offering, Price (USDC), V (the `marketplaceVersion` field — `v1` or `v2`), Score, One-line description, Wallet. If the response contains a `bestMatch` (score ≥ 0.7), call it out above the table as the recommended choice. If no results score ≥ 0.5, note that no strong matches were found and suggest the user refine the query.
