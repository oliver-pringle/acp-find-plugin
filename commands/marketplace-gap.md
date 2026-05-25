---
description: Find underserved ACP marketplace niches by opportunityScore — "where should I build a new bot?"
---

Find marketplace gaps for: **$ARGUMENTS**

Parse `$ARGUMENTS` for:
- An optional category name matching the `acp_categories` enum (case-insensitive). If `$ARGUMENTS` starts with a category-looking string, pass it as `category`.
- An optional `marketplace` slice — accept BOTH a positional keyword and a named flag (the named flag wins on conflict):
  - Positional keyword: a standalone `v1`, `v2`, or `both` token anywhere in the args (case-insensitive). These three tokens are RESERVED — never parse them as part of a category name.
  - Named flag: `marketplace:v1`, `marketplace:v2`, or `marketplace:both`.
  - Omitted: don't pass the field; the C# endpoint defaults to `"v2"` (BC shift since v0.12.1 — pre-v0.12.1 default was `"both"`).
- An optional trailing `limit:N` (1-20, default 5).

Examples:
- `/acp-find:marketplace-gap` → `{}` (defaults to v2)
- `/acp-find:marketplace-gap both` → `{ marketplace: "both" }`
- `/acp-find:marketplace-gap v1 limit:10` → `{ marketplace: "v1", limit: 10 }`
- `/acp-find:marketplace-gap "Trading Bots" v2 limit:10` → `{ category: "Trading Bots", marketplace: "v2", limit: 10 }`
- `/acp-find:marketplace-gap "Trading Bots" both marketplace:v2` → `{ category: "Trading Bots", marketplace: "v2" }` (flag overrides keyword)

Call `acp_marketplace_gap` with `{ category?, limit?, marketplace? }`.

Render the response:

1. **Headline:** `Top <limit> marketplace opportunities[ in <category>]` (e.g. `Top 5 marketplace opportunities` or `Top 3 opportunities in Trading Bots`).
2. **Sub-headline:** `Marketplace: <marketplace> (<denominator description>)`. For `v2` add ` — new default 2026-05-25` for the first month post-release so users notice the BC shift. Use these descriptions:
   - `v1` → `(V1 acpx.virtuals.io legacy pool)`
   - `v2` → `(V2 api.acp.virtuals.io modern pool — where new ACP-v2 bots deploy)`
   - `both` → `(combined V1+V2 saturation — pre-v0.12.1 default)`
3. **Markdown table** — Category, Description (truncated to ~80 chars), Total offerings, Saturated %, Opportunity score, Recommendation tag.
4. **Highlight** rows whose `recommendationTag` is `niche_underserved` or `medium_volume_emerging` — these are the "build here" niches. Rows tagged `saturated_avoid` are the "don't build here" signal.
5. **Note** — if `response.note` is non-null, render it as a callout block. The two paths today: `"no <marketplace> offerings in current corpus snapshot"` (slice empty) and `"saturationMap not yet computed — indexer has not run a full embed cycle since boot"` (cold-boot).
6. **Footnote** the `computedAt` timestamp so the user knows when the snapshot was last computed.
7. **Bridge:** if the user wants to drill into a single category, suggest `acp_categories` first to list valid names, then `acp_find category:<name>` to see existing offerings in the niche. If they're surveying V2-only and want to compare against the combined view, suggest re-running with `both`.

`acp_marketplace_gap` is a free pass-through to the same endpoint that backs TheMetaBot's $0.30 marketplaceGap offering on the marketplace.

The five `recommendationTag` values, ordered by build-here desirability:
- `niche_underserved` — high opportunityScore, few competitors. Best bet for a new bot.
- `medium_volume_emerging` — moderate volume, density still climbing. Good window.
- `balanced` — supply roughly matches demand. Build only with a sharper differentiator.
- `high_volume_low_density` — lots of demand but few sellers. May be a gold rush — investigate before building.
- `saturated_avoid` — supply is already overshooting demand. Don't build here unless you have a 10× wedge.

**Note on V2-only thresholds:** the recommendationTag thresholds are global. When `marketplace="v2"` is selected, most categories will tag as `niche_underserved` or `balanced` because V2 has lower per-category density than the combined corpus. Use opportunityScore as the primary ranking signal when comparing V2 rows; reserve the tag as a tiebreaker.
