# Changelog

All notable changes to `acp-find` (Claude Code plugin) and `acp-find-mcp` (npm package) are recorded here. The two ship in lockstep — one version bump per release.

## 0.8.0 — drafted 2026-05-11, gateway deployed 2026-05-12, npm publish pending — R7-IDEA-C + Resources end-to-end + cost projection + on-chain feed address

Closes the ACP v2 Resources loop end-to-end (discover → invoke), adds a calculation-only stack cost projector, and surfaces the on-chain Chainlink reputation aggregator address for Solidity integration.

**Deploy status:** TheMetaBot v1.6 (gateway support for all four backend-dependent tools) is live on `api.acp-metabot.dev` as of 2026-05-12 — verified with corpus rebuilt to 34,875 offerings and `GET /v1/agent/{addr}/feed-address` returning the expected 404+hint shape for unpublished agents. The acp-find-mcp npm package republish is pending the next manual `npm publish` (WebAuthn-gated); until then clients running v0.7.x against the public gateway can still call the new tools by exact name if they manually add them, but tool discovery requires the v0.8.0 npm bundle.

### Added

- **5 new MCP tools** (14 → 19):
  - `acp_agent_resources` — list one agent's indexed Resources by wallet address (R7-IDEA-C).
  - `acp_resources_search` — cross-agent search across name + description + agent name. Use to discover agents by the FREE pre-hire introspection surface they expose (R7-IDEA-C).
  - `acp_resource_call` — INVOKE a Resource. Looks up the registered URL via Metabot's index, then calls it directly. Returns the agent's JSON response (or rawText). Closes the loop: discovery → invocation, no payment, no hire.
  - `acp_estimate_stack_cost` — pure calculation, no network. Rolls a list of priced offerings into a projected monthly cost. One-shot: `priceUsd × usesPerMonth`. Subscription: `priceUsd × 30 / durationDays`. Optional `budgetUsdMonthly` check.
  - `acp_agent_feed_address` — on-chain composability. Returns the Base-mainnet ReputationAggregator (AggregatorV3Interface) contract address Metabot has published for the agent. Lets Solidity gate by ACP counterparty reputation via `latestRoundData()` without any off-chain API. Returns `{ hasFeed: false, hint }` for agents without a feed (only top-N highest-reputation agents currently have feeds).
- **4 new slash commands:**
  - `/acp-find:resources <addr | query>` — auto-routes to `acp_agent_resources` (for addresses) or `acp_resources_search` (for free-text).
  - `/acp-find:resource-call <agent> <resource> [params]` — wraps `acp_resource_call`, accepts JSON / `k=v` / `addr/name` shorthands.
  - `/acp-find:cost` — wraps `acp_estimate_stack_cost`, pairs naturally with `/acp-find:stack`.
  - `/acp-find:feed-address <addr>` — wraps `acp_agent_feed_address`. Renders the on-chain aggregator address with a ready-to-paste Solidity integration snippet.

### Backend (TheMetaBot)

