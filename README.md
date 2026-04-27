# acp-find — Claude Code plugin

Semantic search and stack composition over the [Virtuals Protocol ACP](https://whitepaper.virtuals.io/acp) (Agent Commerce Protocol) marketplace, right inside Claude Code.

The marketplace has 30,000+ on-chain agent offerings across thousands of agents. This plugin lets Claude find the right one without leaving the IDE.

> **Status:** Live. Public gateway at `https://api.acp-metabot.dev` is up,
> rate-limited to 30 search/IP/hour and 5 stack-compose/IP/hour. No API key,
> no signup.

## What you get

**Slash commands:**
- **`/acp-find:search <query>`** — semantic search; returns ranked offerings.
- **`/acp-find:stack <use case>`** — Claude-curated multi-agent stack for a workflow.

**Skill activation:** when a user describes a need (e.g. "is there an agent that monitors whale wallets?", "what does this wallet 0x... do?", "what's new on ACP today?"), Claude automatically picks the right bundled MCP tool — no slash command needed.

## Install

From a Claude Code session, run the two CLI commands:

```bash
claude plugin marketplace add oliver-pringle/acp-find-plugin
claude plugin install acp-find@acp-find-marketplace
```

Or from inside Claude Code as slash commands:

```text
/plugin marketplace add oliver-pringle/acp-find-plugin
/plugin install acp-find@acp-find-marketplace
```

Then **restart Claude Code** so the MCP server spawns and the skill / slash commands register.

No API keys to configure. The plugin calls a public gateway operated by TheMetaBot, the ACP marketplace indexer that powers it.

## Try it

```text
> /acp-find:search wallet intelligence and risk scoring

> Is there an ACP agent that can close a perp position on Hyperliquid?

> /acp-find:stack monitor whale wallet movements and alert me on Telegram

> What does the agent at 0xfc9f1ff5ec524759c1dc8e0a6eba6c22805b9d8b do?

> What's new on the ACP marketplace this week?

> What kinds of ACP agents are out there?
```

## Tools

The bundled MCP server exposes six tools:

| Tool | Args | Returns |
|---|---|---|
| `acp_find` | `query`, `limit?`, `priceMaxUsdc?`, `includeStale?` | Ranked offerings + `bestMatch` flag when top score ≥ 0.7. By default hides offerings with no hires in 90 days. |
| `acp_compose_stack` | `useCase`, `budgetUsdc?`, `maxOfferings?` | Curated multi-agent stack with rationale. |
| `acp_agent_reputation` | `agentAddress`, `offeringName?` | 0–100 reputation score, percentile, total jobs, per-offering breakdown. Use to vet a single agent. |
| `acp_today` | `days?` (default 1) | Daily digest: offerings launched and biggest hire-count gainers in the window. |
| `acp_browse_agent` | `agentAddress` | Full profile: every offering an agent owns, with descriptions, schemas, prices, per-offering reputation. |
| `acp_categories` | — | The 20 canonical marketplace categories used to classify each `acp_find` result. |

## Local development

If you're running TheMetaBot stack locally (or have access to a self-hosted
deployment) and want to point this plugin at it instead of the public gateway:

```bash
git clone https://github.com/oliver-pringle/acp-find-plugin
cd acp-find-plugin
# edit .mcp.json:
#   "ACP_API_URL": "http://localhost:5000"
#   "ACP_API_KEY": "<your INTERNAL_API_KEY>"
```

Then symlink or `cp -r` this directory into `~/.claude/plugins/` and restart Claude Code.

## How it works

```
User in Claude Code
   │
   ▼ MCP stdio
acp-find MCP server (Node, no deps)
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
