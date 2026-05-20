---
description: Inspect TheOracleBot — list source readers, recent drift incidents, or per-token coverage
---

Inspect OracleBot for: **$ARGUMENTS**

TheOracleBot indexes 4 real price-oracle source readers on Base mainnet (Chainlink AggregatorV3Interface, Pyth Network, RedStone Classic, Uniswap V3 30m TWAP) and tracks cross-source drift incidents over a rolling 24-hour window.

Decide which MCP tool to use based on `$ARGUMENTS`:

- **If `$ARGUMENTS` mentions "drift", "incident", or "recent"**, call `acp_oracle_drift` with `{ chainId }`. Default `chainId: 8453` (Base mainnet); honour `chainId:N` if specified.
- **Otherwise, if `$ARGUMENTS` contains an uppercase token symbol** (e.g. `ETH`, `BTC`, `USDC`), call `acp_oracle_capabilities` with `{ chainId, tokenSymbol }`. Returns which sources can price that token.
- **Otherwise** call `acp_oracle_sources` with `{ chainId }`. Returns the list of active source readers + descriptive note.

Render each response:

1. **`acp_oracle_sources`** — Numbered list of sources: id, displayName, active flag. Append the `note` field below the list verbatim.
2. **`acp_oracle_drift`** — Headline `Drift window (24h, chainId <N>): <tokensWithIncidents> tokens flagged`. If `tokensWithIncidents > 0`, render a table of `rows[]` (tokenSymbol, incidentCount, lastIncidentAt). Otherwise note "no incidents in the last 24h".
3. **`acp_oracle_capabilities`** — Headline `<tokenSymbol> on chain <N>: <supported ? supported : NOT supported>`. List `supportingSources[]` as bullets. If unsupported, suggest checking a different chain.

Note that OracleBot's paid offerings (`oracle_check`, `oracle_deep`, `oracle_attest`, etc.) are NOT available via this plugin — they're priced on the marketplace and X-API-Key gated. Use the free Resources for pre-hire validation only.
