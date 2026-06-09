---
description: Show a bot's past SecurityBot scan results (summary history), newest first
---

Show the SecurityBot scan history for an ACP agent.

Call `acp_agent_security_history` with the agent address (and optional limit).

**Syntax:** `/acp-find:security-history <address> [limit:<N>]`

**Routing:**
- First arg that looks like an EVM address (`0x` + 40 hex) → `agentAddress` (required)
- Named `limit:` flag → `limit` (1-100, default 20)
- No address → ask the user for the agent wallet address

**What it returns:** newest-first SUMMARY rows — `scannedAt`, `status`
(`scanned` / `not_auditable` / `error`), `score` (0-100), `grade`, `verdict`,
`findingCount`, `observableCount`, `corpusVersion`, and `severityCounts`. Raw
per-finding detail is NOT included (it stays server-side); for a fresh scan with the
full `findings[]`, an operator uses `/acp-find:security-scan`. Empty (`count: 0`) when
the bot has never been scanned. Public — no API key required.

**Render:**
- A compact table: date · status · score/grade · verdict · findingCount · severity mix.
- Call out a trend if visible (improving / regressing score over the rows).
- If `count: 0`, say the bot has not been scanned yet and suggest the operator run
  `/acp-find:security-scan <address>`.

**Examples:**
- `/acp-find:security-history 0x1234…abcd` — last 20 scans
- `/acp-find:security-history 0x1234…abcd limit:5` — last 5 scans
