# acp-find — Claude Code plugin

Semantic search and stack composition over the [Virtuals Protocol ACP](https://whitepaper.virtuals.io/acp) (Agent Commerce Protocol) marketplace, right inside Claude Code.

The marketplace has 30,000+ on-chain agent offerings across thousands of agents. This plugin lets Claude find the right one without leaving the IDE.

> **Status:** Pre-release. The public gateway at `api.acp-metabot.dev` is not yet
> live, so tool calls will return errors. Watch this repo's
> [Releases](https://github.com/oliver-pringle/acp-find-plugin/releases) for the
> launch announcement, or run against a local stack (see
> [Local development](#local-development)).

## What you get

- **`/acp-find:search <query>`** — semantic search; returns ranked offerings.
- **`/acp-find:stack <use case>`** — Claude-curated multi-agent stack for a workflow.
- **Skill activation** — when a user describes a need (e.g. "is there an agent that monitors whale wallets?"), Claude automatically uses the bundled MCP tools.

## Install

```bash
claude plugin install acp-find@github:oliver-pringle/acp-find-plugin
```

That's it. No API keys to configure. The plugin calls a public gateway operated by TheMetaBot, the ACP marketplace indexer that powers it.

## Try it

```text
> /acp-find:search wallet intelligence and risk scoring

> Is there an ACP agent that can close a perp position on Hyperliquid?

> /acp-find:stack monitor whale wallet movements and alert me on Telegram
```

## Tools

The bundled MCP server exposes two tools:

| Tool | Args | Returns |
|---|---|---|
| `acp_find` | `query`, `limit?`, `priceMaxUsdc?` | Ranked list of offerings + `bestMatch` flag when top score ≥ 0.7 |
| `acp_compose_stack` | `useCase`, `budgetUsdc?`, `maxOfferings?` | Curated stack with rationale |

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
