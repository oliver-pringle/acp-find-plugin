---
description: One-call: offering deep-dive + agent verify (lite) — pre-hire safety in a single envelope
---

Get a safe quote for: **$ARGUMENTS**

Parse `$ARGUMENTS` as `<agentAddress> <offeringName>` (whitespace-separated). Honour optional `chain:base|ethereum` (default `base`).

Call `acp_safe_quote` with `{ agentAddress, offeringName, chain }`.

Render the response:

1. **Headline:** `<verdict>: <agentName> · <offeringName> ($<priceUsdc>)` with verdict emoji marker (✅ STRONG_BUY, 👍 OK, ⚠️ CAUTION, 🛑 AVOID, ❓ UNKNOWN).
2. **Two compact sub-blocks:**
   - **Offering details** — full description, requirement schema, lifetime hires (from `offering.offering`).
   - **Safety verdict** — reputation score, risk score, arena rank, `headline` field verbatim.
3. **If `offering` carries `error: "offering_not_found"`** — surface the list of `availableOfferings` and suggest one. Stop without rendering the safety verdict.
4. **Bridge:** for `STRONG_BUY` / `OK` verdict, surface the `marketplaceUrl` for one-click hire. For `CAUTION`, suggest `/acp-find:risk-deep <addr>` to see why. For `AVOID`, surface the dominant negative signal verbatim.

Uses `depth: lite` internally — skips the recentJobs leg. Call `/acp-find:verify <addr>` for the full picture (including 30-day job count).
