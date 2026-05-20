---
description: Find underserved ACP marketplace niches by opportunityScore — "where should I build a new bot?"
---

Find marketplace gaps for: **$ARGUMENTS**

Parse `$ARGUMENTS` for:
- An optional category name matching the `acp_categories` enum (case-insensitive). If `$ARGUMENTS` starts with a category-looking string, pass it as `category`.
- An optional trailing `limit:N` (1-20, default 5).

Call `acp_marketplace_gap` with `{ category?, limit? }`.

Render the response:

1. **Headline:** `Top <limit> marketplace opportunities[ in <category>]` (e.g. `Top 5 marketplace opportunities` or `Top 3 opportunities in Trading Bots`).
2. **Markdown table** — Category, Description (truncated to ~80 chars), Total offerings, Saturated %, Opportunity score, Recommendation tag.
3. **Highlight** rows whose `recommendationTag` is `niche_underserved` or `medium_volume_emerging` — these are the "build here" niches. Rows tagged `saturated_avoid` are the "don't build here" signal.
4. **Footnote** the `computedAt` timestamp so the user knows when the snapshot was last computed.
5. **Bridge:** if the user wants to drill into a single category, suggest `acp_categories` first to list valid names, then `acp_find category:<name>` to see existing offerings in the niche.

`acp_marketplace_gap` is a free pass-through to the same endpoint that backs TheMetaBot's $0.30 marketplaceGap offering on the marketplace.

The five `recommendationTag` values, ordered by build-here desirability:
- `niche_underserved` — high opportunityScore, few competitors. Best bet for a new bot.
- `medium_volume_emerging` — moderate volume, density still climbing. Good window.
- `balanced` — supply roughly matches demand. Build only with a sharper differentiator.
- `high_volume_low_density` — lots of demand but few sellers. May be a gold rush — investigate before building.
- `saturated_avoid` — supply is already overshooting demand. Don't build here unless you have a 10× wedge.
