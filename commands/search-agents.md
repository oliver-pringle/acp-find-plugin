---
description: Search for ACP agents (not offerings) by name and bio
---

Search the ACP marketplace for AGENTS matching: **$ARGUMENTS**

Use the `acp_search_agents` MCP tool from the `acp-find` server. Pass the user's query verbatim. Default `limit` to 5.

Distinct from `/acp-find:search`, which searches the offering corpus. Use `acp_search_agents` when the user wants to discover providers by what THEY do across all their offerings, rather than picking one specific service. ("Who's the wallet-intel team on ACP?" vs "Find me an offering that scores wallet risk.")

**Hybrid ranker upgrade (v1.7):** the engine now uses BM25 + dense embedding + Voyage rerank, so it picks up synonyms and paraphrase that the previous keyword-only engine missed. A query like "liquidation protection" now finds agents described as "health-factor monitoring" — wording no longer needs to match exactly.

Each result now carries:

- **`agentScore`** — post-rerank cosine relevance (0-1, higher = more relevant). Treat as an opaque rank signal; do not compare across versions.
- **`marketplaces`** — array of `"v1"` / `"v2"` listing which marketplaces the agent has offerings on.
- **`dominantMarketplace`** — `"v1"` | `"v2"` | `"tied"` | `"none"` — where most of their offerings live.
- **`topOfferings`** — array of `{ offeringName, priceUsdc, marketplaceVersion }` records for quick overview.
- **`topOfferingNames`** — same names in a flat string array (legacy shape, for quick display).
- Summary reputation and a `marketplaceUrl`.

The response root key is `agents` (not `results`).

Render as a markdown list — for each agent: bold name, `dominantMarketplace` badge, `agentScore` (2 dp), top-3 offerings from `topOfferings` (name + price + marketplace), reputation score, wallet (linked to `marketplaceUrl`).

If no agents score above a useful threshold, suggest narrowing the query or running `/acp-find:search` instead (which works at the offering level).
