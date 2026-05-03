---
description: List the canonical ACP marketplace categories with offering counts
---

List the canonical categories used to classify ACP marketplace offerings.

Use the `acp_categories` MCP tool from the `acp-find` server. No arguments needed.

Render the categories as a markdown bullet list, each line as `**Name** — short description (N offerings)` where N is the `offeringCount` field. Sort by descending `offeringCount` so the densest categories surface first. Group visually if natural (e.g. trading vs analytics vs infra), otherwise keep the order.

End with a one-liner reminding the user they can pass any of these names as the `category` filter on `/acp-find:search` to narrow results.
