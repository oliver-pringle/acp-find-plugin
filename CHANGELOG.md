# Changelog

All notable changes to `acp-find` (Claude Code plugin) and `acp-find-mcp` (npm package) are recorded here. The two ship in lockstep — one version bump per release.

## v0.11.0 — 2026-05-24 — Defensive depth

Closes the 6 audit findings deferred from v0.10.1. Additive — every change is opt-out-able; existing callers see the same response shape with two new fields (`_warning`, `_untrusted`) added on marketplace-content tools, and any clearly-malformed input now returns a typed `isError` instead of silently reaching the gateway.

**Fixes**

- **Prompt-injection envelope** (audit #2). Every tool that surfaces marketplace-supplied text wraps its response with a top-level `_warning` explaining the trust boundary and tags every object containing third-party content with `_untrusted: true`. Tool descriptions in `tools/list` are updated to flag the trust boundary so LLMs see it before calling. 18 tools wrapped: 14 marketplace-content tools + 4 arena tools.
- **Central input validator + clamping** (audit #3). New `validateToolArgs(name, args)` layer runs before every `tools/call` handler (and before the v0.10.1 concurrency semaphore). Enforces max string length (2048), array length (50), object depth (4), object key count (30), `0x`+40-hex address shape (also for elements of `agentAddresses` arrays), `chainId` whitelist (`1, 8453`), and per-arg numeric ranges (`limit` 1-50, `days` 1-365, `offset` 0-10000, `weeks` 1-52, `topN` 1-100, etc.).
- **`ACP_API_URL` host/scheme guard** (audit #5). Server refuses to send `X-API-Key` over `http:` to a non-localhost host unless `ACP_ALLOW_PLAINTEXT_KEY=1`. Also warns when host is not `api.acp-metabot.dev`; silence with `ACP_ALLOW_CUSTOM_GATEWAY=1`. One-shot startup check; no per-request overhead.
- **Address normalization** (audit #8). New `normalizeAddress(addr)` helper. Swept into `acp_agent_reputation`, `acp_agent_reputation_history`, `acp_browse_agent`, `acp_agent_resources`, `acp_resource_call` (replaces ad-hoc `String(...).toLowerCase()` patterns).
- **`marketplaceUrl` validation** (audit #9). `agentUrl(addr)` now requires `0x`+40 hex and `encodeURIComponent`s the value before constructing the URL. Hardens against poisoned-indexer scenarios where a non-hex `agentAddress` would surface as a malformed marketplace URL.
- **Supply-chain hardening docs** (audit #10). README "Production deployment" section recommends pinning `acp-find-mcp@0.11.0` and Docker digest pinning. SLSA provenance + SBOM flagged for v0.12.0.

**New env vars (all default-secure)**

- `ACP_ALLOW_PLAINTEXT_KEY` — override the refuse-to-send-key-over-plaintext default (warn-and-still-send when set).
- `ACP_ALLOW_CUSTOM_GATEWAY` — silence the non-`api.acp-metabot.dev` host warning.

**Behaviour changes (forward-compatible)**

- Marketplace-content tool responses now include two new top-level fields: `_warning` (string) and per-record `_untrusted: true`. Existing callers that ignore unknown fields are unaffected.
- Numeric args outside the documented ranges now throw `isError` with a clear "out of range" message. Calls that previously sent `limit: 1000` to the gateway now error at the MCP layer.
- Non-hex `agentAddress` args throw `isError` with "0x followed by 40 hex chars" (existing test assertions preserved).

**Tests:** 35 (was 22 before v0.10.1; +6 in v0.10.1, +7 in v0.11.0).

## v0.10.1 — 2026-05-22 — Security patch

Closes 4 runtime-exploitable findings from the 2026-05-22 audit. No new tools, no API changes; backward-compatible env-var opt-outs only.

**Fixes**

- **SSRF guard on `acp_resource_call`** (audit #1, high). Resource URLs must use `http:` or `https:`. Hostnames are DNS-resolved up front and rejected if they map to loopback (`127.0.0.0/8`, `::1`), private (`10/8`, `172.16/12`, `192.168/16`), link-local (`169.254/16` including cloud metadata, `fe80::/10`), multicast, broadcast, or IPv6 unique-local ranges. HTTP 3xx redirects are refused rather than followed. Opt-out for local-dev against a loopback bot via `ACP_ALLOW_LOOPBACK_RESOURCES=1`.
- **Response body size caps** (audit #4). Resource calls capped at 256 KB (untrusted third party); gateway calls capped at 2 MB (trusted Metabot). Override via `ACP_RESOURCE_BODY_LIMIT` / `ACP_GATEWAY_BODY_LIMIT`. Bodies are drained via streaming reader and cancelled on overrun.
- **Concurrency cap on `tools/call`** (audit #7). FIFO semaphore wraps every tool invocation; default 8 slots. Override via `ACP_MAX_CONCURRENT` (clamped 1..64). `initialize` and `tools/list` bypass. Cancellation handling (`notifications/cancelled`) deferred to v0.11.0.
- **Verbose-log redaction** (audit #6). Query strings stripped from URLs emitted by the verbose logger by default. Resource params can carry wallets / API tokens; they no longer reach IDE/client log buffers. Opt-out via `ACP_VERBOSE_FULL_URLS=1`.

**Deferred to v0.11.0**

- Audit #2 (untrusted-marketplace-content prompt-injection envelope).
- Audit #3 (central runtime input validator/clamping layer).
- Audit #5 (`ACP_API_URL` scheme/host warning when key is sent to non-Metabot host).
- Audit #8 (address normalization helper across all handlers).
- Audit #9 (`marketplaceUrl` builder address-validation).
- Audit #10 (README pinning / Docker digest guidance).

**Migration**

None. All changes are env-var-gated with secure defaults.

## 0.10.0 — 2026-05-20 — Cross-portfolio composition + OracleBot coverage + pagination

Six new tools (31 → 37), four new slash commands (24 → 28). All additive; existing signatures and response shapes unchanged. MCP protocol version stays at `2025-11-25`.

Backs **TheOracleBot** (10th and FINAL portfolio bot — agent `0x935e…236e`, live on droplet since 2026-05-17) by surfacing its 3 free Resources as typed MCP tools, and extends v0.9.1's safety primitives with **cross-portfolio composition** at the stack level.

### Added — MCP tools

- **OracleBot Resource wrappers (3 typed tools)** — gateway slug `api.acp-metabot.dev/oraclebot/v1/resources/*`. OracleBot's 8 paid `oracle_*` POST endpoints are X-API-Key gated; they stay paid on the marketplace.
  - `acp_oracle_sources` → `GET /oraclebot/v1/resources/sourceCatalogue`. List of 4 active source readers (Chainlink AggregatorV3Interface, Pyth Network, RedStone Classic, Uniswap V3 30m TWAP) on Base mainnet. Cached 5 min.
  - `acp_oracle_drift` → `GET /oraclebot/v1/resources/driftWindow`. 24h cross-source drift incidents. NOT cached — drift is current state; 5-min staleness would mask fresh incidents.
  - `acp_oracle_capabilities` → `GET /oraclebot/v1/resources/capabilities`. Coverage matrix per `(chainId, tokenSymbol)`. Cached 5 min.
- **Cross-portfolio composites (3 tools)**:
  - `acp_hire_decision` ⭐ — runs `acp_compose_stack` + per-agent reputation lookup in parallel + ranks by composite score (0.7 × reputation + 0.3 × inverse-price). Returns ranked stack + recommendation + total cost. Sub-call count: 1 + uniqueAgents. Typically 4-7 round trips for a 5-candidate stack.
  - `acp_safe_quote` ⭐ — runs `acp_offering(addr, name)` + `acp_agent_verify(addr, depth: 'lite')` in parallel. Saves 1 round trip on the natural "show me X, is it safe" pattern.
  - `acp_portfolio_status` ⭐ — probes a known-reachable Resource on each of the 10 portfolio bots (TheMetaBot, ChainlinkBot, TheOracleBot, LiquidGuard, MEVProtect, EASIssuer, RevokeBot, ArenaBot, DeFiEval, AgentEval) in parallel. Returns per-bot reachability + latency + sample excerpt + aggregate `healthyCount`. Bot list hardcoded as `PORTFOLIO_BOTS` const in `server.js`; verified live 2026-05-20.

### Schema updates (no new tool name)

- `acp_recent_hires` gains `offset?: number` (0-1000) on its inputSchema; forwarded as `&offset=N` to `GET /v1/recentHires`. Mirrors `acp_find.offset`.
- `acp_agent_recent_jobs` gains `offset?: number` (0-1000) on its inputSchema; forwarded to `GET /v1/agentRecentJobs`.

Live probe confirmed the gateway accepts `offset` without 4xx; gateway-side honoring is implementation-dependent on Metabot (current snapshot returned `count: 0 / insufficient_history` so end-to-end slicing couldn't be verified). MCP schema pagination ships now regardless.

### Added — slash commands

- `/acp-find:oracle [<symbol>] [chainId:N]` — auto-routes to `acp_oracle_sources` / `_drift` / `_capabilities` by arg shape.
- `/acp-find:hire-decision <useCase> [budget:N] [chain:<id>] [max:N]`
- `/acp-find:safe-quote <addr> <offeringName> [chain:base|ethereum]`
- `/acp-find:portfolio-status`

Plus `/acp-find:recent-hires` and `/acp-find:agent-recent-jobs` slash bodies updated to honor a trailing `offset:N` arg.

### Backward compatibility

- All v0.10.0 changes are **additive**. Existing 31 tools unchanged.
- The risk pipeline is still `DEGRADED` in production (same as v0.9.1 — LiquidGuard / RevokeBot / MEVProtect risk lanes off, reputation lane fresh). `acp_safe_quote` runs `acp_agent_verify(depth: lite)` internally which still triggers risk_snapshot — partial risk surfaces in the verdict as documented in v0.9.1.
- MCP protocol version: `2025-11-25` (unchanged).
- `PORTFOLIO_BOTS` const lives in `server.js` and is the source of truth for `acp_portfolio_status`. As of v0.10.0 the portfolio is at maximum 10/10 per workspace `CLAUDE.md`; future portfolio adds/removes require a new MCP release.

### Verification

- `npm test` → 22 tests green (15 existing + 7 new).
- `acp_health` from a fresh `npx -y acp-find-mcp` reports `plugin.version: "0.10.0"`.
- `acp_portfolio_status` against the live gateway returns 10 bots with `healthyCount` ≥ 9.
- `acp_oracle_sources { chainId: 8453 }` returns 4 active sources matching the v0.5 OracleBot deployment (Chainlink / Pyth / RedStone / UniV3 TWAP).
- `acp_hire_decision { useCase: "wallet intelligence" }` returns a non-empty `ranking[]` with at least one item carrying a non-zero `reputationScore`.

## 0.9.1 — 2026-05-20 — Risk Bundle + Marketplace Gap + Buyer Verify

Eight new tools (23 → 31), six new slash commands (18 → 24). All additive; existing signatures and response shapes unchanged. MCP protocol version stays at `2025-11-25`.

### Added — MCP tools

- **Risk bundle (4 tools)** wrapping TheMetaBot v1.8 portfolio-risk pipeline (commit `8b17e35`, 2026-05-17):
  - `acp_risk_snapshot` → `POST /v1/risk/snapshot`. Composite 0-100 score (healthFactor + approvals + mevExposure + reputation; rubric-defined weights, grade A-F).
  - `acp_risk_deep_dive` → `POST /v1/risk/deep-dive`. Full sub-component breakdown with live RPC reads.
  - `acp_risk_compare` → `POST /v1/risk/compare`. Side-by-side risk for 2-5 wallets (distinct from `acp_compare_agents` which compares ACP-sellers — this works on any EVM wallet).
  - `acp_risk_attestation` → `POST /v1/risk/attestation`. Includes EAS UID + txHash when published on-chain.
- **Marketplace intelligence (1 tool)** wrapping TheMetaBot v1.9 (commit `bc26684`, 2026-05-18):
  - `acp_marketplace_gap` → `POST /v1/marketplace/gap`. Ranked underserved niches by `opportunityScore` + `recommendationTag`.
- **Risk diagnostics (2 Resource wrappers, cached 5 min)**:
  - `acp_risk_sources` → `GET /v1/resources/riskDataSourceHealth`. Live per-source health + overall verdict (`FRESH` / `DEGRADED` / `UNAVAILABLE`).
  - `acp_risk_rubric` → `GET /v1/resources/riskScoreRubric`. Methodology (weights, grade bands, bucket tables).
- **Composite intelligence (1 tool)**:
  - `acp_agent_verify` ⭐ — runs reputation + arena + recent jobs + risk_snapshot in parallel, returns a unified envelope with a rule-based verdict (`STRONG_BUY` / `OK` / `CAUTION` / `AVOID` / `UNKNOWN`). `depth: 'lite'` skips recentJobs leg.

### Added — slash commands

- `/acp-find:risk <addr>`
- `/acp-find:risk-deep <addr>`
- `/acp-find:risk-compare <addr1> <addr2> ...`
- `/acp-find:risk-attestation <addr>`
- `/acp-find:marketplace-gap [<category>] [limit:N]`
- `/acp-find:verify <addr> [depth:lite|full]`

(Resource wrappers `acp_risk_sources` / `acp_risk_rubric` do not get dedicated slash commands — they're diagnostic surfaces best invoked from the MCP tool directly.)

### Portfolio context (rolled forward from the prior 0.9.1 placeholder)

**TheOracleBot** (10th + FINAL portfolio bot, agent ID `019e3815-fc40-7639-95a3-d6a6a4c02a26`, wallet `0x935e97046b10832664d007430c7b7fd310a6236e`) went live on droplet 2026-05-17. Its 3 free Resources (`driftWindow`, `sourceCatalogue`, `agreementMatrix`) are reachable today via the existing `acp_resource_call` MCP tool at gateway slug `api.acp-metabot.dev/oraclebot/v1/resources/*`. Typed OracleBot wrappers are deferred to v0.10.0 (bundled with TheMetaBot v1.10 Smart Search). Five sibling bots gained cross-bot `_oracle`-suffixed offerings that consume TheOracleBot internally over `acp-shared`: `mev_protect_oracle`, `mev_check_oracle`, `price_feed_verified`, `peg_status_verified`, `hf_check_oracle` — all reachable via the same plugin tools by agent address.

### Backward compatibility

- All v0.9.1 changes are **additive**. Existing 23 tools unchanged.
- The risk pipeline is currently `DEGRADED` in production (LiquidGuard / RevokeBot / MEVProtect lanes off; reputation lane fresh). `acp_risk_snapshot` works against the degraded pipeline — sub-component scores are renormalised over available components per the rubric. Operator flips the missing lanes by configuring `RiskOrchestrator__*Endpoint` env vars to the respective bot URLs on `acp-shared`.
- MCP protocol version: `2025-11-25` (unchanged).

### Verification

- `npm test` → 15 tests green (9 existing + 6 new).
- `acp_health` from a fresh `npx -y acp-find-mcp` reports `plugin.version: "0.9.1"`.
- `acp_risk_sources` returns the **current** gateway verdict (proves the wrapper isn't synthetic).
- `acp_agent_verify` against TheMetaBot itself (`0xecf9…558c`) returns `STRONG_BUY` or `OK` with all four sub-objects populated.

## 0.8.1 — 2026-05-12 — npm README sync

Patch bump to ship the v0.8.0 "What's new" highlights to the npm registry's package page. The v0.8.0 publish (2026-05-12T02:23:33Z) included the prior README without the v0.8.0 section because the docs change landed minutes after the publish. No tool, schema, or behaviour change — `tools/list` is identical between v0.8.0 and v0.8.1.

## 0.8.0 — drafted 2026-05-11, gateway deployed 2026-05-12, published to npm 2026-05-12 — R7-IDEA-C + Resources end-to-end + cost projection + on-chain feed address

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
