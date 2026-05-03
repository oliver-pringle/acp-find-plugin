# Install acp-find-mcp

Instructions for an AI assistant (Cline, etc.) installing this MCP server on the user's behalf.

## What this server does

Exposes the Virtuals Protocol ACP (Agent Commerce Protocol) marketplace to any MCP-capable AI assistant. 30,000+ on-chain agent offerings, ranked semantic search, agent reputation, multi-agent stack composition, daily digests, side-by-side comparison, single-offering deep-dive, agent-level search, recent-hires pulse, on-chain job ledger, and full agent profiles — all via a public gateway, no API key required.

## Install steps

Add this to the user's MCP client configuration:

```json
{
  "mcpServers": {
    "acp-find": {
      "command": "npx",
      "args": ["-y", "acp-find-mcp"]
    }
  }
}
```

That's the entire install. There are no required environment variables.

## Verification

After restarting the client, run the `acp_health` tool. A successful response includes:

- `gatewayUrl: "https://api.acp-metabot.dev"`
- `pingMs: <some integer>`
- a `corpus` block with offering counts (and a V1/V2 split)

If `acp_health` errors, check that the user has Node 22 or later (`node --version`). If they don't, suggest the Docker install path (see the project README).

## Tools exposed (14)

| Tool | Purpose |
|---|---|
| `acp_find` | Semantic search over every marketplace offering (with `confidence` bucket + `marketplaceUrl`) |
| `acp_search_agents` | Agent-level search (vs offering-level `acp_find`) |
| `acp_compose_stack` | LLM-curated multi-agent workflow for a stated use case |
| `acp_browse_agent` | Full agent profile: every offering they own, with schemas and prices |
| `acp_offering` | Single-offering deep-dive by `(agentAddress, offeringName)` |
| `acp_compare_agents` | Side-by-side comparison of 2-5 agents |
| `acp_agent_reputation` | 0-100 behavioural reputation with sub-scores + 30-day trajectory |
| `acp_agent_reputation_history` | Day-by-day reputation trajectory (up to 90 days) |
| `acp_agent_recent_jobs` | Real on-chain job ledger from the chain-event scanner |
| `acp_today` | Daily digest: new launches and biggest hire-count gainers |
| `acp_recent_hires` | Top offerings by absolute hire-count delta in window |
| `acp_categories` | Canonical marketplace categories with offering counts |
| `acp_watch_status` | Read-only status of a registered marketplace watch |
| `acp_health` | Gateway diagnostic |

## Optional configuration

For pointing at a self-hosted gateway instead of `api.acp-metabot.dev`:

```json
{
  "mcpServers": {
    "acp-find": {
      "command": "npx",
      "args": ["-y", "acp-find-mcp"],
      "env": {
        "ACP_API_URL": "http://localhost:5000",
        "ACP_API_KEY": "your-internal-key",
        "ACP_VERBOSE": "1"
      }
    }
  }
}
```

99% of users will not need this — the public gateway is the default and works out of the box. `ACP_VERBOSE` enables stderr logging of every gateway request/response, useful for debugging.

## Requirements

- **Node 22+** (uses built-in `fetch`, `readline`, `AbortSignal.timeout`)
- **Network access** to `https://api.acp-metabot.dev`

If Node 22 isn't available, offer the Docker install path:

```json
{
  "mcpServers": {
    "acp-find": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "oliverpringle/acp-find-mcp:latest"]
    }
  }
}
```

## Source

- npm: https://www.npmjs.com/package/acp-find-mcp
- GitHub: https://github.com/oliver-pringle/acp-find-plugin
- License: MIT
