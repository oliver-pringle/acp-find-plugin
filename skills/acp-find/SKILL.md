---
name: acp-find
description: Use when the user wants to discover on-chain AI agents, offerings, or services on the Virtuals Protocol ACP (Agent Commerce Protocol) marketplace — e.g. "find me an agent that can close a perp position", "what agents handle wallet intelligence", "compose a stack for monitoring whale wallets". Calls a public semantic-search index of every offering across all ACP agents.
---

# ACP Find

This skill activates when the user is hunting for **on-chain AI agents** or **services** on the Virtuals Protocol ACP marketplace. The marketplace currently has 30,000+ offerings across thousands of agents, and pre-indexed semantic search makes finding the right one trivial.

## When to use

Activate when the user describes a need that could be served by an autonomous agent on Base, especially with phrasing like:

- "find me an agent that can…"
- "what ACP agents handle…"
- "is there an agent for…"
- "I need a stack that does X then Y then Z"
- "what wallet intelligence agents are out there"

## Tools available

The bundled MCP server `acp-find` exposes:

- **`acp_find`** — semantic search; returns ranked offerings (agent name, offering name, price in USDC, description, similarity score, reputation).
  - Args: `query` (required), `limit` (default 5, max 50), `priceMaxUsdc` (optional cap).
  - Use for: single-offering discovery, "is there an agent that does X" questions.

- **`acp_compose_stack`** — LLM-curated multi-agent stack for a stated use case.
  - Args: `useCase` (required), `budgetUsdc` (optional total cap), `maxOfferings` (default 5).
  - Use for: "I want to do X end-to-end", "give me a workflow", multi-step requirements.

- **`acp_agent_reputation`** — direct reputation lookup for a single agent by wallet address.
  - Args: `agentAddress` (required), `offeringName` (optional — narrows to one offering).
  - Use for: vetting before hiring ("is this agent legit?"), comparing candidates after `acp_find`, or when the user pastes a wallet address and asks about it.

- **`acp_today`** — daily digest of the marketplace.
  - Args: `days` (optional, default 1, max 30) — lookback window in days.
  - Returns: `newOfferings` (just-launched), `gainers` (biggest hire-count growth in the window), and a `snapshotComparison` flag indicating whether comparison data is available yet.
  - Use for: "what's new on ACP", "trending ACP agents", "what just launched". On a brand-new deploy the gainers list may be empty until at least 2 days of snapshots have accumulated; the response's `snapshotComparison: "insufficient_history"` signals this.

## How to respond

1. Pick the right tool: single search → `acp_find`; multi-step workflow → `acp_compose_stack`.
2. Call the tool with a clean, descriptive `query`/`useCase` (paraphrase the user's intent — don't dump the whole conversation).
3. Return results as a markdown table or list with: agent name, offering name, price in USDC, one-line description, **reputation score** (when present).
4. If a `bestMatch` field is set in the response (semantic score ≥ 0.7), highlight it as the recommended choice. Mention its reputation score in the callout if present (e.g. "score 0.85, reputation 87/100").
5. Always include the agent's wallet address in the output so the user can hire the agent on https://app.virtuals.io or via an ACP buyer client.

## Stale-offering filter

`acp_find` defaults to hiding offerings that have either never been hired or whose hire count hasn't grown in 90 days — most of the marketplace's 30K+ listings are dead. If the user is specifically asking for "everything," "all options," or a brand-new niche service that may have no hires yet, pass `includeStale: true` to opt out of the filter.

## Reputation field

Each result may include a `reputation` block with three numbers derived from the agent's lifetime ACP usage:

- `score` — 0-100, log-scaled across the corpus. 100 ≈ top-of-marketplace, 0 ≈ never hired.
- `offeringHires` — total times this specific offering has been hired.
- `agentTotalJobs` — total jobs completed by the agent across all their offerings.

Treat the reputation score as a tiebreaker when two offerings have similar similarity scores: a `score: 60` offering that's been hired 250 times is usually a safer bet than a `score: 0` offering that's never been used. When the user asks for "popular" or "established" or "battle-tested" agents, lean toward higher reputation scores.

`reputation` is null only during the very first indexer cycle after a fresh deploy.

## Data freshness

The index is refreshed every 10 minutes against the live Virtuals ACP API, so results are within ~10 minutes of current marketplace state.

## Example

User: "Is there an ACP agent that can close a perp position on Hyperliquid?"

Tool call: `acp_find({ query: "close a perpetual futures position on Hyperliquid DEX", limit: 5 })`

Response (paraphrased):

> Top match (score 0.85, recommended):
> - **ButlerLiquid** / `close_perp_position` — 0.50 USDC — Exits an existing perpetual futures position on HyperLiquid. Wallet: `0x2fcfa4...c099`
>
> Other candidates: Sympson `close_perp_trade` (0.50 USDC), TrendTrader `close_position` (free).
