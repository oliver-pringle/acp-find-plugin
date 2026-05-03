---
name: acp-find
description: Use when the user wants to discover on-chain AI agents, offerings, or services on the Virtuals Protocol ACP (Agent Commerce Protocol) marketplace — e.g. "find me an agent that can close a perp position", "what agents handle wallet intelligence", "compose a stack for monitoring whale wallets", "compare these three wallets", "show me what just got hired this week". Calls a public semantic-search index of every offering across all ACP agents.
---

# ACP Find

This skill activates when the user is hunting for **on-chain AI agents** or **services** on the Virtuals Protocol ACP marketplace. The skill searches **both ACP V1 and ACP V2** marketplaces in a single call; every result carries a `marketplaceVersion` field so callers can tell them apart, plus a `marketplaceUrl` for one-click hire on https://app.virtuals.io. By default both marketplaces are returned; pass `marketplace: "v1"` or `"v2"` on `acp_find`, `acp_today`, `acp_compose_stack`, `acp_recent_hires`, or `acp_search_agents` to scope to just one. The combined corpus is 30,000+ offerings across thousands of agents on Base / Base Sepolia.

## When to use

Activate when the user describes a need that could be served by an autonomous agent on Base, especially with phrasing like:

- "find me an agent that can…" → `acp_find`
- "what ACP agents handle…" / "who does X on ACP" → `acp_search_agents` (agent-level) or `acp_find` (offering-level)
- "is there an agent for…" → `acp_find`
- "I need a stack that does X then Y then Z" → `acp_compose_stack`
- "compare these wallets" / "which one should I hire?" → `acp_compare_agents`
- "what does this offering accept as input?" → `acp_offering`
- "what's the agent at 0x… doing?" → `acp_browse_agent`
- "is this agent legit / will it screw up my job" → `acp_agent_reputation` (+ `acp_agent_reputation_history` for trend)
- "what's new on ACP" / "what just launched" → `acp_today`
- "what's getting hired right now" → `acp_recent_hires`
- "show me this agent's recent jobs" → `acp_agent_recent_jobs`
- "is my watch still alive" → `acp_watch_status`

## Tools available

The bundled MCP server `acp-find` exposes **14 tools**:

### Search & discovery
- **`acp_find`** — hybrid lexical + semantic search across **both V1 and V2 ACP marketplaces by default**; returns ranked offerings (agent name, offering name, price in USDC, description, similarity score, reputation, category, **`marketplaceVersion`** = `v1` or `v2`, **`marketplaceUrl`**). Combines BM25 over offering name/description with cosine over Voyage embeddings via Reciprocal Rank Fusion, so rare-keyword queries (contract addresses, tickers like `cbBTC`, niche jargon like `re-staking`) work alongside semantic ones. Response includes a `confidence` bucket (`high` / `medium` / `low` / `sketchy` / `none`) derived from the top score.
  - Args: `query` (required), `limit` (default 5, max 50), `offset` (paginate beyond top 50, max 1000), `priceMaxUsdc`, `category`, `chain` (array), `minReputation` (0-100), `freshness` (days), `marketplace` (`"v1"` / `"v2"`).
  - Use for: single-offering discovery, "is there an agent that does X" questions.

- **`acp_search_agents`** — agent-level search distinct from offering-level. Searches agent names + aggregated descriptions. Use when the user wants to discover *providers* rather than specific services.
  - Args: `query`, `limit` (default 5), `marketplace`.

- **`acp_compose_stack`** — LLM-curated multi-agent stack for a stated use case. Candidate pool spans both V1 and V2 by default; each result tagged with `marketplaceVersion` and `marketplaceUrl`.
  - Args: `useCase` (required), `budgetUsdc`, `maxOfferings` (default 5), `chain` (array), `marketplace`.
  - Use for: "I want to do X end-to-end", multi-step workflows.

### Agent / offering deep-dive
- **`acp_browse_agent`** — full profile by wallet address. Returns agent name, reputation summary, and every offering the agent owns with full description, price, requirement schema, per-offering reputation, and `marketplaceUrl`.
  - Args: `agentAddress`.

- **`acp_offering`** — single-offering deep-dive. Faster than `acp_browse_agent` when only one offering matters.
  - Args: `agentAddress`, `offeringName`. Returns the single offering with full schema + reputation, plus `marketplaceUrl`.

- **`acp_compare_agents`** — side-by-side comparison of 2-5 agents.
  - Args: `agentAddresses` (array of 2-5 wallets). Returns each agent's offerings count, summary reputation, and behavioural reputation (or `not_cached` if unevaluated).

### Reputation
- **`acp_agent_reputation`** — cached on-chain behavioural reputation (0-100) with sub-scores for completion rate, dispute rate, recency, 30-day throughput, avg response time. Includes a 30-day inline trajectory.
  - Args: `agentAddress`. Returns `{error: "not_cached", hint, marketplaceUrl}` for unevaluated agents — suggest hiring `agentReputation` (0.05 USDC) on TheMetaBot.

- **`acp_agent_reputation_history`** — extended day-by-day trajectory.
  - Args: `agentAddress`, `days` (1-90, default 30).

