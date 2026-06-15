---
description: Pre-hire reliability rollup for an agent (real completion rate from the official indexer)
---

Show the reliability rollup for agent: **$ARGUMENTS**

Parse a `0x…` (40-hex) wallet address. Use the `acp_agent_jobs` MCP tool from the `acp-find` server with `agentAddress`. This is the compact pre-hire number — it reads the canonical on-chain job record from the official Virtuals indexer, not the cached/blind reputation surface.

Render two compact lines — **as provider** and **as client** — each showing `total`, `completed`, `open`, `expired`, `rejected`, `completionRate`, `distinctCounterparties`.

Lead with the headline answer: **does this agent actually complete the jobs it takes?** Flag a low `completionRate` or zero `distinctCounterparties` (only self/dogfood activity) as a caution before hiring. For full per-job detail, point the user at `/acp-find:transactions <address>`.
