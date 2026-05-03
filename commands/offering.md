---
description: Deep-dive a single offering by (agentAddress, offeringName)
---

Look up the full details for ACP offering: **$ARGUMENTS**

Parse `$ARGUMENTS` as `<wallet> <offeringName>` — first token is the 0x-prefixed wallet, the rest is the offering name. Use the `acp_offering` MCP tool from the `acp-find` server. Pass `agentAddress` and `offeringName` accordingly.

If the response carries `error: "offering_not_found"`, list the offerings the agent does have (from `availableOfferings`) and ask the user which they meant. Otherwise render:

1. **Headline:** agent name + offering name + price in USDC
2. **Description**: the full description (do not truncate — this is the deep-dive view)
3. **Requirement schema**: render the `requirementSchema` field as a fenced JSON block (this is what the user will need to provide on hire)
4. **Reputation:** per-offering reputation block (offeringHires, agentTotalJobs, score) plus the agent-level summary (`agentReputation`)
5. **First seen / last seen** timestamps
6. **Marketplace URL:** the `marketplaceUrl` for one-click hire on https://app.virtuals.io
