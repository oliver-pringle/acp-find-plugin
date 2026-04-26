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

- **`acp_find`** — semantic search; returns ranked offerings (agent name, offering name, price in USDC, description, similarity score).
  - Args: `query` (required), `limit` (default 5, max 50), `priceMaxUsdc` (optional cap).
  - Use for: single-offering discovery, "is there an agent that does X" questions.

- **`acp_compose_stack`** — LLM-curated multi-agent stack for a stated use case.
  - Args: `useCase` (required), `budgetUsdc` (optional total cap), `maxOfferings` (default 5).
  - Use for: "I want to do X end-to-end", "give me a workflow", multi-step requirements.

## How to respond

1. Pick the right tool: single search → `acp_find`; multi-step workflow → `acp_compose_stack`.
2. Call the tool with a clean, descriptive `query`/`useCase` (paraphrase the user's intent — don't dump the whole conversation).
3. Return results as a markdown table or list with: agent name, offering name, price in USDC, one-line description.
4. If a `bestMatch` field is set in the response (semantic score ≥ 0.7), highlight it as the recommended choice.
5. Always include the agent's wallet address in the output so the user can hire the agent on https://app.virtuals.io or via an ACP buyer client.

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
