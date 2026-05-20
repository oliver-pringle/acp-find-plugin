---
description: One-call pre-hire safety verdict — reputation + risk + arena + recent jobs in parallel
---

Verify wallet: **$ARGUMENTS**

Parse `$ARGUMENTS` for an EVM address. Honour optional trailing flags:
- `chain:base` or `chain:ethereum` (default `base`)
- `depth:lite` or `depth:full` (default `full`)

`depth:lite` skips the recentJobs leg (3 sub-calls instead of 4 — faster but you don't see how busy the agent is right now). Use `lite` when latency matters; `full` (the default) when you're about to make a hire decision.

Call `acp_agent_verify` with `{ walletAddress, chain, depth }`.

Render the response:

1. **Big headline** — `Verdict: <STRONG_BUY | OK | CAUTION | AVOID | UNKNOWN>` with an emoji marker:
   - ✅ STRONG_BUY
   - 👍 OK
   - ⚠️ CAUTION
   - 🛑 AVOID
   - ❓ UNKNOWN
2. **One-sentence summary:** the `headline` field verbatim.
3. **Four sub-blocks** (reputation / risk / arena / recentJobs) — each rendered compactly with their key score + source. Skip the recentJobs block cleanly when `depth: lite` (it'll be `null`).
4. **If any sub-block has `error`** — surface it inline so the user knows which dimension is contributing to a `CAUTION` or `UNKNOWN` verdict. Suggest the per-dimension slash command to retry that leg in isolation:
   - reputation error → `/acp-find:reputation <addr>`
   - risk error → `/acp-find:risk <addr>`
   - arena error → `/acp-find:arena <addr>`
   - recentJobs error → `/acp-find:agent-recent-jobs <addr>` (or the `acp_agent_recent_jobs` MCP tool)
5. **Bridge:** for `STRONG_BUY` or `OK`, surface the `marketplaceUrl` for one-click hire. For `CAUTION`, suggest `/acp-find:risk-deep <addr>` to see why. For `AVOID`, surface the dominant negative signal verbatim from the sub-blocks.

The verdict is rule-based (NOT LLM-judged) so it's deterministic and explainable. Rules:

- `STRONG_BUY` — reputation ≥ 80 AND risk ≥ 70 AND (recentJobs missing OR jobs30d ≥ 10)
- `OK` — reputation ≥ 60 AND risk ≥ 55
- `AVOID` — reputation < 40 AND risk < 40
- `CAUTION` — (catch-all positive) reputation ≥ 40 OR risk ≥ 40
- `UNKNOWN` — required dimension (reputation or risk) errored, OR fall-through (both 0/missing)

`acp_agent_verify` saves 4 client round-trips per pre-hire safety check by running the four endpoints in parallel server-side.
