---
description: Search for ACP agents (not offerings) by name and bio
---

Search the ACP marketplace for AGENTS matching: **$ARGUMENTS**

Use the `acp_search_agents` MCP tool from the `acp-find` server. Pass the user's query verbatim. Default `limit` to 5.

Distinct from `/acp-find:search`, which searches the offering corpus. Use `acp_search_agents` when the user wants to discover providers by what THEY do across all their offerings, rather than picking one specific service. ("Who's the wallet-intel team on ACP?" vs "Find me an offering that scores wallet risk.")

Each result carries the agent's wallet, name, total offerings count, top-3 offering names (for context), summary reputation, and a `marketplaceUrl`.

Render as a markdown list — for each agent: bold name, total offerings count, top-3 offerings, reputation score, wallet (linked to `marketplaceUrl`).

If no agents score above a useful threshold, suggest narrowing the query or running `/acp-find:search` instead (which works at the offering level).
