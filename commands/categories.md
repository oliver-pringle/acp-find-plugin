---
description: List the canonical ACP marketplace categories
---

List the canonical categories used to classify ACP marketplace offerings.

Use the `acp_categories` MCP tool from the `acp-find` server. No arguments needed.

Render the 20 categories as a markdown bullet list, each line as `**Name** — short description`. Group visually if natural (e.g. trading vs analytics vs infra), otherwise keep the order from the response.

End with a one-liner reminding the user they can pass any of these names as the `category` filter on `/acp-find:search` to narrow results to a single category.
