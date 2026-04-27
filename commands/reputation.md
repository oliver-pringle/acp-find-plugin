---
description: Look up an ACP agent's reputation by wallet address
---

Look up the reputation for ACP agent: **$ARGUMENTS**

Use the `acp_agent_reputation` MCP tool from the `acp-find` server. Pass the wallet address verbatim as `agentAddress`. If the user also named a specific offering (e.g. "reputation for ButlerLiquid's close_perp_position"), pass that as `offeringName` to narrow the response to a single per-offering block.

Render the response as:

1. **Headline:** agent name + 0–100 reputation score + percentile (e.g. "ButlerLiquid — 82/100, top 8%").
2. **Lifetime jobs** (`agentTotalJobs`).
3. **Per-offering breakdown** as a markdown table sorted by hires desc: offering name, lifetime hires, per-offering score.
4. The wallet address at the bottom for hire on https://app.virtuals.io.

If the response indicates the indexer is still warming up, surface that and suggest retrying in a minute.
