---
description: Inspect Degen Arena state — leaderboard, AI Council picks, and ACP overlap (via TheMetaBot)
---

Inspect Degen Arena data for: **$ARGUMENTS**

The Degen Arena (https://degen.virtuals.io) is Virtuals' AI trading competition on Hyperliquid + HIP-3. An AI Council selects a Top-10 each week to share a $200K copy-trade pot. TheMetaBot's v1.7 Arena indexer caches the leaderboard + council-pick history so ACP-side tools can cross-reference Arena agents against the ACP marketplace.

Decide which MCP tool to use based on `$ARGUMENTS`:

- **If `$ARGUMENTS` is an EVM address** (matches `^0x[0-9a-fA-F]{40}$`, case-insensitive), call `acp_arena_check` with `{ agentAddress }`.
- **If `$ARGUMENTS` mentions "council" or "picks"**, call `acp_arena_council_picks`. Honour a trailing `weeks:N` (1–26, default 4) when the user names a window.
- **If `$ARGUMENTS` mentions "overlap" or "cross-section" or "ACP"**, call `acp_arena_overlap`. Honour a trailing `topN:N` (10–500, default 50).
- **Otherwise** call `acp_arena_leaderboard`. Honour a trailing `limit:N` (1–500, default 50).

Render each response:

1. **`acp_arena_check`** — if `isParticipant: false`, surface the `note` and stop. Otherwise headline `Agent <addr> — Arena #<rank30d> (30d)`, then list:
   - Lifetime rank `rankLifetime`, lifetime PnL `pnlLifetimeUsd` USD
   - 30d rank `rank30d`, 30d PnL `pnl30dUsd` USD
   - Last-week AI Council pick: ✓ or ✗ (`lastWeekPick`)
   - First seen in Arena: `firstSeenInArenaAt`
   - Last observed: `lastObservedAt` (source: `source`)
   - `marketplaceUrl` for the agent's ACP profile.
2. **`acp_arena_leaderboard`** — markdown table: 30d Rank, Lifetime Rank, Agent (truncated address), 30d PnL (USD), Council ✓/✗, Last Observed, Marketplace. Cap at the requested `limit`; default 50. Report `count` above the table.
3. **`acp_arena_council_picks`** — for each week in `data` (descending `weekStart`), print `### Week of <weekStart>` then a numbered list of `picks` rendered as `{pickRank}. {agentAddress}`. Include the `marketplaceUrl` shape per pick by linking the address to `https://app.virtuals.io/acp/agents/<addr>`.
4. **`acp_arena_overlap`** — headline `{sellingOnAcp} of Top-{arenaTopN} Arena agents also sell on ACP ({(overlapFraction*100).toFixed(1)}%)`. Then a markdown table: 30d Rank, Agent, ACP Offering Count, Marketplace.

If the response indicates the Arena indexer is inactive (`isParticipant: false` with a note, or `count: 0` / `arenaSampled: 0`), tell the user Metabot's `Arena__Worker__Enabled` flag may be off and the data may be incomplete — the Arena worker defaults to OFF in production. Operator flips it on once TheArenaBot is reachable on `acp-shared`.

If the gateway returns 5xx, surface that and suggest retrying in a minute.
