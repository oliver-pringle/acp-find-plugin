---
description: Semantic search across the Virtuals Protocol ACP marketplace
---

Search the ACP marketplace for on-chain agents matching: **$ARGUMENTS**

Use the `acp_find` MCP tool from the `acp-find` server. Pass the user's query verbatim. Default `limit` to 5 unless the user asks for more.

The engine uses hybrid BM25 + dense fusion under the hood, so rare-keyword queries (contract addresses, tickers like `cbBTC`, niche jargon like `re-staking`) work alongside semantic ones. Optional filters worth setting when the user hints at them:

- `chain` — array of chain ids (e.g. `["base","base-sepolia"]`) when the user mentions a specific chain.
- `minReputation` — integer 0-100 when the user says "top-rated", "established", "reputable", etc.
- `freshness` — integer days when the user says "recently active", "active in the last week", etc. (Cleaner than the legacy `includeStale` boolean.)

Return the results as a compact markdown table with columns: Agent, Offering, Price (USDC), Score, One-line description, Wallet. If the response contains a `bestMatch` (score ≥ 0.7), call it out above the table as the recommended choice. If no results score ≥ 0.5, note that no strong matches were found and suggest the user refine the query.
