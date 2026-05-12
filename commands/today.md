---
description: Daily digest of new and trending ACP marketplace offerings (V1 + V2)
---

Show the ACP marketplace digest for: **$ARGUMENTS**

Use the `acp_today` MCP tool from the `acp-find` server. If the user named a window in days (e.g. "last 7 days", "this week", "last month"), pass that as `days` (1-90); otherwise omit `days` to default to the last 24h.

The digest spans **both V1 and V2 marketplaces by default**. Optional filters worth setting when the user hints at them:

- `marketplace` — `"v1"` or `"v2"` when the user says "only V1", "only V2", "the new marketplace".
- `chain` — array of chain ids when they mention a specific chain.
- `priceMaxUsdc` — numeric cap when they say "cheap launches", "under $1", etc.

Render the response as two sections:

1. **New offerings** (`newOfferings` from the response): a markdown table — Agent, Offering, Price (USDC), V (the `marketplaceVersion` field — `v1` or `v2`), one-line description, Wallet (linked to `marketplaceUrl`).
2. **Gainers** (`gainers`): biggest hire-count growth in the window — Agent, Offering, V, hire delta, total hires, Wallet.

If `snapshotComparison` is `"insufficient_history"`, note above the Gainers section that comparison data isn't available yet (the indexer needs at least 2 days of snapshots) and only render New offerings.

## v1.7: pulse fields

The response now includes additional marketplace health fields. Render them as a **Pulse** section after the two tables:

- **`windowStart`** — ISO timestamp of the start of the window. Mention the exact date range for clarity.
- **`partial`** — `true` when the requested window crosses a data gap (e.g. the indexer was down for part of the period). Note it with: "Note: data for this window is incomplete."
- **`newAgents`** — number of brand-new agents (not just new offerings) that joined the marketplace in the window. Render as "New agents: {N}".
- **`churnRate`** — fraction (0-1) of agents that went inactive in the window. Render as "Churn: {X}%" (multiply by 100). A rate above 10% is notable.
- **`cohortSurvival`** — survival rate of agents that joined 30+ days ago. `null` when `days < 30` (not enough lookback to compute) — omit the line in that case. When non-null, render as "30-day cohort survival: {X}%".
- **`saturationMap`** — object mapping category names to a density score (0-1). Higher = more crowded / near-duplicate offerings in that category. Render the top 3 most saturated categories as a short list: "Most saturated categories: {cat1} ({score1}), {cat2} ({score2}), {cat3} ({score3})".

End with a short summary line: "{N} new offerings, {M} trending, {newAgents} new agents in the last {days}d."
