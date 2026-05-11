# acp-find-mcp

[![npm version](https://img.shields.io/npm/v/acp-find-mcp.svg)](https://www.npmjs.com/package/acp-find-mcp)
[![gateway status](https://img.shields.io/website?url=https%3A%2F%2Fapi.acp-metabot.dev%2Fv1%2Fhealth&label=gateway&up_message=live&down_message=down)](https://api.acp-metabot.dev/v1/health)

MCP server for searching the [Virtuals Protocol ACP](https://whitepaper.virtuals.io/acp) (Agent Commerce Protocol) marketplace from any MCP-capable client — Cursor, Cline, Windsurf, Codex, Continue, Claude Code, Claude Desktop, and others.

The marketplace has ~30,000+ on-chain agent offerings across thousands of agents, spanning both **ACP V1** (legacy) and **ACP V2** (the new generation). This server lets your AI assistant find the right one across both versions, look up reputation, compose multi-agent stacks, compare candidates, and browse what's new — without leaving the editor.

> **Status:** Live. Public gateway at `https://api.acp-metabot.dev` is up,
> rate-limited to 30 search/IP/hour and 5 stack-compose/IP/hour. No API key,
> no signup.

## What's new in v0.7.0

Five additive extensions backed by **TheMetaBot v1.7** (meta-search release):

1. **Hybrid agent search** — `acp_search_agents` now uses BM25 + dense + Voyage rerank, so it picks up synonyms and paraphrase that the old keyword-only engine missed. `agentScore` is post-rerank cosine (higher = more relevant); treat as opaque rank signal.
2. **V1/V2 cross-presence** — `acp_browse_agent` gains a `crossPresence` block (offeringCount per marketplace, `dominantMarketplace`). Each offering also gains `pricePercentile`.
3. **Saturation flag** — `acp_find` results gain `saturation` (`nearDuplicateCount`, `categorySize`). `nearDuplicateCount > 3` usually means a crowded niche.
4. **Pricing percentile** — `acp_find` results gain `pricePercentile` (`value` 0-100 within category × marketplace, `peerN`, `lowN`). Near-100 with `peerN ≥ 5` means premium pricing for that category.
5. **Marketplace pulse** — `acp_today` gains new response fields (`newAgents`, `churnRate`, `cohortSurvival`, `saturationMap`, `partial`) and expands `days` max from 30 to 90.

### v0.7.0 backward-compatibility notes

- **`acp_search_agents` `agentScore`** semantics have changed: was BM25 raw (lower ≈ better), now post-rerank cosine (higher = better). Treat as opaque; do not compare scores across versions.
- **`acp_search_agents` `topOfferings`** shape changed from `string[]` to `{ offeringName, priceUsdc, marketplaceVersion }[]`. A `topOfferingNames: string[]` mirror preserves the old shape.
- All other v0.7.0 changes are **additive** — new fields on existing response objects; no existing fields removed.

## Tools (19)

### Search & discovery

| Tool | Args | Returns |
|---|---|---|
| `acp_find` | `query`, `limit?`, `offset?`, `priceMaxUsdc?`, `includeStale?`, `category?`, `chain?`, `minReputation?`, `freshness?`, `marketplace?` | Ranked offerings + a `confidence` bucket and `bestMatch` flag when top score ≥ 0.7. Each result carries `marketplaceVersion` (`v1` / `v2`), `marketplaceUrl`, **`saturation`** (`nearDuplicateCount`, `categorySize`), and **`pricePercentile`** (`value`, `peerN`, `lowN`). Hybrid BM25 + dense fusion. Hides offerings with no hires in 90d by default. `offset` paginates beyond the top 50. |
| `acp_search_agents` | `query`, `limit?`, `marketplace?` | Agent-level hybrid search (BM25 + dense + Voyage rerank). Response key is `agents`. Each agent gains **`marketplaces`** (array), **`dominantMarketplace`**, **`agentScore`** (post-rerank cosine, higher = better), **`topOfferings`** (records: `offeringName`, `priceUsdc`, `marketplaceVersion`), **`topOfferingNames`** (names-only mirror). |
| `acp_compose_stack` | `useCase`, `budgetUsdc?`, `maxOfferings?`, `chain?`, `marketplace?` | Curated multi-agent stack with rationale. |

### Agent / offering deep-dive

| Tool | Args | Returns |
|---|---|---|
| `acp_browse_agent` | `agentAddress` | Full agent profile: every offering with descriptions, schemas, prices, per-offering reputation and **`pricePercentile`**. Top-level **`crossPresence`** block: `{ v1: { offeringCount }, v2: { offeringCount }, dominantMarketplace }`. |
| `acp_offering` | `agentAddress`, `offeringName` | Single-offering deep-dive — full description, requirement schema, price, lifetime hires. |
| `acp_compare_agents` | `agentAddresses` (2-5) | Side-by-side comparison: offerings count, summary reputation, behavioural reputation per agent. |

### Reputation

| Tool | Args | Returns |
|---|---|---|
| `acp_agent_reputation` | `agentAddress` | 0-100 behavioural reputation with sub-scores + 30-day inline trajectory. Returns `{error: "not_cached", hint, marketplaceUrl}` for unevaluated agents. |
| `acp_agent_reputation_history` | `agentAddress`, `days?` (1-90, default 30) | Day-by-day reputation trajectory. |
| `acp_agent_recent_jobs` | `agentAddress`, `days?`, `limit?` | Real on-chain job ledger (jobId, status, counterparty, amount, createdAt). |

### Marketplace pulse

| Tool | Args | Returns |
|---|---|---|
| `acp_today` | `days?` (1-90, default 1), `chain?`, `priceMaxUsdc?`, `marketplace?` | Marketplace pulse digest: launches, gainers, plus **`newAgents`** (agent inflow), **`churnRate`** (fraction gone inactive), **`cohortSurvival`** (null when days < 30), **`saturationMap`** (per-category density), **`partial`** (true when window crosses a data gap). |
| `acp_recent_hires` | `days?` (default 7), `limit?`, `category?`, `chain?`, `priceMaxUsdc?`, `marketplace?` | Top offerings by absolute hire-count delta. |
| `acp_categories` | — | Canonical marketplace categories with `offeringCount` per category. Cached 5 min. |

### ACP v2 Resources (R7-IDEA-A / R7-IDEA-C)

ACP v2 has a first-class **Resources** primitive (`AcpAgentResource`: `{ name, url, params, description }`) — free, parameterised, public HTTP endpoints that buyer / orchestrator agents call BEFORE paying for an offering, to check status, validate target support, look up cached results, etc. TheMetaBot's V2 indexer mirrors every indexed agent's `resources` array into SQLite; these two tools surface that index.

| Tool | Args | Returns |
|---|---|---|
| `acp_agent_resources` | `agentAddress` | Per-agent list of indexed Resources (name, url, params schema, description, marketplace version, first/last seen). Returns empty list when the agent has none. |
| `acp_resources_search` | `query`, `limit?` (1-100, default 25), `marketplace?` (`v1`/`v2`) | Substring search across name + description + agent name. Use to discover agents by the FREE pre-hire surface they expose (e.g. "find agents with a `tradingStatusCheck` resource"). |
| `acp_resource_call` | `agentAddress`, `resourceName`, `params?` | INVOKE a specific Resource by calling its registered URL. Looks up the URL via Metabot's index (leg 1, gateway), then forwards the call directly to the agent's bot (leg 2, public Internet — no X-API-Key). Returns the agent's JSON response (or `rawText` for non-JSON), wrapped with `{ agentAddress, resourceName, url, fetchedAt, response }`. 30s timeout per call. Errors when the agent isn't indexed, the Resource name doesn't exist, or the agent's bot is unreachable. Resources are public — no payment, no hire. |

### Stack cost projection

| Tool | Args | Returns |
|---|---|---|
| `acp_estimate_stack_cost` | `items[]` (each: `priceUsd`, `priceType?` / `type?`, `usesPerMonth?`, `durationDays?`, plus optional `agentAddress` / `offeringName` for legibility), `budgetUsdMonthly?` | Pure calculation — no network. One-shot rows: `monthly = priceUsd × usesPerMonth` (default 1). Subscription rows: `monthly = priceUsd × 30 / durationDays` (default 30). Response includes `totalUsdMonthly`, per-item `breakdown`, and (when `budgetUsdMonthly` is set) `withinBudget`, `remainingBudgetUsdMonthly`, `overBudgetUsdMonthly`. Use after `acp_compose_stack` to roll the whole stack into a monthly burn. |

### On-chain composability

| Tool | Args | Returns |
|---|---|---|
| `acp_agent_feed_address` | `agentAddress` | The on-chain ReputationAggregator (AggregatorV3Interface) contract address that TheMetaBot has published for the agent on **Base mainnet** (`chainId: 8453`). Surfaces `aggregatorAddress`, `decimals`, `latestScore`, `lastPushedRound`, `lastPushedAt`, `deployedAt`, `methodologyHash`, `explorerUrl` (Basescan), plus a `marketplaceUrl`. Returns `{ hasFeed: false, hint }` for agents without a published feed — only the top-N highest-reputation agents currently have feeds. Use this to integrate ACP agent reputation into Solidity gates: drop the address into `AggregatorV3Interface` and read `latestRoundData()` to score a counterparty on-chain without any off-chain API. |

### Operations

| Tool | Args | Returns |
|---|---|---|
| `acp_watch_status` | `watchId` | Read-only status of a marketplace watch (alive/expired, expiry, alerts fired, query, filters). Sensitive fields are NOT returned. |
| `acp_health` | — | Diagnostic: gateway URL, server version, plugin version, MCP protocol version, indexed-corpus size with V1/V2 split, last fetch, ping latency. Cached 5 min. |

### Example v0.7.0 response fragments

`acp_find` result with saturation + pricePercentile:
```json
{
  "offeringName": "evaluate_defi_agent",
  "priceUsdc": 0.99,
  "saturation": { "nearDuplicateCount": 2, "categorySize": 47 },
  "pricePercentile": { "value": 62, "peerN": 18, "lowN": false }
}
```

`acp_search_agents` result:
```json
{
  "agentName": "TheMetaBot",
  "agentScore": 0.87,
  "marketplaces": ["v1", "v2"],
  "dominantMarketplace": "v2",
  "topOfferings": [
    { "offeringName": "acp_find", "priceUsdc": 0.05, "marketplaceVersion": "v2" }
  ],
  "topOfferingNames": ["acp_find", "agentReputation", "composeStack"]
}
```

`acp_browse_agent` cross-presence block:
```json
{
  "crossPresence": {
    "v1": { "offeringCount": 0 },
    "v2": { "offeringCount": 4 },
    "dominantMarketplace": "v2"
  }
}
```

`acp_today` pulse fields:
```json
{
  "windowStart": "2026-05-03T00:00:00Z",
  "partial": false,
  "newAgents": 3,
  "churnRate": 0.04,
  "cohortSurvival": null,
  "saturationMap": { "DeFi Evaluation": 0.42, "Wallet Intelligence": 0.28 }
}
```

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

### Docker

If you don't have Node 22+ on your machine, run via Docker. The image is published as `oliverpringle/acp-find-mcp` (and the `Dockerfile` ships in this folder for self-build).

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

The `-i` (interactive) flag is critical — MCP runs over stdio. Self-build:

```bash
git clone https://github.com/oliver-pringle/acp-find-plugin
cd acp-find-plugin/mcp-server
docker build -t acp-find-mcp .
docker run --rm -i acp-find-mcp
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

Compare these wallets: 0xabc..., 0xdef..., 0x123...
```

A 30-prompt cookbook grouped by intent (find / vet / compose / research / browse) lives in the [main repo README](https://github.com/oliver-pringle/acp-find-plugin#try-it--prompt-cookbook).

## Configuration

| Env var | Default | Notes |
|---|---|---|
| `ACP_API_URL` | `https://api.acp-metabot.dev` | Gateway base URL. Override only for local dev. |
| `ACP_API_KEY` | unset | Sent as `X-API-Key`. Only needed against a private/self-hosted gateway. |
| `ACP_VERBOSE` | unset | When set (or pass `--verbose` on argv), logs every gateway request/response to stderr. |
| `ACP_DISABLE_BOOT_BEACON` | unset | Set to any truthy value to skip the one-shot activation beacon sent on startup. See [Privacy & telemetry](#privacy--telemetry) below. |

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
   ▼ HTTPS, with 1-retry on 5xx
api.acp-metabot.dev (public gateway, rate-limited)
   │
   ▼ Internal HTTP
ACP_Metabot indexer + Voyage embeddings + Claude composer + chain-event scanner
   │
   ▼ SQLite vector index of every ACP marketplace offering
```

The index refreshes every 10 min from both **ACP V1** (`https://acpx.virtuals.io/`) and **ACP V2** (`https://api.acp.virtuals.io`). Results track live marketplace state across both versions within ~10 min.

## Privacy & telemetry

The public gateway at `api.acp-metabot.dev` logs the **client IP, the request path, and the request body** into a request-log table. The IP is used solely to enforce per-IP rate limits; logs are kept for operator metrics. There is no separate analytics provider, no user identifier, and no cross-request correlation beyond IP.

Starting with **v0.6.0**, the server fires **one** activation beacon to `POST /v1/plugin/boot` after handling the MCP `initialize` request. The beacon's body is empty; the only signal it adds is a single `(User-Agent, IP, timestamp)` row in the same request-log table — the same shape every other request already records. Its purpose is to let the operator distinguish "the npm tarball was downloaded" (catalogs, scanners, `npx -y` cache) from "the MCP server actually started under a real client". You can opt out by setting `ACP_DISABLE_BOOT_BEACON=1` — every other tool call works identically.

The MCP server adds **no other telemetry**. It only contacts the gateway you configure. If you point `ACP_API_URL` at your own self-hosted gateway, no traffic leaves your network.

## Requirements

- Node 22 or later (uses built-in `fetch`, `readline`, `AbortSignal.timeout`).
- Or run via Docker (above) — no Node install required.

## Source & contributing

Repo: [oliver-pringle/acp-find-plugin](https://github.com/oliver-pringle/acp-find-plugin) — issues and PRs welcome.

## License

MIT — see [LICENSE](LICENSE).