- New `agent_resources` SQLite table mirroring `AcpAgentResource` (name + url + params + description) per indexed V2 agent.
- `AcpV2MarketplaceSource` writes resources as a side-effect of its per-wallet fetch — no change to the `IMarketplaceSource` contract.
- Three new HTTP endpoints on the public gateway:
  - `GET /v1/agent/{address}/resources` — per-agent list (sits alongside the existing `/v1/agent/{address}` browse endpoint). Used by both `acp_agent_resources` AND `acp_resource_call` (the latter pulls the URL from here before forwarding to the agent's bot).
  - `GET /v1/marketplace/resources/search?query=...&limit=...&marketplace=...` — cross-agent substring search.
  - `GET /v1/agent/{address}/feed-address` — per-agent reputation aggregator lookup. Reads from `reputation_feeds` (populated by the v0.1–v0.4 ReputationFeedPublisher + ReputationFeedSyncWorker pipeline). 404 with `hint` when no feed has been deployed.
- All three endpoints rate-limited at 120/IP/hr via the `public-marketplace-resources` policy.

### Plugin transport

- `acp_resource_call` does a two-leg fetch: leg 1 (the URL lookup) goes through Metabot's gateway with X-API-Key; leg 2 (the actual Resource call) goes DIRECT to the agent's bot with no API key (third-party bots wouldn't recognise ours). Both legs use `REQUEST_TIMEOUT_MS` (30s).

### Backward compatibility

- All changes are **additive** — no existing tools, fields, or routes were modified or removed.

## 0.5.0 — 2026-05-03

Largest release since v0.4.0 introduced V1+V2 cross-version search.

### Added

- **6 new MCP tools** (8 → 14):
  - `acp_offering` — single-offering deep-dive by `(agentAddress, offeringName)`. Faster than parsing the whole agent profile when only one offering matters.
  - `acp_compare_agents` — side-by-side comparison of 2-5 agents.
  - `acp_watch_status` — read-only status of a registered marketplace watch (no sensitive fields exposed).
  - `acp_recent_hires` — top offerings by absolute hire-count delta in window.
  - `acp_agent_recent_jobs` — real on-chain job ledger from the chain-event scanner.
  - `acp_search_agents` — agent-level search distinct from offering-level `acp_find`.
- **6 new slash commands** mirroring the new tools: `/acp-find:offering`, `/acp-find:compare`, `/acp-find:watch-status`, `/acp-find:recent-hires`, `/acp-find:agent-recent-jobs`, `/acp-find:search-agents`.
- `acp_find` now returns a `confidence` bucket (`high` / `medium` / `low` / `sketchy` / `none`) derived from the top score. Slash commands render a graded callout above the table instead of a binary `bestMatch` flag.
- `acp_find` accepts `offset` for pagination beyond the top 50.
- `acp_today` accepts `chain` and `priceMaxUsdc` filters (parity with `acp_find`).
- `acp_compose_stack` accepts `chain` filter (parity with `acp_find`).
- `acp_categories` returns `offeringCount` per category so users can see where the marketplace is dense.
- Every result that carries an `agentAddress` now also carries a `marketplaceUrl` for one-click hire on `app.virtuals.io`. Wraps applied transparently on the plugin side.
- `acp_health` now exposes `corpus.v1Count` / `corpus.v2Count` (V1 vs V2 split), the MCP protocol version, and the plugin's verbose-logging flag.
- `ACP_VERBOSE` env var (or `--verbose` on argv) logs every gateway request/response to stderr.
- `Dockerfile` for users without Node 22; published as `oliverpringle/acp-find-mcp`.
- `smithery.yaml` for one-click install via Smithery (https://smithery.ai).
- `CHANGELOG.md` (this file).
- `Privacy & telemetry` section in both READMEs.
- Status badges (npm, gateway uptime) in both READMEs.
- 30-prompt cookbook grouped by intent (find / vet / compose / research / browse) in the main README.
- Bumped MCP `protocolVersion` to `2025-11-25` (latest stable).

### Changed

- `dispatchTool` refactored from a long if-chain into a `{name → handler}` map.
- `SERVER_VERSION` now read from `package.json` at startup so the manifest, npm version, and reported version cannot drift.
- `formatError` (which walks `Error.cause` chains) is used consistently across all error paths.
- One-retry-on-5xx (200ms backoff) added to `callGateway` and the inline reputation lookup. Network errors also retry once. 4xx never retries.
- 5-min in-memory cache for `acp_categories` and `acp_health` (high-frequency, low-churn).

### Internal

- Plugin `version` and npm `version` synced to `0.5.0`.
- `mcp-server/.dockerignore` added.

## 0.4.0 — 2026-04-30

- V1+V2 cross-marketplace coverage. `acp_find`, `acp_today`, and `acp_compose_stack` accept a `marketplace` arg (`"v1"` / `"v2"`); default is both. Each result tagged with a `marketplaceVersion` field.
- Indexer pulls from `https://acpx.virtuals.io/` (V1) and `https://api.acp.virtuals.io` (V2) every 10 min.

## 0.3.0 — 2026-04-29

- Hybrid search filters on `acp_find`: `chain`, `minReputation`, `freshness`.
- Reputation trajectory: `acp_agent_reputation` returns inline 30-day daily snapshots; new `acp_agent_reputation_history` for up to 90 days.

## 0.2.1 — 2026-04-28

- Behavioural `acp_agent_reputation` v2: completion / dispute / recency / volume30d / responseTime sub-scores with evidence + corpus percentile.
- Cache-only `GET /v1/agentReputation` path.

## 0.2.0 — 2026-04-27

- npm publish as `acp-find-mcp` for use in Cursor / Cline / Codex / Continue / Claude Desktop.

## 0.1.7 — 2026-04-26

- `category` filter on `acp_find`. New tools: `acp_categories`, `acp_health`. 4 slash commands.

## 0.1.6 — 2026-04-26

- New tool: `acp_categories`. Finance-2 ranking improvements.

## 0.1.5 — 2026-04-26

- New tool: `acp_browse_agent` — full agent profile by wallet address.

## 0.1.4 — 2026-04-26

- New tool: `acp_today` — daily digest (launches + gainers).

## 0.1.3 — 2026-04-26

- New tool: `acp_agent_reputation`. Stale-offering filter on `acp_find`.

## 0.1.2 — 2026-04-26

- Reputation field surfaced in `acp_find` results.

## 0.1.1 — 2026-04-26

- Surface fetch error cause in MCP responses.

## 0.1.0 — 2026-04-26

- Initial scaffold: `acp_find`, `acp_compose_stack`. Marketplace and plugin manifests.
