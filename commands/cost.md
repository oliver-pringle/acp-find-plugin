---
description: Estimate the monthly cost of a stack of ACP offerings (one-shot + subscription)
---

Estimate monthly cost for: **$ARGUMENTS**

Use this AFTER `/acp-find:stack` (or `acp_compose_stack`) to roll up the total monthly burn of a stack, or when the user has hand-picked offerings and asks "what does this cost me per month?".

Map `$ARGUMENTS` to inputs:

- If it looks like a JSON object with an `items` array, pass it through verbatim as the `acp_estimate_stack_cost` arguments.
- If it references a prior `composeStack` response (e.g. "the stack you just generated" or a pasted JSON snippet), extract each offering's `priceUsd`, `priceType`, and any subscription `durationDays` into the `items` array.
- If it's a free-text question ("how much would 3× search per day cost"), construct the `items` array yourself with reasonable `usesPerMonth` and ask the user to confirm before calling.
- If the user includes a budget like "under $50/mo", set `budgetUsdMonthly: 50`.

Call `acp_estimate_stack_cost` with the constructed `items` and optional `budgetUsdMonthly`.

Render the response:

1. **Headline:** `Projected monthly cost: $X.XX [/ $Y.YY budget — withinBudget ✓ | overBudget by $Z.ZZ]`
2. **Breakdown** as a small markdown table:

   | Offering | Model | Monthly |
   |---|---|---|
   | search (one-shot) | $0.01/call × 100 uses | $1.00 |
   | macro_treasury (subscription) | $50/30d | $50.00 |

3. **Notes from the tool** (the `notes` array) so the user knows how `usesPerMonth` and `durationDays` map to the projection. If any one-shot row used the default `usesPerMonth=1`, suggest the user supply a real estimate for more accuracy.
4. If `budgetUsdMonthly` was set and the stack is over budget, suggest the cheapest item(s) to cut, or recommend dropping `usesPerMonth` on the most expensive one-shot.

This is calculation-only — no marketplace fetch, no hire. Pure projection.
