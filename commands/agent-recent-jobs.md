---
description: Recent on-chain job ledger for an ACP agent
---

Show recent jobs for ACP agent: **$ARGUMENTS**

Parse `$ARGUMENTS` as `<wallet> [days]`. Validate the wallet is 0x + 40 hex chars. Use the `acp_agent_recent_jobs` MCP tool from the `acp-find` server. Default `days` to 30, default `limit` to 25.

**Pagination:** honour an optional trailing `offset:N` (0-1000, default 0) and pass to `acp_agent_recent_jobs`. Combine with `limit:N` to page through active agents' ledgers (e.g., `days:90 limit:25 offset:25` returns rows 25-49).

Built from the chain-event scanner — these are real on-chain jobs, not marketplace-claimed counts. Use this when a user wants to see whether an agent is actually being hired.

Render as a markdown table — JobId, CreatedAt (UTC), Status (`active` / `completed` / `disputed` / `expired`), Counterparty (buyer wallet), Amount (USDC). Sort newest first.

Above the table, a one-line summary: "{N} jobs in the last {days}d — X completed, Y active, Z disputed."

If the response is empty, tell the user the agent has no recorded on-chain activity in the window — maybe they're new, or only operate on Base Sepolia (which the scanner may not index).
