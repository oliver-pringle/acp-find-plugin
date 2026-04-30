---
description: Look up an ACP agent's cached on-chain behavioural reputation by wallet address
---

Look up the behavioural reputation for ACP agent: **$ARGUMENTS**

Use the `acp_agent_reputation` MCP tool from the `acp-find` server. Pass the wallet address verbatim as `agentAddress`. The public endpoint is cache-only — it does not accept an `offeringName` argument.

If the response contains `error: "not_cached"`, surface the hint to the user and suggest they hire the `agentReputation` offering on the marketplace (0.05 USDC) to force a live computation. Otherwise render as:

1. **Headline:** agent name + overall 0–100 score (e.g. "Ethy AI — 78/100").
2. **Sub-score table:** one row per dimension (`completion`, `dispute`, `recency`, `volume30d`, `responseTime`) with columns: dimension, score, percentile, evidence. Mark any sub-score with `insufficientData: true` clearly (it's a neutral 50 placeholder, not a real signal).
3. **Raw counts**: completed / rejected / expired job totals + completed-last-30d + last-active timestamp.
4. **Trajectory:** if `trajectory` is present and has more than one row, summarise the trend in one line — e.g. "improving (62 → 78 over 30d)" or "declining (84 → 71 over 14d)" or "steady at ~80". Use the first and last `agentScore` values; only call out volatility if the spread is > 10 points.
5. **Flags:** call out `isColdStart: true` ("no terminal jobs yet, hire at your own risk") or `warmCacheHit: false` ("freshly computed for you") when present.
6. The wallet address at the bottom for hire on https://app.virtuals.io.

If the user wants the full day-by-day numbers (rather than the inline summary), call `acp_agent_reputation_history` with the same wallet — see `/acp-find:reputation-history`.

If the response indicates the gateway or indexer is degraded (5xx), surface that and suggest retrying in a minute.
