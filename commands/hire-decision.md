---
description: One-call: compose a stack, fetch reputation per agent, recommend the top item by composite score
---

Run hire-decision for: **$ARGUMENTS**

`$ARGUMENTS` is the free-text use case. Optional trailing flags:
- `budget:N` (USDC cap on total stack cost)
- `chain:base,ethereum` (comma-separated)
- `max:N` (max offerings, 1-10, default 5)

Call `acp_hire_decision` with the parsed args.

Render the response:

1. **Headline:** `Recommendation: <agentName> · <offeringName> (composite <compositeScore>, $<priceUsdc>)`.
2. **One-line summary:** `Stack total: $<totalCostUsdc>` + budget compliance verdict if `budgetUsdc` was set (under/over by $X).
3. **Ranking table:** Rank, Agent (truncated), Offering, Price USDC, Reputation, Composite score, marketplaceUrl.
4. **Note** any items with `reputationError` — those candidates didn't have cached reputation; the user can run `/acp-find:reputation <addr>` to force a live compute.
5. **Bridge:** suggest `/acp-find:verify <addr>` to drill into the top candidate's full safety verdict (reputation + arena + recentJobs + risk), or `/acp-find:safe-quote <addr> <offering>` to merge offering details + verify into one call.

The composite score weights reputation (70%) × inverse price (30%). Lighter than `acp_agent_verify` per-agent — call verify on the top candidate before paying.