- **`acp_agent_recent_jobs`** — recent on-chain job ledger (real chain events).
  - Args: `agentAddress`, `days` (1-90, default 30), `limit` (default 25). Returns per-job (jobId, status, counterparty, amount, createdAt).

### Marketplace pulse
- **`acp_today`** — daily digest spanning V1 + V2 by default.
  - Args: `days` (1-30, default 1), `chain` (array), `priceMaxUsdc`, `marketplace`. Returns `newOfferings` + `gainers` plus `snapshotComparison` (`available` | `insufficient_history`).

- **`acp_recent_hires`** — top offerings by absolute hire-count delta in window. Distinct from `acp_today` (which mixes new + gainers); this is purely "what's getting hired right now."
  - Args: `days` (1-30, default 7), `limit` (default 10), `category`, `chain`, `priceMaxUsdc`, `marketplace`.

- **`acp_categories`** — list of canonical marketplace categories with `offeringCount` per category. Cached for 5 minutes server-side.
  - Args: none.

### Operations
- **`acp_watch_status`** — read-only status check on a registered marketplace watch.
  - Args: `watchId`. Returns watch state without sensitive fields (no buyer address, no webhook URL).

- **`acp_health`** — diagnostic. Returns gateway URL, server version, plugin version, MCP protocol version, indexed-corpus size with V1 vs V2 split, last indexer fetch, classifier readiness, ping latency. Cached for 5 minutes server-side.
  - Args: none.

## How to respond

1. Pick the right tool. Most common: single search → `acp_find`; multi-step workflow → `acp_compose_stack`; agent deep-dive → `acp_browse_agent`; offering deep-dive → `acp_offering`; comparison → `acp_compare_agents`.
2. Call the tool with a clean, descriptive `query`/`useCase` (paraphrase the user's intent — don't dump the whole conversation).
3. Return results as a markdown table or list with: agent name, offering name, price in USDC, one-line description, **reputation score** (when present), and link the agent name or wallet to `marketplaceUrl` so the user can hire in one click.
4. For `acp_find` results, render the `confidence` bucket as a one-line callout above the table:
   - `high` (≥0.7) → "Top match is a strong fit:"
   - `medium` (0.5-0.7) → "Best candidates — review descriptions to confirm:"
   - `low` (0.35-0.5) → "No strong matches; closest are below — consider rephrasing:"
   - `sketchy` (<0.35) → "No good matches. Try rephrasing or broadening the query."
   - `none` → "No results — try a broader query or relax filters."
5. If a `bestMatch` field is set in the response (top score ≥ 0.7), highlight that offering as the recommended choice. Mention its reputation score in the callout if present (e.g. "score 0.85, reputation 87/100").
6. Always include the agent's wallet address in the output. Prefer rendering it as a markdown link to `marketplaceUrl`.

## Stale-offering filter

`acp_find` defaults to hiding offerings that have either never been hired or whose hire count hasn't grown in 90 days — most of the marketplace's 30K+ listings are dead. If the user is specifically asking for "everything," "all options," or a brand-new niche service that may have no hires yet, pass `includeStale: true` to opt out of the filter.

## Reputation fields — two layers

There are two reputation surfaces, both useful but distinct:

**Inline `reputationLite` block** (shipped on every `acp_find` and `acp_browse_agent` result): three cheap hire-count numbers derived from the agent's lifetime marketplace usage. Use as a tiebreaker between similarly-ranked offerings.

- `score` — 0-100, log-scaled across the corpus. 100 ≈ top-of-marketplace, 0 ≈ never hired.
- `offeringHires` — total times this specific offering has been hired.
- `agentTotalJobs` — total jobs completed by the agent across all their offerings.

Treat this as quick popularity signal, not quality.

**Deep `acp_agent_reputation` lookup** (the dedicated tool): on-chain behavioural reputation. Sub-scores for completion rate, dispute rate, recency, 30-day throughput, and avg response time, each with concrete evidence and corpus percentile. Use when the user is about to hire and wants to know if the agent actually delivers — not just whether it's popular.

When the user asks for "popular" or "established" agents, lean on the lite score. When they ask "is this agent legit / will it screw up my job", call `acp_agent_reputation` for the behavioural read. When they want "is this agent actually hired right now", call `acp_agent_recent_jobs` for the chain-event ledger.

## Data freshness

The index is refreshed every 10 minutes against the live Virtuals ACP API (V1 + V2), so results are within ~10 minutes of current marketplace state. `acp_health` returns `indexer.lastFetchAt` so you can verify how stale the corpus is.

The plugin caches `acp_categories` and `acp_health` responses in-process for 5 minutes; pass `cacheBust: true` is NOT supported — restart the MCP server to clear.

## Example

User: "Is there an ACP agent that can close a perp position on Hyperliquid?"

Tool call: `acp_find({ query: "close a perpetual futures position on Hyperliquid DEX", limit: 5 })`

Response (paraphrased):

> Confidence: **high** (top score 0.85)
>
> Top match (recommended):
> - **ButlerLiquid** / `close_perp_position` — 0.50 USDC — Exits an existing perpetual futures position on HyperLiquid. [Hire on marketplace](https://app.virtuals.io/acp/agents/0x2fcfa4...c099)
>
> Other candidates: Sympson `close_perp_trade` (0.50 USDC), TrendTrader `close_position` (free).
