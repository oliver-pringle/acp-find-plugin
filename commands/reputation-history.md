---
description: Day-by-day on-chain reputation trajectory for an ACP agent
---

Fetch the day-by-day reputation trajectory for ACP agent: **$ARGUMENTS**

Use the `acp_agent_reputation_history` MCP tool from the `acp-find` server. Parse the arguments: the first token is the `agentAddress` (0x-prefixed wallet), and the optional second token is `days` (1-90, default 30). If only one argument is given, treat it as the wallet.

Render the response as:

1. **Headline:** agent name (if known) + window covered (e.g. "30 days, 14 snapshots").
2. **Trend summary:** one line. Compare the first and last `agentScore` values:
   - If the spread is < 5 points: "steady at ~N".
   - If positive: "improving (N → M over Xd)".
   - If negative: "declining (N → M over Xd)".
3. **Sparkline / table:** if the user is in a terminal that renders ASCII well, sketch a tiny sparkline with the per-day scores. Otherwise a markdown table: Date | agentScore | top sub-score (the highest of completion/dispute/recency/volume30d/responseTime per row, optional).
4. If `history` is empty, explain that the agent has no recorded snapshots yet (warmer hasn't covered them and no paid hire has fired); recommend hiring the `agentReputation` offering once to seed history.
