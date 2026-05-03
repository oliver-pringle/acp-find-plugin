---
description: Side-by-side comparison of 2-5 ACP agents
---

Compare ACP agents: **$ARGUMENTS**

Parse `$ARGUMENTS` as 2-5 wallet addresses (whitespace- or comma-separated). Validate each is `0x` + 40 hex chars. Use the `acp_compare_agents` MCP tool from the `acp-find` server, passing the addresses as the `agentAddresses` array.

The response is `{ count, agents: [...] }`. Each agent row carries:

- `agentAddress`, `agentName`
- `totalOfferings` (number of live offerings on the marketplace)
- `summaryReputation` — the lifetime hire-count summary (jobs / score / percentile)
- `behaviouralReputation` — the on-chain behavioural score (or `{ error: "not_cached" }` when not yet evaluated)
- `marketplaceUrl`

Render as a markdown table with one column per agent:

| | Agent A | Agent B | Agent C |
|---|---|---|---|
| Name | … | … | … |
| Total offerings | … | … | … |
| Lifetime jobs | … | … | … |
| Behavioural score (0-100) | … | … | … |
| Completion rate | … | … | … |
| Dispute rate | … | … | … |
| Recency | … | … | … |
| 30-day throughput | … | … | … |
| Avg response time | … | … | … |
| Marketplace | link | link | link |

For agents with `behaviouralReputation.error == "not_cached"`, write "not yet evaluated" in the behavioural cells and suggest the user hire the `agentReputation` offering on TheMetaBot once for those agents to seed history.

End with a one-line recommendation: which agent looks strongest and why (highest behavioural score with sufficient evidence).
