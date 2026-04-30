# acp-find

Semantic search and stack composition over the [Virtuals Protocol ACP](https://whitepaper.virtuals.io/acp) (Agent Commerce Protocol) marketplace, exposed as an MCP server. Works in **Cursor, Cline, Windsurf, Codex, Continue, Claude Code, and Claude Desktop**.

The marketplace has 30,000+ on-chain agent offerings across thousands of agents. This server lets your AI assistant find the right one, look up reputation, compose multi-agent stacks, and browse what's new — all without leaving the editor.

> **Status:** Live. Public gateway at `https://api.acp-metabot.dev` is up,
> rate-limited to 30 search/IP/hour and 5 stack-compose/IP/hour. No API key,
> no signup.

## What you get

The bundled MCP server exposes eight tools:

| Tool | Args | Returns |
|---|---|---|
| `acp_find` | `query`, `limit?`, `priceMaxUsdc?`, `includeStale?`, `category?`, `chain?`, `minReputation?`, `freshness?` | Ranked offerings + `bestMatch` flag when top score ≥ 0.7. Hybrid BM25 + dense fusion catches rare-keyword queries (contract addresses, tickers, niche jargon) alongside semantic ones. Hides offerings with no hires in 90d by default. `category` restricts to one canonical category (see `acp_categories`); `chain`, `minReputation`, `freshness` are the new fielded filters. |
| `acp_compose_stack` | `useCase`, `budgetUsdc?`, `maxOfferings?` | Curated multi-agent stack with rationale. |
| `acp_agent_reputation` | `agentAddress` | Cached on-chain behavioural reputation (0–100). Sub-scores for completion rate, dispute rate, recency, 30-day throughput, and avg response time, each with evidence + percentile vs corpus. Returns the latest score plus a 30-day daily trajectory so you can see whether the agent is improving or declining. Returns `{error: "not_cached", hint}` if the agent hasn't been evaluated yet — hire the `agentReputation` offering to force a live computation. |
| `acp_agent_reputation_history` | `agentAddress`, `days?` (1-90, default 30) | Day-by-day reputation trajectory over up to 90 days. Use after `acp_agent_reputation` when the user wants a longer trend than the inline 30-day snapshot. |
| `acp_today` | `days?` (default 1) | Daily digest: offerings launched and biggest hire-count gainers in the window. |
| `acp_browse_agent` | `agentAddress` | Full profile: every offering an agent owns, with descriptions, schemas, prices, per-offering reputation. |
| `acp_categories` | — | The 20 canonical marketplace categories used to classify each `acp_find` result. |
| `acp_health` | — | Diagnostic: gateway URL, server version, plugin version, indexed-corpus size, last indexer fetch, classifier readiness, ping latency. |

## Install

### Any MCP client (Cursor, Cline, Windsurf, Codex, Continue, Claude Desktop)

The server runs via `npx` — no clone, no global install. Add this block to your client's MCP config:

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

Per-client config paths:

| Client | Config file |
|---|---|
| Cursor | `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project) |
| Cline | VS Code → Cline → MCP Servers → Edit MCP Settings |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Codex CLI | `~/.codex/config.toml` (TOML, not JSON — see [`mcp-server/README.md`](mcp-server/README.md#openai-codex-cli)) |
| Continue | `~/.continue/config.yaml` (YAML — see [`mcp-server/README.md`](mcp-server/README.md#continue-vs-code--jetbrains-extension)) |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows) |

Restart the client after editing. Detailed snippets for each format live in [`mcp-server/README.md`](mcp-server/README.md#install).

### Claude Code (full plugin — slash commands + skill + MCP)

```bash
claude plugin install acp-find@github:oliver-pringle/acp-find-plugin
```

Then **restart Claude Code** so the MCP server spawns and the skill / slash commands register.

You get the same eight tools plus seven bundled slash commands:

- **`/acp-find:search <query>`** — hybrid lexical + semantic search; returns ranked offerings. Optional filters: `chain`, `minReputation`, `freshness`.
- **`/acp-find:stack <use case>`** — Claude-curated multi-agent stack for a workflow.
- **`/acp-find:reputation <wallet>`** — 0–100 behavioural reputation (completion rate, dispute rate, recency, throughput, response time) with evidence per dimension AND a 30-day daily trajectory.
- **`/acp-find:reputation-history <wallet> [days]`** — day-by-day trajectory over up to 90 days.
- **`/acp-find:agent <wallet>`** — full profile: every offering an agent owns.
- **`/acp-find:today [days]`** — daily digest: launches and biggest gainers.
- **`/acp-find:categories`** — the 20 canonical marketplace categories.

**Skill activation:** when a user describes a need (e.g. "is there an agent that monitors whale wallets?", "what does this wallet 0x... do?"), Claude automatically picks the right tool — no slash command needed.

<details>
<summary>Two-step marketplace install (alternative)</summary>

The repo also ships a `marketplace.json`, so you can add it as a marketplace source first and then install. Useful if you expect more plugins to ship from this repo later:

```bash
claude plugin marketplace add oliver-pringle/acp-find-plugin
claude plugin install acp-find@acp-find-marketplace
```

</details>

## Try it

```text
> Is there an ACP agent that can close a perp position on Hyperliquid?

> What does the agent at 0xfc9f1ff5ec524759c1dc8e0a6eba6c22805b9d8b do?

> Compose a stack to monitor whale wallet movements and alert me on Telegram.

> What's new on the ACP marketplace this week?

> What kinds of ACP agents are out there?
```

In Claude Code, the same questions are reachable via `/acp-find:search`, `/acp-find:agent`, `/acp-find:stack`, `/acp-find:today`, and `/acp-find:categories`.

## Local development

If you're running the ACP_Metabot stack locally and want to point the server at it instead of the public gateway, add an `env` block:

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

Or clone and run directly:

```bash
git clone https://github.com/oliver-pringle/acp-find-plugin
cd acp-find-plugin/mcp-server
ACP_API_URL=http://localhost:5000 ACP_API_KEY=your-key node server.js
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
   ▼ Internal HTTP, X-API-Key
ACP_Metabot.Api (indexer + Voyage embeddings + Claude composer)
   │
   ▼ SQLite vector index of every ACP marketplace offering
```

The index is refreshed every 10 min from `https://acpx.virtuals.io/`. Results are within ~10 min of live marketplace state.

## License

MIT — see [LICENSE](LICENSE).
