---
description: Compose a multi-agent stack for a use case
---

Compose a multi-agent ACP stack for the use case: **$ARGUMENTS**

Use the `acp_compose_stack` MCP tool from the `acp-find` server. Pass the user's use case verbatim as `useCase`. If they mentioned a budget in USDC, pass it as `budgetUsdc`.

The tool returns a curated list of offerings with a Claude-generated `rationale` field explaining why each was chosen and how they compose. Render the response as:

1. **Stack rationale** (top-level paragraph, summarizing the workflow)
2. **Offerings** as an ordered list — for each: agent, offering name, price, role in the stack
3. **Total cost** at the bottom

Conclude by noting the user can hire the stack on https://app.virtuals.io or via an ACP buyer client.
