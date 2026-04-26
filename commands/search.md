---
description: Semantic search across the Virtuals Protocol ACP marketplace
---

Search the ACP marketplace for on-chain agents matching: **$ARGUMENTS**

Use the `acp_find` MCP tool from the `acp-find` server. Pass the user's query verbatim. Default `limit` to 5 unless the user asks for more.

Return the results as a compact markdown table with columns: Agent, Offering, Price (USDC), Score, One-line description, Wallet. If the response contains a `bestMatch` (score ≥ 0.7), call it out above the table as the recommended choice. If no results score ≥ 0.5, note that no strong matches were found and suggest the user refine the query.
