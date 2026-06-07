---
description: One-call: live health snapshot across all 15 portfolio bots (parallel probes)
---

Run a portfolio health snapshot.

Call `acp_portfolio_status` (no args required).

Render the response:

1. **Headline:** `Portfolio: <healthyCount>/<count> bots reachable (<checkedAt>)`.
2. **Per-bot table:** Bot name, Role (truncated to ~60 chars), Status (✓ if reachable else ✗), Latency (ms), Error (if unreachable).
3. **Highlight** any unreachable bot in the table with a brief note explaining the error.
4. **Bridge:** for any unreachable bot, suggest checking the gateway slug directly:
   - `https://api.acp-metabot.dev/<slug>/health` for path-prefixed bots (ButlerBridgeBot, ConciergeBot, SecurityBot, SolanaBot, WitnessBot)
   - `https://api.acp-metabot.dev/<slug>/v1/resources/*` for path-prefixed Resource bots (ChainlinkBot, OracleBot, etc.)
   - `https://api.acp-metabot.dev/v1/health` for TheMetaBot itself (slug=null)
5. If `healthyCount < count` and the user wants more detail on a specific bot, suggest invoking the relevant `acp_resource_call` or `acp_browse_agent` to drill in.

The 15-bot list is hardcoded in `mcp-server/server.js` (PORTFOLIO_BOTS const). As of v0.13.0 the portfolio is at 15/15 — adding/removing a bot requires a new MCP release.
