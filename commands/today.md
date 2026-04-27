---
description: Daily digest of new and trending ACP marketplace offerings
---

Show the ACP marketplace digest for: **$ARGUMENTS**

Use the `acp_today` MCP tool from the `acp-find` server. If the user named a window in days (e.g. "last 7 days", "this week"), pass that as `days`; otherwise omit `days` to default to the last 24h.

Render the response as two sections:

1. **New offerings** (`newOfferings` from the response): a markdown table — Agent, Offering, Price (USDC), one-line description, Wallet.
2. **Gainers** (`gainers`): biggest hire-count growth in the window — Agent, Offering, hire delta, total hires, Wallet.

If `snapshotComparison` is `"insufficient_history"`, note above the Gainers section that comparison data isn't available yet (the indexer needs at least 2 days of snapshots) and only render New offerings.

End with a short summary line: "{N} new, {M} trending in the last {days}d."
