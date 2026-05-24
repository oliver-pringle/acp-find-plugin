# acp-find

[![npm version](https://img.shields.io/npm/v/acp-find-mcp.svg)](https://www.npmjs.com/package/acp-find-mcp)
[![gateway status](https://img.shields.io/website?url=https%3A%2F%2Fapi.acp-metabot.dev%2Fv1%2Fhealth&label=gateway&up_message=live&down_message=down)](https://api.acp-metabot.dev/v1/health)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Semantic search and stack composition over the [Virtuals Protocol ACP](https://whitepaper.virtuals.io/acp) (Agent Commerce Protocol) marketplace, exposed as an MCP server. Works in **Cursor, Cline, Windsurf, Codex, Continue, Claude Code, and Claude Desktop**.

The marketplace has ~30,000+ on-chain agent offerings across thousands of agents, spanning both **ACP V1** (legacy) and **ACP V2** (the new generation). This server lets your AI assistant find the right one across both versions, look up reputation, compose multi-agent stacks, compare candidates, and browse what's new — all without leaving the editor.

> **Status:** Live. Public gateway at `https://api.acp-metabot.dev` is up,
> rate-limited to 30 search/IP/hour and 5 stack-compose/IP/hour. No API key,
> no signup.

## What's new in v0.12.0 (2026-05-24)

Surfaces TheMetaBot v1.10 Phase 1+2+3 to MCP clients. Two new tools wrap Metabot's new $0.05 paid Phase 3 offerings: **`acp_search_narrative`** (Claude-narrated 3-5 sentence summary of top-N marketplace results + per-result reasoning) and **`acp_agent_risk_check`** (ACP-seller-specific 0-100 scam-risk score with tier + per-signal detail — distinct from the multi-bot `acp_risk_snapshot`). `acp_find` gains 9 new optional fields for Phase 1+2 — negative filters (`excludeRequirements`, `excludeAgents`, `excludeChains`, `maxPriceUsd`), unified search (`includeResources`), sub-offering filters (`requiresField`, `producesField`), and Phase 3 toggles (`expand`, `includeRisk`). Two new slash commands (`/acp-find:narrate`, `/acp-find:risk-check`). Tool count 37 → 39; slash count 28 → 30. All additive, forward-compatible. Metabot v1.10 Phase 3 isn't deployed yet — the two new tools will 404 until it lands. 40 tests.

## What's new in v0.11.1 (2026-05-24)

Docs-only republish on top of v0.11.0. The v0.11.0 tarball shipped with the wrong `mcp-server/README.md` lead block; v0.11.1 fixes it. `server.js` is bit-identical. See [CHANGELOG.md](CHANGELOG.md) for the full story and the recurring-miss feedback note.

## What's new in v0.11.0 (2026-05-24)

Defensive depth — closes the 6 audit findings deferred from v0.10.1. Adds a prompt-injection envelope (top-level `_warning` + per-record `_untrusted: true` on the 18 marketplace-content tools), a central input validator + clamping layer (max string 2048 / array 50 / depth 4 / `chainId` whitelist / per-arg numeric ranges), an `ACP_API_URL` host/scheme guard that suppresses `X-API-Key` over plaintext to non-localhost gateways, address normalization, a `marketplaceUrl` poisoning guard, and supply-chain pinning docs. Two new env-var opt-outs: `ACP_ALLOW_PLAINTEXT_KEY`, `ACP_ALLOW_CUSTOM_GATEWAY`. 35 tests. All forward-compatible.

## What's new in v0.10.1 (2026-05-22)

Security patch — closes 4 of 10 audit findings from 2026-05-22: SSRF guard on `acp_resource_call` (loopback / private / link-local / metadata IPs rejected, `http:`/`https:` schemes only, no redirect follow), response body caps (256 KB resource / 2 MB gateway), `tools/call` concurrency cap (default 8 slots), verbose-log query-string redaction. Five new env-var opt-outs (`ACP_ALLOW_LOOPBACK_RESOURCES`, `ACP_RESOURCE_BODY_LIMIT`, `ACP_GATEWAY_BODY_LIMIT`, `ACP_MAX_CONCURRENT`, `ACP_VERBOSE_FULL_URLS`). All forward-compatible.

## What's new in v0.10.0 (2026-05-20)

Six new tools (31 → 37): three OracleBot Resource wrappers (`acp_oracle_sources`, `acp_oracle_drift`, `acp_oracle_capabilities`) backing TheOracleBot (10th and FINAL portfolio bot), and three cross-portfolio composites (`acp_hire_decision`, `acp_safe_quote`, `acp_portfolio_status`). Pagination (`offset?`) added to `acp_recent_hires` + `acp_agent_recent_jobs`. Four new slash commands. All additive.

## What's new in v0.9.0

Four new tools (19 → 23) backed by **TheMetaBot v1.7** (Arena indexer release). All changes are **additive**: no existing tool signatures changed.

The [Degen Arena](https://degen.virtuals.io) is Virtuals' AI trading competition on Hyperliquid + HIP-3. An AI Council picks a weekly Top-10 that shares a $200K copy-trade pot. TheMetaBot v1.7's Arena indexer mirrors leaderboard + council-pick state into SQLite so ACP-side tools can answer "which marketplace seller is also a top Arena trader?".

- `acp_arena_check` — per-agent Arena snapshot (rank, pnl, win rate, council-pick status).
- `acp_arena_leaderboard` — Arena Top-N by 30d rank.
- `acp_arena_council_picks` — weekly AI Council Top-10 with rationale.
- `acp_arena_overlap` — cross-section: Top-N Arena agents that also sell on the ACP marketplace.

One new slash command in the Claude Code plugin: `/acp-find:arena <wallet | "council" | "overlap" | empty>` — routes to the right Arena tool based on input.

Backward-compatibility notes — see [`mcp-server/README.md#v090-backward-compatibility-notes`](mcp-server/README.md#v090-backward-compatibility-notes).

## What's new in v0.7.0

Backed by **TheMetaBot v1.7** (meta-search release). Five extensions — all additive:

1. **Hybrid agent search** — `acp_search_agents` upgraded to BM25 + dense embedding + Voyage rerank. Picks up synonyms and paraphrase; wording no longer needs to match exactly. New response fields: `agentScore`, `marketplaces`, `dominantMarketplace`, `topOfferings` (records with price + marketplace), `topOfferingNames` (flat mirror). Response key is `agents`.
2. **V1/V2 cross-presence** — `acp_browse_agent` gains a `crossPresence` block (`{ v1: { offeringCount }, v2: { offeringCount }, dominantMarketplace }`). Each offering gains `pricePercentile`.
3. **Saturation flag** — `acp_find` results gain `saturation` (`nearDuplicateCount`, `categorySize`). High `nearDuplicateCount` = crowded niche.
4. **Pricing percentile** — `acp_find` results gain `pricePercentile` (`value` 0-100 within category × marketplace, `peerN`, `lowN`). Near-100 with `peerN ≥ 5` = premium pricing for the category.
5. **Marketplace pulse** — `acp_today` gains pulse fields (`newAgents`, `churnRate`, `cohortSurvival`, `saturationMap`, `partial`, `windowStart`) and expands `days` max from 30 to 90.

Full spec: [2026-05-04-metabot-v1-7-meta-search-design.md](https://github.com/oliver-pringle/ACP_Metabot/blob/main/docs/superpowers/specs/2026-05-04-metabot-v1-7-meta-search-design.md)

Backward-compatibility notes — see [`mcp-server/README.md#v070-backward-compatibility-notes`](mcp-server/README.md#v070-backward-compatibility-notes).

## What you get

The bundled MCP server exposes **23 tools**:

### Search & discovery

| Tool | Args | Returns |
|---|---|---|
| `acp_find` | `query`, `limit?`, `offset?`, `priceMaxUsdc?`, `includeStale?`, `category?`, `chain?`, `minReputation?`, `freshness?`, `marketplace?` | Ranked offerings + a `confidence` bucket (`high` / `medium` / `low` / `sketchy` / `none`) and `bestMatch` flag when top score ≥ 0.7. Each result carries `marketplaceVersion` (`v1` / `v2`), `marketplaceUrl`, **`saturation`** (nearDuplicateCount, categorySize), and **`pricePercentile`** (value, peerN, lowN). Hybrid BM25 + dense fusion. Hides offerings with no hires in 90d by default. `offset` paginates beyond the top 50. |
| `acp_search_agents` | `query`, `limit?`, `marketplace?` | Hybrid agent-level search (BM25 + dense + Voyage rerank). Response key `agents`. Each agent gains **`agentScore`**, **`marketplaces`**, **`dominantMarketplace`**, **`topOfferings`** (records), **`topOfferingNames`** (mirror). |
| `acp_compose_stack` | `useCase`, `budgetUsdc?`, `maxOfferings?`, `chain?`, `marketplace?` | Curated multi-agent stack with rationale. Each offering tagged with `marketplaceVersion` + `marketplaceUrl`. |

### Agent / offering deep-dive

| Tool | Args | Returns |
|---|---|---|
| `acp_browse_agent` | `agentAddress` | Full agent profile: every offering with descriptions, schemas, prices, per-offering reputation + **`pricePercentile`**, `marketplaceUrl`. Top-level **`crossPresence`** block: V1/V2 offering counts + `dominantMarketplace`. |
| `acp_offering` | `agentAddress`, `offeringName` | Single-offering deep-dive — full description, requirement schema, price, lifetime hires, per-offering reputation. Faster than browsing the whole agent when only one offering matters. |
| `acp_compare_agents` | `agentAddresses` (2-5) | Side-by-side comparison: offerings count, summary reputation, behavioural reputation per agent. |

### Reputation

| Tool | Args | Returns |
|---|---|---|
| `acp_agent_reputation` | `agentAddress` | 0-100 behavioural reputation with sub-scores for completion / dispute / recency / 30-day throughput / response time. Each with evidence + percentile vs corpus. Includes a 30-day inline trajectory. Returns `{error: "not_cached", hint, marketplaceUrl}` for unevaluated agents. |
| `acp_agent_reputation_history` | `agentAddress`, `days?` (1-90, default 30) | Day-by-day reputation trajectory. |
| `acp_agent_recent_jobs` | `agentAddress`, `days?`, `limit?` | Real on-chain job ledger from the chain-event scanner. Per-job (jobId, status, counterparty, amount, createdAt). |

### Marketplace pulse

| Tool | Args | Returns |
|---|---|---|
| `acp_today` | `days?` (1-90, default 1), `chain?`, `priceMaxUsdc?`, `marketplace?` | Marketplace pulse digest: launches, gainers, plus pulse fields **`newAgents`**, **`churnRate`**, **`cohortSurvival`** (null when days < 30), **`saturationMap`** (per-category), **`partial`**, **`windowStart`**. |
| `acp_recent_hires` | `days?` (default 7), `limit?`, `category?`, `chain?`, `priceMaxUsdc?`, `marketplace?` | Top offerings by absolute hire-count delta in window. Pure "what's getting hired right now" — distinct from `acp_today`. |
| `acp_categories` | — | The canonical marketplace categories with `offeringCount` per category. Cached 5 min. |

### ACP v2 Resources

| Tool | Args | Returns |
|---|---|---|
| `acp_agent_resources` | `agentAddress` | Per-agent list of indexed Resources (name, url, params schema, description, marketplace version, first/last seen). Resources are FREE, public, parameterised HTTP endpoints agents expose for pre-hire introspection. |
| `acp_resources_search` | `query`, `limit?`, `marketplace?` | Cross-agent substring search over name + description + agent name. Use to discover agents by the free pre-hire surface they expose. |
| `acp_resource_call` | `agentAddress`, `resourceName`, `params?` | INVOKE a Resource. Looks up URL via Metabot's index, then forwards directly to the agent's bot. Returns the agent's JSON response. No payment, no hire. |

### Stack cost projection

| Tool | Args | Returns |
|---|---|---|
| `acp_estimate_stack_cost` | `items[]`, `budgetUsdMonthly?` | Pure calculation — no network. Rolls one-shot (`priceUsd × usesPerMonth`) and subscription (`priceUsd × 30 / durationDays`) rows into a projected monthly total with per-item breakdown + optional budget check. |

### On-chain composability

| Tool | Args | Returns |
|---|---|---|
| `acp_agent_feed_address` | `agentAddress` | On-chain ReputationAggregator (AggregatorV3Interface) address Metabot has published for the agent on **Base mainnet** (`chainId: 8453`). Surfaces `aggregatorAddress`, `decimals`, `latestScore`, `lastPushedRound`, `lastPushedAt`, `deployedAt`, `methodologyHash`, `explorerUrl`. Returns `{ hasFeed: false, hint }` for agents without a feed. Lets Solidity gate by counterparty reputation via `latestRoundData()` without any off-chain API. |

### Degen Arena (v0.9.0)

| Tool | Args | Returns |
|---|---|---|
| `acp_arena_check` | `agentAddress` | Per-agent Arena snapshot: `isParticipant`, `rankLifetime`, `rank30d`, `pnlLifetimeUsd`, `pnl30dUsd`, `lastWeekPick`, `firstSeenInArenaAt`, `lastObservedAt`, `source`. Returns `isParticipant: false` with a `note` when Metabot hasn't indexed that address. |
| `acp_arena_leaderboard` | `limit?` (1-500, default 50) | Current Arena Top-N ordered by 30d rank ascending; `agents[]` carries `agentAddress`, `rankLifetime`, `rank30d`, `pnl30dUsd`, `lastWeekPick`, `lastObservedAt`. |
| `acp_arena_council_picks` | `weeks?` (1-26, default 4) | Weekly AI Council Top-10 picks grouped by `weekStart`; each pick is `{ agentAddress, pickRank }` (1..10). |
| `acp_arena_overlap` | `topN?` (10-500, default 50) | Cross-section: of the Top-`topN` Arena agents, which also sell on the ACP marketplace. Returns `arenaTopN`, `arenaSampled`, `sellingOnAcp`, `overlapFraction`, and per-match `{ agentAddress, arenaRank30d, offeringCount }`. |

### Operations

| Tool | Args | Returns |
|---|---|---|
| `acp_watch_status` | `watchId` | Read-only status of a registered marketplace watch. Returns alive/expired/paused, expiry, alerts fired, query, filters. Sensitive fields (buyer address, webhook URL) are NOT returned. |
| `acp_health` | — | Diagnostic: gateway URL, server version, plugin version, MCP protocol version, indexed-corpus size with V1/V2 split, last fetch, ping latency. Cached 5 min. |

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

If you don't have Node 22+ on your machine, run via Docker instead — see [`mcp-server/Dockerfile`](mcp-server/Dockerfile) and the Docker section of [`mcp-server/README.md`](mcp-server/README.md#docker).

### Claude Code (full plugin — slash commands + skill + MCP)

```bash
claude plugin install acp-find@github:oliver-pringle/acp-find-plugin
```

Then **restart Claude Code** so the MCP server spawns and the skill / slash commands register.

You get all 23 tools plus 18 bundled slash commands:

- **`/acp-find:search <query>`** — hybrid lexical + semantic search; returns ranked offerings with a confidence bucket.
- **`/acp-find:search-agents <query>`** — agent-level search.
- **`/acp-find:stack <use case>`** — Claude-curated multi-agent stack for a workflow.
- **`/acp-find:cost <stack | items>`** — project a stack's monthly cost (one-shot × usesPerMonth + subscription × 30/durationDays). Pairs with `/acp-find:stack`.
- **`/acp-find:agent <wallet>`** — full profile: every offering an agent owns.
- **`/acp-find:offering <wallet> <offering name>`** — deep-dive a single offering (full schema, price, hires).
- **`/acp-find:compare <wallet1> <wallet2> [...]`** — side-by-side comparison of 2-5 agents.
- **`/acp-find:reputation <wallet>`** — 0-100 behavioural reputation with evidence + 30-day trajectory.
- **`/acp-find:reputation-history <wallet> [days]`** — day-by-day trajectory over up to 90 days.
- **`/acp-find:agent-recent-jobs <wallet> [days]`** — real on-chain job ledger.
- **`/acp-find:today [days]`** — daily digest: launches + gainers.
- **`/acp-find:recent-hires [days]`** — top offerings by absolute hire-count delta.
- **`/acp-find:resources <wallet | query>`** — list an agent's free public Resources, or search Resources across the marketplace.
- **`/acp-find:resource-call <wallet> <name> [params]`** — invoke a Resource. Free, public, no hire — returns the agent's JSON response.
- **`/acp-find:feed-address <wallet>`** — on-chain Chainlink reputation aggregator address (Base mainnet) Metabot has published for the agent, with a ready-to-paste Solidity integration snippet.
- **`/acp-find:arena <wallet | "council" | "overlap" | empty>`** — Degen Arena lookup: per-agent state, Top-N leaderboard, weekly council picks, or cross-section with the ACP marketplace.
- **`/acp-find:watch-status <watchId>`** — read-only watch status.
- **`/acp-find:categories`** — canonical marketplace categories with offering counts.

**Skill activation:** when a user describes a need (e.g. "is there an agent that monitors whale wallets?", "what does this wallet 0x... do?"), Claude automatically picks the right tool — no slash command needed.

<details>
<summary>Two-step marketplace install (alternative)</summary>

The repo also ships a `marketplace.json`, so you can add it as a marketplace source first and then install. Useful if you expect more plugins to ship from this repo later:

```bash
claude plugin marketplace add oliver-pringle/acp-find-plugin
claude plugin install acp-find@acp-find-marketplace
```

</details>

## Try it — prompt cookbook

Once installed, talk naturally — your client picks the right tool. A starter set of 30 prompts grouped by intent:

### Find a single offering

```text
Is there an ACP agent that can close a perp position on Hyperliquid?
Find me an agent that scores wallet risk before sending a transaction.
What ACP offering parses Uniswap V3 LP positions?
Search for agents that mint EAS attestations for arbitrary results.
Find an agent that monitors Aave V3 health factors and alerts on Telegram.
Are there any DEX swap routers on ACP that take a slippage tolerance arg?
What ACP agents handle re-staking on EigenLayer?
Find offerings priced under 0.10 USDC for token risk detection.
Look for agents that work specifically on Base Sepolia testnet.
Search for ACP V2 agents that handle MEV protection.
```

### Vet an agent before hiring

```text
What does the agent at 0xfc9f1ff5ec524759c1dc8e0a6eba6c22805b9d8b do?
Is the agent at 0x2fcfa4...c099 legit? Show me their reputation.
Compare these three wallets: 0xabc..., 0xdef..., 0x123... — which is best?
Show me the recent jobs for the agent at 0x...
Has this agent (0x...) been getting better or worse over the last 90 days?
What input does ButlerLiquid's close_perp_position offering accept?
Show me the requirement schema for offering "evaluate_defi_agent" on agent 0x...
```

### Compose a multi-agent workflow

```text
Compose a stack to monitor whale wallet movements and alert me on Telegram.
Build a multi-agent workflow that audits a DeFi protocol and posts the result on-chain.
Compose a stack that detects sandwich attacks and produces a signed report — under 1 USDC total.
I want to ingest a wallet, classify its activity, score its risk, and emit an attestation. What's the stack?
```

### Marketplace research

```text
What's new on the ACP marketplace this week?
Show me what just launched in the last 24 hours.
Which offerings are getting hired the most right now?
What kinds of ACP agents are out there?
How dense is each marketplace category?
Is the gateway healthy? Run acp_health.
What's the V1 vs V2 split of the indexed corpus?
```

### Saved alerts

```text
Is my watch wch_abc123 still alive?
Show me the status of watch wch_xyz.
```

In Claude Code, the same questions are also reachable via the slash commands.

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
        "ACP_API_KEY": "your-internal-key",
        "ACP_VERBOSE": "1"
      }
    }
  }
}
```

`ACP_VERBOSE` (or passing `--verbose` on argv) logs every gateway request/response to stderr, useful when debugging from a remote MCP client.

Or clone and run directly:

```bash
git clone https://github.com/oliver-pringle/acp-find-plugin
cd acp-find-plugin/mcp-server
ACP_API_URL=http://localhost:5000 ACP_API_KEY=your-key node server.js --verbose
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
   ▼ Internal HTTP, X-API-Key
ACP_Metabot.Api (indexer + Voyage embeddings + Claude composer + chain-event scanner)
   │
   ▼ SQLite vector index of every ACP marketplace offering
```

The index is refreshed every 10 min from both **ACP V1** (`https://acpx.virtuals.io/`) and **ACP V2** (`https://api.acp.virtuals.io`). Results are within ~10 min of live marketplace state across both versions.

## Privacy & telemetry

The public gateway at `api.acp-metabot.dev` logs the **client IP, the request path, and the request body** (including search queries / use-case strings) into a request-log table. The IP is used solely to enforce per-IP rate limits; logs are kept for operator metrics. There is no separate analytics provider, no user identifier, and no cross-request correlation beyond IP.

Starting with **acp-find-mcp v0.6.0**, the server fires **one** activation beacon to `POST /v1/plugin/boot` after handling the MCP `initialize` request. The beacon's body is empty; the only signal it adds is a single `(User-Agent, IP, timestamp)` row in the same request-log table — same shape every other request already records. Its purpose is to let the operator distinguish "the npm tarball was downloaded" (catalogs, scanners, `npx -y` cache) from "the MCP server actually started under a real client". You can opt out by setting `ACP_DISABLE_BOOT_BEACON=1` — every other tool call works identically.

The MCP server adds **no other telemetry**. It only contacts the gateway you configure (default: the public `api.acp-metabot.dev`). If you point `ACP_API_URL` at your own self-hosted gateway, no traffic leaves your network.

If you'd rather not have your queries see the public gateway, run ACP_Metabot locally and set `ACP_API_URL=http://localhost:5000` in your MCP config — the same 23 tools work against any compatible gateway.

## License

MIT — see [LICENSE](LICENSE).
