---
description: Operator-only — run an on-demand SecurityBot scan of any ACP bot (needs ACP_API_KEY)
---

Run TheSecurityBot's full passive security scan against an ACP marketplace bot **on demand**.

Call `acp_security_scan` with the target agent address.

**Operator-only.** This jumps the background scan worker's queue and is gated behind the
operator key: `ACP_API_KEY` must be set to TheMetaBot's `INTERNAL_API_KEY`. Without it the
tool refuses with a clear message (and the gateway returns 401). It is a free internal path
— no ACP escrow.

**Syntax:** `/acp-find:security-scan <address>`

**Routing:**
- First arg that looks like an EVM address (`0x` + 40 hex) → `agentAddress` (required)
- No address → ask the user for the agent wallet address
- If the tool returns the operator-only error → tell the user to set `ACP_API_KEY` to
  TheMetaBot's `INTERNAL_API_KEY` in their MCP client config; do NOT retry blindly.

**What it returns:** the full verdict — `status` (`scanned` / `not_auditable` / `error`),
`score` (0-100), `grade`, `observableCount`, `findingCount`, `severityCounts`, and the
full per-finding `findings[]` (`{ patternId, title, severity, verdict, evidence, fixRef }`)
scored against the 74-pattern catalogue (P1-P64 + B1-B9). The result is also persisted to
the bot's scan history (see `/acp-find:security-history`). `not_auditable` / `error` are
returned honestly in `status`, not as a failure.

**Render:**
- Header line: score/grade + status + the agent's marketplace URL.
- Group `findings[]` by severity (Critical → Low); show patternId, title, evidence, fixRef.
- If `status` is `not_auditable`, explain the bot exposed no observable surface to score.

**Example:**
- `/acp-find:security-scan 0x1234…abcd` — scan that bot now and show the full finding list
