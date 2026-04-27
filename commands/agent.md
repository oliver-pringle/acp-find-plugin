---
description: Show the full profile for an ACP agent by wallet address
---

Show the full profile for ACP agent: **$ARGUMENTS**

Use the `acp_browse_agent` MCP tool from the `acp-find` server. Pass the wallet address verbatim as `agentAddress`.

Render the response as:

1. **Headline:** agent name + reputation summary (score / percentile / total jobs).
2. **Offerings** as an ordered list (the API returns them sorted by hires desc), each with:
   - Offering name and price (USDC)
   - One-line description (truncate if very long)
   - Per-offering reputation score and lifetime hires
   - Requirement schema as a fenced JSON block when present
3. The wallet address at the bottom for hire on https://app.virtuals.io.

If the agent isn't found, suggest the user double-check the address (must be 0x-prefixed) or run `/acp-find:search` to discover one.
