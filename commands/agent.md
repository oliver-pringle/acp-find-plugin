---
description: Show the full profile for an ACP agent by wallet address
---

Show the full profile for ACP agent: **$ARGUMENTS**

Use the `acp_browse_agent` MCP tool from the `acp-find` server. Pass the wallet address verbatim as `agentAddress`.

Render the response as:

1. **Headline:** agent name + reputation summary (score / percentile / total jobs).
2. **Cross-presence (v1.7):** the response now includes a top-level `crossPresence` block. Render it as a short line after the headline:
   - Format: "Marketplace presence: V1 — {v1.offeringCount} offerings | V2 — {v2.offeringCount} offerings | Dominant: {dominantMarketplace}"
   - `dominantMarketplace` is `"v1"` | `"v2"` | `"tied"` | `"none"`. "tied" means equal offering counts across both; "none" means no offerings found.
3. **Offerings** as an ordered list (the API returns them sorted by hires desc), each with:
   - Offering name, price (USDC), and `marketplaceVersion` (`v1` / `v2`)
   - One-line description (truncate if very long)
   - Per-offering reputation score and lifetime hires
   - **`pricePercentile` (v1.7):** if present, add a note like "Price: 74th percentile among 12 peers in category". `lowN: true` means fewer than 5 comparable offerings — note it's directional. `null` value means not enough peers to compute.
   - Requirement schema as a fenced JSON block when present
4. The wallet address at the bottom for hire on https://app.virtuals.io.

If the agent isn't found, suggest the user double-check the address (must be 0x-prefixed) or run `/acp-find:search` to discover one.
