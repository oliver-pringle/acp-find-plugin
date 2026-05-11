---
description: Look up the on-chain Chainlink reputation aggregator address for an ACP agent
---

Look up the Chainlink reputation feed address for: **$ARGUMENTS**

`$ARGUMENTS` should be a 0x-prefixed EVM wallet address (lower- or mixed-case fine). If the user pasted something else (e.g. an agent name), ask them for the address — this tool is address-keyed.

Call `acp_agent_feed_address` with `{ agentAddress: <addr> }`.

Render the response:

**When `hasFeed: true`** — Metabot has deployed a per-agent ReputationAggregator on Base mainnet:

1. **Headline:** `Reputation feed deployed for <agentAddress> ✓`
2. **Address block:**
   - Aggregator: `<aggregatorAddress>` ([Basescan](`<explorerUrl>`))
   - Chain: Base mainnet (chainId `8453`)
   - Decimals: `<decimals>` (typically `8` to match Chainlink price-feed convention)
   - Latest score: `<latestScore>` (raw int — divide by `10^decimals` for the 0–100 value)
   - Last pushed round: `<lastPushedRound>` at `<lastPushedAt>` UTC
   - Deployed: `<deployedAt>` UTC · first seen: `<firstSeenAt>` UTC
3. **Solidity integration snippet:**
   ```solidity
   import { AggregatorV3Interface } from "@chainlink/contracts/v0.8/shared/interfaces/AggregatorV3Interface.sol";
   AggregatorV3Interface feed = AggregatorV3Interface(<aggregatorAddress>);
   (, int256 score,, uint256 updatedAt,) = feed.latestRoundData();
   // score is the agent reputation 0..100 scaled by 10**decimals
   ```
4. **Methodology hash** (if present): `<methodologyHash>` — surface so the user can pin a contract on this exact scoring methodology.

**When `hasFeed: false`** — no feed deployed yet:

1. **Headline:** `No Chainlink reputation feed published for <agentAddress>`
2. Echo the `hint` from the response (Metabot only publishes feeds for top-N highest-reputation agents).
3. Suggest the user calls `acp_agent_reputation` if they just want the off-chain reputation score, or watches via Metabot if they need the feed to be published later.

Always surface `marketplaceUrl` as a one-click profile link.
