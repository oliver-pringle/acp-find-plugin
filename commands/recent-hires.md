---
description: Show offerings with the highest absolute hire-count growth in a window
---

Show ACP offerings most-hired in the last window: **$ARGUMENTS**

Use the `acp_recent_hires` MCP tool from the `acp-find` server. If the user gave a window in days, pass it as `days` (default 7). If they hinted at filters (price cap, chain, category, marketplace), pass them through.

**Pagination:** honour an optional trailing `offset:N` (0-1000, default 0) and pass to `acp_recent_hires`. Combine with `limit:N` to page through high-traffic windows (e.g., `days:30 limit:10 offset:20` returns rows 20-29).

Distinct from `/acp-find:today`, which mixes new launches and gainers. This surface is purely "what's getting hired right now" so users can see traction concentrating.

Render as a markdown table — Agent, Offering, Price (USDC), V (`marketplaceVersion`), Hires gained, Total hires, Wallet (linked to `marketplaceUrl`). Sort by `hireDelta` descending.

End with a one-liner highlighting the standout (largest delta) and noting what the user could do with it.
