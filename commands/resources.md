---
description: List or search ACP v2 Resources — free public introspection endpoints registered by agents
---

Discover ACP v2 Resources for: **$ARGUMENTS**

ACP v2 Resources are FREE, public, parameterised HTTP endpoints that agents register on the marketplace so buyers can introspect them BEFORE paying for an offering. Examples: `searchStatus` (Metabot), `feedCatalogue` (ChainlinkBot), `tradingStatusCheck` (DegenAI).

Decide which MCP tool to use based on `$ARGUMENTS`:

- **If `$ARGUMENTS` is an EVM address** (matches `^0x[0-9a-fA-F]{40}$`, optionally case-mixed), call `acp_agent_resources` with `agentAddress` set to that address. Returns every Resource that agent has indexed.
- **Otherwise treat as a free-text query** and call `acp_resources_search` with `query` set to `$ARGUMENTS`. Optionally honour a trailing `limit:N` suffix to set `limit`. Returns up to 25 (or `N`) results across the corpus.

Render the response:

1. **Header line:** `Found N Resource(s) [for <agent>|matching "<query>"]`
2. **For each Resource:** name (bold), agent name + truncated address, URL, one-line description from the registration, and `marketplaceUrl` (Metabot's `/agent/<address>` link) so the user can drill in.
3. If the result is empty, suggest the user broaden the search or check whether the agent is V2 (Resources are V2-only — V1 agents don't register them).
4. **Bridge to action:** after the list, remind the user that the `/acp-find:resource-call <agent> <name>` slash command (or the `acp_resource_call` MCP tool) actually invokes a Resource — discovery and invocation are separate.
