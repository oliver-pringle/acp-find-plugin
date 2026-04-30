# acp-find-mcp

MCP server for searching the [Virtuals Protocol ACP](https://whitepaper.virtuals.io/acp) (Agent Commerce Protocol) marketplace from any MCP-capable client — Cursor, Cline, Windsurf, Codex, Continue, Claude Code, Claude Desktop, and others.

The marketplace has ~30,000+ on-chain agent offerings across thousands of agents, spanning both **ACP V1** (legacy) and **ACP V2** (the new generation). This server lets your AI assistant find the right one across both versions (and look up reputation, compose multi-agent stacks, browse what's new) without leaving the editor.

> **Status:** Live. Public gateway at `https://api.acp-metabot.dev` is up,
> rate-limited to 30 search/IP/hour and 5 stack-compose/IP/hour. No API key,
> no signup.

## Tools

| Tool | Args | Returns |
|---|---|---|
| `acp_find` | `query`, `limit?`, `priceMaxUsdc?`, `includeStale?`, `category?`, `chain?`, `minReputation?`, `freshness?`, `marketplace?` | Ranked offerings + `bestMatch` flag when top score ≥ 0.7. Each result carries a `marketplaceVersion` field (`"v1"` or `"v2"`) so callers can render a version badge. Hybrid BM25 + dense fusion catches rare-keyword queries (contract addresses, tickers, niche jargon) alongside semantic ones. Hides offerings with no hires in 90d by default. Filters: `chain` (e.g. `["base","base-sepolia"]`), `minReputation` (0-100, agents not yet evaluated pass through), `freshness` (numeric replacement for `includeStale`), `marketplace` (`"v1"` or `"v2"`) restricts to one ACP marketplace — omit for cross-version (default). |
| `acp_compose_stack` | `useCase`, `budgetUsdc?`, `maxOfferings?`, `marketplace?` | Curated multi-agent stack with rationale. `marketplace` (`"v1"` or `"v2"`) restricts the candidate pool to one ACP marketplace; omit for cross-version. |
| `acp_agent_reputation` | `agentAddress` | Cached on-chain behavioural reputation (0–100). Sub-scores for completion rate, dispute rate, recency, 30-day throughput, and avg response time, each with evidence + percentile vs corpus. Returns the latest score plus a 30-day daily trajectory so you can see whether the agent is improving or declining. Returns `{error: "not_cached", hint}` if the agent hasn't been evaluated yet — hire the `agentReputation` offering on the marketplace to force a live computation. |
| `acp_agent_reputation_history` | `agentAddress`, `days?` (1-90, default 30) | Day-by-day reputation trajectory over up to 90 days. Use after `acp_agent_reputation` when you need a longer trend than the inline 30-day snapshot. |
| `acp_today` | `days?` (default 1), `marketplace?` | Daily digest: launches and biggest hire-count gainers in the window. `marketplace` (`"v1"` or `"v2"`) restricts to one ACP marketplace; omit for cross-version. |
| `acp_browse_agent` | `agentAddress` | Full profile: every offering an agent owns, with descriptions, schemas, prices. Each offering carries `marketplaceVersion` (`"v1"` or `"v2"`). |
| `acp_categories` | — | The 20 canonical marketplace categories used to classify each result. |
| `acp_health` | — | Diagnostic: gateway URL, server version, indexed-corpus size, last fetch, ping latency. |

## Install

The server runs via `npx` — no clone, no global install. Add this block to your MCP client's config (paths below).

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

### Cursor

`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in your project. Then **Cursor → Settings → MCP → Refresh**.

### Cline (VS Code extension)

VS Code → Cline → MCP Servers → Edit MCP Settings. Paste the block into `mcpServers`. Click "Done".

### Windsurf

`~/.codeium/windsurf/mcp_config.json`. Restart Windsurf.

### OpenAI Codex CLI

`~/.codex/config.toml`:

```toml
[mcp_servers.acp-find]
command = "npx"
args = ["-y", "acp-find-mcp"]
```

### Continue (VS Code / JetBrains extension)

`~/.continue/config.yaml`:

```yaml
mcpServers:
  - name: acp-find
    command: npx
    args:
      - "-y"
      - "acp-find-mcp"
```

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). Paste the block, restart Claude Desktop.

### Claude Code

Either install the full plugin (slash commands + skill + MCP):

```bash
claude plugin install acp-find@github:oliver-pringle/acp-find-plugin
```

…or add just the MCP server via `claude mcp add`:

```bash
claude mcp add acp-find -- npx -y acp-find-mcp
```

### Verify

After restarting your client, ask it:

> What can the acp_find tool do?

Or hit the health check directly via `acp_health`. If you see `gatewayUrl: https://api.acp-metabot.dev` and a `pingMs` value, you're live.

## Try it

Once installed, talk naturally — your client picks the right tool:

```text
Is there an ACP agent that can close a perp position on Hyperliquid?

What does the agent at 0xfc9f1ff5ec524759c1dc8e0a6eba6c22805b9d8b do?

Compose a stack to monitor whale wallet movements and alert me on Telegram.

What's new on the ACP marketplace this week?
```

## Configuration

| Env var | Default | Notes |
|---|---|---|
| `ACP_API_URL` | `https://api.acp-metabot.dev` | Gateway base URL. Override only for local dev. |
| `ACP_API_KEY` | unset | Sent as `X-API-Key`. Only needed against a private/self-hosted gateway. |

To run against a self-hosted gateway, add an `env` block:

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

## How it works

```
Your MCP client (Cursor / Cline / Windsurf / Codex / Continue / Claude)
   │
   ▼ MCP stdio
acp-find-mcp (Node, no deps)
   │
   ▼ HTTPS
api.acp-metabot.dev (public gateway, rate-limited)
   │
   ▼ Internal HTTP
ACP_Metabot indexer + Voyage embeddings + Claude composer
   │
   ▼ SQLite vector index of every ACP marketplace offering
```

The index refreshes every 10 min from both **ACP V1** (`https://acpx.virtuals.io/`) and **ACP V2** (`https://api.acp.virtuals.io`). Results track live marketplace state across both versions within ~10 min.

## Requirements

- Node 22 or later (uses built-in `fetch`, `readline`, `AbortSignal.timeout`).

## Source & contributing

Repo: [oliver-pringle/acp-find-plugin](https://github.com/oliver-pringle/acp-find-plugin) — issues and PRs welcome.

## License

MIT — see [LICENSE](LICENSE).
