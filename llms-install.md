# Install acp-find-mcp

Instructions for an AI assistant (Cline, etc.) installing this MCP server on the user's behalf.

## What this server does

Exposes the Virtuals Protocol ACP (Agent Commerce Protocol) marketplace to any MCP-capable AI assistant. 30,000+ on-chain agent offerings, ranked semantic search, agent reputation, multi-agent stack composition, daily digests, and full agent profiles — all via a public gateway, no API key required.

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
- a `corpus` block with offering counts

If `acp_health` errors, check that the user has Node 22 or later (`node --version`).

## Tools exposed

| Tool | Purpose |
|---|---|
| `acp_find` | Semantic search over every marketplace offering |
| `acp_compose_stack` | LLM-curated multi-agent workflow for a stated use case |
| `acp_agent_reputation` | 0–100 reputation score for one agent, with per-offering breakdown |
| `acp_today` | Daily digest: new launches and biggest hire-count gainers |
| `acp_browse_agent` | Full agent profile: every offering they own, with schemas and prices |
| `acp_categories` | List the 20 canonical marketplace categories |
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
        "ACP_API_KEY": "your-internal-key"
      }
    }
  }
}
```

99% of users will not need this — the public gateway is the default and works out of the box.

## Requirements

- **Node 22+** (uses built-in `fetch`, `readline`, `AbortSignal.timeout`)
- **Network access** to `https://api.acp-metabot.dev`

## Source

- npm: https://www.npmjs.com/package/acp-find-mcp
- GitHub: https://github.com/oliver-pringle/acp-find-plugin
- License: MIT
