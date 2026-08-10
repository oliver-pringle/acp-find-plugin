# Changelog

All notable changes to `acp-find` (Claude Code plugin) and `acp-find-mcp` (npm package) are recorded here. The two ship in lockstep — one version bump per release.

## v0.20.1 - 2026-08-10 - dead-open responsiveness fix + boost-vendor seeds

Patch - additive. No MCP tool added, removed, or re-signed; the surface stays 47 full /
20 core. RoFlo Round 29 (`round29/demand-census.md`) found the responsiveness lens
self-poisoning: June-era funded-OPEN zombies (which the official indexer never sweeps to
a terminal state) permanently depressed answersJobsRate - including on the operator's own
AgentEval, which read UNRESPONSIVE off jobs nobody could ever answer again.

### Fixed - honest metrics
- `computeResponsiveness` dead-open rule: a funded OPEN whose `expiredAt` passed >30 days
  ago counts as `expired` (excluded from the rate) + is disclosed via the new
  `openDeadExpired` field. Rows without `expiredAt` and fresh stale-opens are unchanged.
  Job rows now carry `expiredAt` through from the indexer to make this computable.

### Added - detection
- 3 seeded boost-VENDOR wallets (each verified live selling a mutual_boost offering;
  reciprocity makes them wash buyers of their customers): `0x47ba...e2b9` "AgentReputer"
  (mutual_boost $0.02), `0x1540...c342` "AgentRank" (mutual_boost $0.01), `0xb0c9...1a04`
  "TrustLayer" (mutual_boost_basic/micro/standard).
- `acp_clone_screen` signal `sells_mutual_boost` (display-only, weight 0): the agent's own
  catalogue includes a mutual/reciprocal-boost product, so its job counts are boost sales,
  not demand. Live-verified on AgentReputer.

### Verification
- 83/83 tests (new: dead-open unit test - zombie counts expired, in-grace + no-expiredAt
  rows keep the stale-open clock); `node --check` clean; live smoke `smoke-v0.20.1.mjs`.

## v0.20.0 - 2026-07-25 - wash gen-4 (test-named self-QA) + the responsiveness axis

Minor - additive. No MCP tool added, removed, or re-signed; the surface stays 47 full /
20 core. New response fields + broadened heuristics only. RoFlo Round 28
(`round28/demand-census.md`) proved the gen-4 pattern live: self-QA economies behind
test-named wallets were minting "organic" counts through the v0.19 filters - including
inside our own trust engine (scriptmasterlabs read "15 organic / 3 buyers"; 2 of the 3
were its test wallets).

### Added - detection
- `nameLooksTestHarness` v0.20: normalizes `_` to a space before testing (underscore-joined
  names like `ZZZ_test_buyer_internal` defeated `\b` anchoring - `_` is a regex word char)
  and adds `zzz+\d*` / `dummy` / `archived` tokens. Bare `internal` deliberately excluded.
- 4 seeded wallets: `0x347e...a747` (the UNNAMED Big Brain Ape QA runner - 33 jobs incl
  "Revenue Test"), `0x73c0...bf0b` ("TP-QA-Buyer", ThoughtproofSentinel's harness),
  `0x0f03...9004` ("zzz000_archived_empty") and `0xf796...7587` ("ZZZ_test_buyer_internal")
  (both scriptmasterlabs test wallets).
- `acp_recent_hires`: advisory `washLikely` + `washReasons` per row (seed-farm buyers /
  test-harness buyers / single-buyer burst), screened against the official indexer for up
  to 8 distinct agents per call (5-min cache, fail-open, `washScreenNote` coverage
  disclosure). R28: the entire top-20 gainers list was wash/self-QA displayed clean.
- `acp_clone_screen`: `off_platform_funds_solicitation` display-only signal (offering copy
  steering buyers to a messaging channel + off-platform transfer - the "DM Telegram +
  send $500 USDC" bait-listing class) and `deaf_seller_pattern` (3+ stale funded-OPEN
  jobs outnumbering answers). Neither changes the verdict.

### Added - responsiveness ("does this seller actually ANSWER jobs?")
- `computeResponsiveness` over the agent's provider-side job history: answered =
  COMPLETED + REJECTED; stale-OPEN (>24h) counts only when FUNDED (budget present -
  unfunded shopping-bot sprays excluded; budget "0" is a funded free hire and counts);
  EXPIRED excluded (buyer-side evaluator expiry is indistinguishable from seller
  silence); `answersJobsRate` null on an empty denominator.
- Exposed as `jobs.responsiveness` on `acp_clone_screen` and `lanes.delivery.responsiveness`
  on `acp_agent_trust`; the trust headline appends `UNRESPONSIVE - leaves funded jobs
  unanswered (...)` when stale-opens outnumber answers.

### Backward compatibility
- All existing fields, shapes, and verdicts unchanged. New fields are additive; the
  single-buyer floor (`SINGLE_BUYER_MIN=20`) and the honest-buyer regression guard
  (Gitlawb never seeded) are unchanged and re-tested.

### Verification
- 82/82 tests (9 new: gen-4 name specimens + narrowness guards, seed presence,
  responsiveness metric rules incl. budget-"0"-counts-funded and missing-timestamp-
  counts-fresh, solicitation both-signals-required).

## v0.19.0 - 2026-07-11 - wash gen-3 detectors (reciprocal-pair / single-buyer / name-affinity)

Minor - additive. No MCP tool added, removed, or re-signed; the tool surface stays 47 full /
20 core. New response fields only. RoFlo Round 27 (`demand-census.md` §7) proved two live wash
patterns that evaded the v0.18.x seed + name filters.

### Added - detection

- **Reciprocal-pair wash.** `acp_clone_screen` / `acp_agent_trust` strip a buyer that sells
  (almost) exclusively BACK to the screened agent (VEGETA<->iCLONE metronome). Structural,
  bounded per-buyer probe (`isReciprocalBuyer`, floor `RECIPROCAL_MIN_COMPLETED=5` so a small
  honest exclusive relationship is not stripped), highest-volume buyers probed first, fail-open;
  the probe-cap coverage gap is surfaced (`reciprocalProbeTruncated`). `acp_v2_demand` flags
  reciprocal rows in-scan (same completion floor + self-loop guard).
- **Name-family wash.** `namesAreAffine` strips operator-companion buyers whose name is
  NEAR-IDENTICAL to the seller's (same base, short-suffix difference: Taste/Tasty/taster).
  Reduced from an earlier prefix/acronym/shared-token form after an adversarial review measured
  false-positives on legitimate same-vertical agents (25 collisions in a 69-agent sample); the
  weaker forms are ceded to the reciprocal / seed / single-buyer detectors.
- **Single-buyer burst.** `>=20` organic completions from exactly ONE buyer hard-caps the clone
  verdict at SUSPICIOUS (`isSingleBuyerBurst`, `SINGLE_BUYER_MIN=20`). The floor preserves the
  one honest 4-from-1 organic signal (stays VERIFIED).
- New clone_screen signals: `reciprocal_wash_buyers`, `name_family_buyers`, `single_buyer_burst`,
  `reciprocal_probe_truncated`.
- **Scoring fix.** The clone-verdict score used `(weight || 1)`, coercing a deliberately-zero
  legibility weight to 1; two wash-exclusion signals wrongly summed to SUSPICIOUS on an
  otherwise-organic agent. Extracted to `cloneVerdictFromSignals` with `Number.isFinite` so a
  `weight:0` signal contributes 0 (legibility-only) and does not move the verdict.

### Added - MCP surface

- `acp_v2_demand` rows carry `washLikely` + `washReasons`
  (`reciprocal_pair | single_buyer | farm_seed | test_harness_name`) + optional
  `reciprocalPartner`; response carries a `washSummary { flagged, cleanProviders }`.
- `boostExcludedCount` now also counts reciprocal + name-family exclusions (meaning unchanged:
  "wash buyers excluded"); the `acp_agent_trust` reason text generalised to "wash completion(s)".

### Added - backend context

- Four farm seeds in `BOOST_FARM_WALLETS` + gateway `appsettings.json TrustSignals:FarmWallets`
  (served via the `farmWallets` Resource): VEGETA `0xe09f4011…8584`, iCLONE `0x44cc25d5…6664`,
  gitlawb-test-buyer `0xec6ff51b…5627`, Producer/Suede burst `0xbdaa681f…cf2c`.

### Backward compatibility

- Purely additive. Existing fields and verdict cascade unchanged. The honest organic buyer
  (Gitlawb_Mercenary) is regression-tested to remain organic and is explicitly NOT seeded.

### Verification

- `node --check server.js`; `npm test` (75 tests, +6). New pure helpers exported and unit-tested
  (name-affinity near-identical positives + the reviewed intra-vertical false-positive negatives,
  single-buyer boundary, demand-row classifier incl. reciprocal floor + self-loop, weight-0
  legibility scoring). Live smoke `smoke-v0.19.0.mjs` against the real gateway/indexer: VEGETA
  organic->0/LIKELY_CLONE, TheMetaBot stays CLEAN with organic Gitlawb preserved, Taste's
  Tasty/taster stripped, demand rows flag reciprocal_pair.
- Adversarial multi-agent review (4 dimensions x verify) drove the name-affinity reduction, the
  reciprocal completion floor, the probe-ordering + truncation surfacing, and the weight-0 scoring
  fix.

## v0.18.2 - 2026-07-04 - e2e-test-loop wash detector

Patch - additive. Extends the v0.18.1 wash filter to the named e2e-test-loop economy that passes `clone_screen`. No tool added or removed; no signature changed.

### Added

- **e2e-test-loop exclusion in `acp_clone_screen` / `acp_agent_trust`.** A buyer whose agent name matches an anchored test-harness pattern (`nameLooksTestHarness` / `TEST_HARNESS_RE` - `e2e`, `test-agent`, `smoke-test`, `qa-buyer`, ...) is excluded from `organicExternalCompleted` alongside the existing boost-farm and operator-wallet exclusions. Deliberately narrow to avoid false-positives (bare "test" / "sandbox" / "staging" do not match). Motivating case: RoFlo R26 found DataPort Arena's sole buyer "acp-e2e-buyer" (5 jobs / 24 min) and ArAIstotle's "TestAgent" (6x factCheck) topping the V2 demand leaderboard while passing clone_screen CLEAN.
- **Seed** of the two confirmed e2e-loop buyers (`acp-e2e-buyer` `0x72e1...23b5`, `TestAgent` `0x24c1...2fec`).
- **Farm-seed convergence.** The plugin now fetches the gateway's authoritative farm-seed list (`GET /v1/resources/farmWallets`) and unions it into the frozen `BOOST_FARM_WALLETS`, cached (5-min TTL), fail-open - so a farm added on the gateway reaches every install without an npm republish.

### Changed

- **`boostExcludedCount` coverage broadened** to also count test-harness buyers (its meaning - wash buyers excluded from organic - is unchanged; field name + type unchanged).

### Gateway (ACP_Metabot, deployed separately)

- The same name heuristic + seed land in the authoritative gateway path (`FarmWalletRegistry.NameLooksTestHarness`, folded into `CorpusBoostyLookup`, seeded in `appsettings.json`), so the website trust report, the by-address badge, and the Arrival Sentinel converge on the same honest count.

### Verification

- Plugin: `node --check server.js` + `npm test` (69 tests, incl. new harness match/no-match boundary cases). Gateway: `dotnet test` (FarmWalletRegistry / TrustSignals / ArrivalSentinel green, 63 tests). Regex kept byte-identical between `server.js` and `FarmWalletRegistry.cs`.

## v0.18.1 - 2026-07-01 - Boost-farm exclusion: a wash-trade farm can't mint VERIFIED

Patch - additive fields plus a correctness tightening of `organicExternalCompleted` (it now excludes mutual-boost farm buyers). No tool added or removed; no signature changed.

### Added

- **Boost-farm exclusion in `acp_clone_screen` / `acp_agent_trust`.** Completions bought by a mutual-boost / wash-trade farm are subtracted from `organicExternalCompleted` and `organicDistinctBuyers` (alongside the existing operator-wallet exclusion), so a farm buying an offering on a loop can no longer mint VERIFIED. Detection = a seed list of confirmed farms (`BOOST_FARM_WALLETS`) + a sell-side heuristic (`offeringsLookBoosty` - does the buyer itself sell `mutual_boost` / `boost_reciprocal` / buyback products?), cached per wallet (5-min TTL), fail-open. Deliberately narrow: a plain "yield boost" / "MEV boost" offering is not flagged.
- **Transparency fields** on the clone-screen jobs object + trust delivery lane: `organicExternalCompletedRaw` (pre-filter), `boostExcludedCount`, `boostFarmBuyers[]`; plus a weight-0 `boost_farm_buyers` clone signal (informational - being bought by a farm does not make YOU a clone).

### Changed

- **`organicExternalCompleted` semantics tightened** to exclude boost-farm buyers. Field name + type unchanged; the value is now the honest third-party count the VERIFIED gate reads. Motivating case: RoFlo R25 found MicroCoord2.ai (a mutual-boost farm) had inflated TheMetaBot's verdict to VERIFIED via ~26 looped `agentRiskCheck` buys.

### Verification

- `npm test` green (66 tests, +4: `offeringsLookBoosty` positives/negatives, `BOOST_FARM_WALLETS` seed, farm-only-agent -> OPERATIONAL regression).
- The authoritative edge (`api.acp-metabot.dev/trust/:addr` + `/mcp`) imports `server.js`, so the website report + badge + Metabot trustProof inherit the honest count on redeploy.

## v0.18.0 - 2026-06-29 - Tool-surface tiering: lean CORE by default, FULL opt-in

Minor - additive mechanism, but the DEFAULT tool surface for the remote endpoint and the bare npx package narrows from 47 to 20. Nothing is removed; the full surface is one env var away.

### Added

- **Two tiers selected by `ACP_FIND_TIER` (default `core`).** CORE = 20 trust + discovery tools (search, `acp_agent_trust`, `acp_clone_screen`, `acp_v2_transactions`, `acp_agent_jobs`, compare, compose, `acp_security_scan`, and more). FULL = all 47 (CORE plus the portfolio-specific risk / arena / oracle / safe-route / security-catalogue / power tools).
- **`toolsForTier()`** filters `tools/list` on both transports; a gate in the shared `validateToolArgs` chokepoint makes a tier-hidden tool non-callable (a guessed full-only name returns a clear "set ACP_FIND_TIER=full" error), so CORE is a real boundary, not just a display filter.

### Changed

- **Default surface:** the remote endpoint (`https://api.acp-metabot.dev/mcp`) and bare `npx acp-find-mcp` now expose CORE (20). The **Claude Code plugin stays FULL** - its `.mcp.json` sets `ACP_FIND_TIER=full`, so all 38 `/acp-find:*` slash commands keep working.
- **Boot beacon** UA now carries `tier=<core|full>` beside the transport token, so CORE vs FULL adoption is measurable.

### Migration

- npm / Cursor / Cline users who relied on a portfolio tool (e.g. `acp_oracle_drift`, the `acp_risk_*` family, `acp_arena_*`, `acp_safe_quote`) set `ACP_FIND_TIER=full` in their MCP server env. Nothing was removed.

### Verification

- Plugin `npm test` green (62 tests, incl. a new CORE-tier tools/list assertion); edge tests green (5, incl. a CORE tools/list assertion); `smoke-v0.18.0.mjs` asserts core=20 / full=47 and the dispatch gate both directions.

## v0.17.0 - 2026-06-21 - Remote MCP + one authoritative trust verdict + shareable badge

Minor - additive (new output fields + a hosted transport; no existing signature changes). acp-find now has a zero-install remote endpoint, and trust is computed in exactly one place that the plugin, the website report, and the embeddable badge all share.

### Added

- **Remote MCP endpoint** - a Streamable-HTTP transport (the new `acp-find-edge` service) at `https://api.acp-metabot.dev/mcp`. Add it by URL in Cursor / Claude / Cline / Windsurf with no `npm install`; the stdio `npx acp-find-mcp` path is unchanged.
- **`GET /trust/:address`** on the edge - the single authoritative verdict (reusing the same `computeTrustVerdict`), which the website badge + report now defer to instead of recomputing.
- **`acp_agent_trust` shareable links** - the result now carries `reportUrl` (`acp-metabot.dev/agent/<address>`) and `badge.markdown`, an embeddable badge that works for ANY agent address and warns on SUSPECT / LIKELY_CLONE.

### Changed

- **`computeTrustVerdict`** gains an `UNKNOWN` verdict for wallets that are not indexed agents (reconciles the enum the website previously computed on its own).
- The boot beacon is tagged by transport (`stdio` vs `http`) so remote-MCP adoption is measurable.

### Verification

- Plugin `npm test` green (61 tests); edge tests green (4). Live on prod: `api.acp-metabot.dev/mcp` initialize + tools/list (47 tools); `api.acp-metabot.dev/trust/<metabot>` == website `acp-metabot.dev/api/public/trust/<metabot>` (both VERIFIED) - single source of truth proven.

## v0.16.4 — 2026-06-16 — Trust verdict weights distinct organic buyers

Patch — no new tools or signature changes; additive (the response shape only gains a field). Surfaces buyer *concentration* so "96 organic completions from 1 buyer" no longer reads like broad third-party demand — the marketplace-wide pattern (verified live this round) is that even top-of-leaderboard agents have 1–4 distinct buyers.

### Changed

- **`acp_agent_trust`** — the delivery lane now reports **`organicDistinctBuyers`** alongside `organicExternalCompleted`, and the headline reads "N organic completion(s) from M buyer(s)". The advisory `trustScore` now dampens single-buyer concentration (the organic-demand bonus is +12 instead of +20 when there is exactly one distinct organic buyer). The **verdict cascade is unchanged** — this discloses concentration, it does not re-grade agents; a stricter "≥2 distinct buyers for `VERIFIED`" gate would flip the operator's own front-doors and is deliberately left as a separate decision. Back-compat: callers that don't supply distinct-buyer info keep the legacy full-credit path.
- **`acp_clone_screen`** — its `jobs` lane now also reports `organicDistinctBuyers`.

### Verification

- `node --check` clean; `npm test` green (47 tools, 56 tests — 2 new: single-buyer score dampening + back-compat guard). Live smoke against the real gateway/indexer: Cybercentry (top-1.2% by volume) → `OPERATIONAL — not auditable, 96 organic completion(s) from 1 buyer.`, `delivery.organicDistinctBuyers: 1`.

## v0.16.3 — 2026-06-16 — Marketplace-gap ↔ categories reconciliation documented

Patch — no new tools or signature changes. The Metabot gateway's `/v1/marketplace/gap` + `/v1/categories` responses gained reconciliation fields (shipped server-side); these two pass-through tools' descriptions now document them so the long-standing ~10-12x denominator gap reads as intentional rather than a bug.

### Changed

- **`acp_marketplace_gap`** — description now notes each opportunity carries `totalAllMarketplaces` (the full v1+v2 corpus count, `== acp_categories.offeringCount`) alongside the v2-slice `total`, plus a `denominatorNote` spelling out which denominator `opportunityScore` is computed on for a single-marketplace slice.
- **`acp_categories`** — description now notes `offeringCount` is the full v1+v2 corpus and that a `countScope` field points to `acp_marketplace_gap` for the per-marketplace slice. The two surfaces, previously a confusing ~10-12x mismatch, now reconcile.

### Verification

- `node --check` clean; `npm test` green (47 tools, 54 tests — unchanged; doc-only). Reconciliation verified live against the gateway: Market Data v2 `total=583` / `totalAllMarketplaces=7648` `== acp_categories.offeringCount=7648` (also Trading Bots, DEX Swap).

## v0.16.2 — 2026-06-16 — Trust verdict: VERIFIED now requires a genuine third-party buyer

Patch — no new tools or signature changes; refines the delivery signal of two existing tools so an operator dogfooding its own fleet can't earn a `VERIFIED` trust verdict. Additive — the response shape only gains a field.

### Changed

- **`acp_agent_trust`** — the delivery lane now distinguishes **`organicExternalCompleted`** (COMPLETED jobs from buyers OUTSIDE the operator's own known portfolio wallets) from `externalCompleted` (any non-self counterparty). The **`VERIFIED`** verdict now requires `organicExternalCompleted >= 1` — at least one real third-party buyer — so a fleet operator whose only completions are self / cross-portfolio dogfooding caps at `OPERATIONAL`, not `VERIFIED`. `UNVERIFIED` and `trustScore` still credit any external delivery (lightly). A built-in `PORTFOLIO_WALLETS` set (the 16 deployed bots + Console agent + tester wallet) drives the exclusion.
- **`acp_clone_screen`** — its `jobs` lane now also reports `organicExternalCompleted` alongside `externalCompleted`, surfacing the same anti-dogfooding signal at the screening layer.

### Verification

- `node --check` clean; `npm test` green (47 tools, 54 tests, incl. a new portfolio-only → `OPERATIONAL` cascade test). Live smoke (`smoke-v0.16.2.mjs`) against the real gateway + indexer: the two front-door bots that drew the one genuine external buyer → `VERIFIED organic=1` (Metabot `external=29` but `organic=1`, so 28 dogfood completions are correctly excluded); a 40-offering clone → `LIKELY_CLONE organic=0`.

## v0.16.1 — 2026-06-15 — Scan coverage + auditedPatternIds surfaced

Patch — no new tools or signature changes. `acp_security_scan` is a pass-through, so this lands once the Metabot gateway forwards the fields (deployed); the tool description is updated to reflect the richer response.

### Changed

- **`acp_security_scan`** response now includes **`coverage`** ("high"/"medium"/"low") + **`auditedPatternIds[]`** (the pattern ids actually exercised this scan) — so a "C at low coverage" is distinguishable from a "C from real findings". The full chain: SecurityBot emits + persists them, the Metabot gateway (`TheSecurityBotClient` + `/admin/securityScan`) now forwards them, and this pass-through tool surfaces them. SecurityBot's 16th check (**P56 ConfigStatusLeakCheck** — `configured`/`mode:live|noop` in served bodies) also now appears in `findings`.

### Verification

- `node --check` clean; `npm test` green (47 tools, 53 tests); live operator scan against a real bot returned `coverage:"high"` + a 15-id `auditedPatternIds[]`.

## v0.16.0 — 2026-06-15 — The trust layer: acp_agent_trust + de-blinded verify

One new flagship tool + one new slash command, plus a de-blinding fix and an opt-in search enrichment. All additive — no existing signatures change. Tool count 46→47; slash command count 37→38.

### Added — MCP tools

- **`acp_agent_trust`** — FLAGSHIP. One-call authenticity/trust verdict for an ACP agent: `VERIFIED | OPERATIONAL | UNVERIFIED | SUSPECT | LIKELY_CLONE` + `trustScore` (0-100) + `headline` + `lanes { authenticity, auditability, delivery, reputation }`. A client-side composite (no new gateway endpoint) fusing `acp_clone_screen` (authenticity), `acp_agent_security_history` (auditability), and official-indexer COMPLETED-jobs-by-distinct-external-counterparties (the anti-self-loop delivery signal — a 100-job/1-counterparty self-loop scores `UNVERIFIED`, not "busy"). Pure verdict/score logic is unit-tested (`computeTrustVerdict`). Heuristic — pairs with `acp_security_scan` for a full audit. Distinct from `acp_agent_verify` (hire-RISK).

### Added — slash commands

- `/acp-find:trust <address>`.

### Changed

- **`acp_agent_verify` de-blinded** — the `depth: full` job-history leg now reads the official Virtuals indexer (`acp_agent_jobs`) instead of the blind `/v1/agentRecentJobs` (ChainEventScanner) that reported ~0 for months. The `STRONG_BUY` gate is now keyed on real completed jobs (threshold lowered 10→3 to match real-completion scarcity) and the headline surfaces distinct buyers. `acp_safe_quote` inherits the fix. The `recentJobs` response field now carries the official-indexer rollup `{asProvider, asClient}` (a new `jobs` field mirrors it); the old blind `{count, jobs[]}` shape is retired — it was always ~0.
- **`acp_find` / `acp_search_agents`** gain an opt-in `includeTrust` boolean (default false): enriches results with a cached SecurityBot `{grade, status}` hint, so trust shows at discovery time. Default-off keeps the search path latency unchanged.
- **Stale pattern-count copy de-hardcoded** — tool descriptions + the SecurityBot portfolio role string no longer claim "P1-P64 + B1-B9 / 74 / 81 patterns" (the count drifts every audit; the live catalogue is larger). Query `acp_security_pattern` for the live set.

### Verification

- `node --check` clean; `npm test` green (53 tests, incl. the 47-tool list assertion + the `computeTrustVerdict` cascade-tier unit tests); live smoke (`smoke-v0.16.0.mjs`) against the real gateway + indexer.

## v0.15.0 — 2026-06-15 — Real V2 transactions from the official indexer

Four new tools + four slash commands, all additive — no existing signatures change. Tool count 42→46; slash command count 33→37. Reads the canonical on-chain job record straight from the **official Virtuals indexer** (`api.acp.virtuals.io` — the data behind `app.virtuals.io/acp/scan/transactions`), because TheMetaBot's homegrown ChainEventScanner has historically been blind to completed jobs.

### Added — MCP tools

- **`acp_v2_transactions`** — one agent's complete on-chain job history: every job's `{ onChainJobId, role (provider=incoming sale / client=outgoing buy), jobStatus (OPEN|COMPLETED|EXPIRED|REJECTED), offering, counterparty {address,name}, budget, timestamps }` plus a per-side rollup `{ total, completed, open, expired, rejected, completionRate }`. The canonical record — including completed jobs the cached reputation / recent-hires surfaces miss.
- **`acp_agent_jobs`** — compact pre-hire reliability rollup: as-provider / as-client `{ total, completed, open, expired, rejected, completionRate, distinctCounterparties }`. The single number answering "does this agent actually complete the jobs it takes?"
- **`acp_v2_demand`** — real demand leaderboard: top providers by genuine `completed` jobs from the indexer's global activity feed (`pages` × 100 events, default 3). The signal the cached `recent_hires` / `gainers` surfaces have reported as zero for months.
- **`acp_clone_screen`** — template-clone / spam heuristic for the V2 clone flood: flags github / free-public-API resource URLs, hourly-timestamp offering spam (`idea_YYYYMMDD_HHMM`), bulk near-identical offerings, and self-bootstrap-only job histories → `CLEAN` / `SUSPICIOUS` / `LIKELY_CLONE`. Complements the SecurityBot grade (which can't probe off-platform clones).

### Added — slash commands

- `/acp-find:transactions`, `/acp-find:agent-jobs`, `/acp-find:demand`, `/acp-find:clone-screen`.

### Changed

- `acp_portfolio_status` portfolio list 15→16 bots (adds SafeRouteBot; SecurityBot row catalogue note 74→81).

### Backend context

- New `api.acp.virtuals.io` fetch path (`callIndexer`) alongside the existing `callGateway`; public + unauthenticated, no `X-API-Key` sent. Override with `ACP_INDEXER_URL`. Paginates via `meta.nextCursor`.

### Verification

- `node --check` clean; `npm test` green (46 tools); live smoke (`smoke-v0.15.0.mjs`) against the real gateway + indexer — `acp_v2_transactions` reproduced TheMetaBot's 54/29 job census, `acp_clone_screen` flagged a known clone `LIKELY_CLONE` and a hardened bot `CLEAN`.

## v0.14.0 — 2026-06-09 — On-demand security scan + scan history

Two new tools + two slash commands, all additive — no existing signatures change. Tool count 40→42; slash command count 31→33. Surfaces SecurityBot's catalogue now grown to **74 patterns (P1-P64 + B1-B9)** after the 2026-06-08 portfolio audit.

### Added

- **`acp_agent_security_history`** — NEW MCP tool. A bot's past SecurityBot scans, newest first — the append-only history behind `acp_today`'s per-offering `security` field. Each row is a SUMMARY: `{ scannedAt, status, score, grade, verdict, findingCount, observableCount, corpusVersion, severityCounts }`. Raw per-finding detail is intentionally NOT returned (it stays server-side — P9/P10/P30/P63). `count: 0` for a bot never scanned. Public, no API key. `limit` clamped 1..100 (default 20).

- **`acp_security_scan`** — NEW **operator-only** MCP tool. Runs SecurityBot's full passive scan against any ACP marketplace bot on demand (jumps the background worker's queue), returns the verdict + score/grade + the full per-finding `findings[]`, and persists the result to TheMetaBot's history. Requires `ACP_API_KEY` = TheMetaBot's `INTERNAL_API_KEY`; the tool refuses with a clear message (and the gateway returns 401) without it. Free internal path — no ACP escrow. (Tool definition shipped in the working tree pre-v0.14.0; this release wires it into the test suite, docs, and a slash command.)

- **New slash commands:** `/acp-find:security-scan <address>` (operator) and `/acp-find:security-history <address> [limit:N]`.

### Backend context

- **New gateway endpoint `GET /v1/securityScanHistory?agent=0x..&limit=N`** (TheMetaBot) backs `acp_agent_security_history`. Public + rate-limited (mirrors `/v1/agentReputationHistory`); summary-only projection — raw `findings_json` + `last_error` never leave the server. Reads the append-only `security_scan_history` table.
- `acp_security_pattern`'s wrapped catalogue grew 53 (P1-P43) → 74 (P1-P64 + B1-B9). Tool/description text updated; the gateway data was already live.

### Verification

- `npm test`: 42 → 44 tests green (tools/list count 40→42; one validation test per new tool family). Metabot side: new `SecurityScanHistoryEndpointTests` (P9/P10 no-leak guarantee, limit clamp, newest-first, address validation) — full suite 343 green.
- Backward compatibility: all existing tool signatures, schemas, and response shapes unchanged.

## v0.13.0 — 2026-06-07 — SecurityBot catalogue + portfolio expansion

Two changes, both additive — no existing signatures change. Tool count 39→40; slash command count 30→31.

### Added

- **`acp_security_pattern`** — NEW MCP tool wrapping SecurityBot's free `patternCatalogue` Resource. Returns the full 53-pattern security catalogue (P1-P43 + B1-B9) maintained by TheSecurityBot. Supports filtering by severity (`Critical`/`High`/`Medium`/`Low`/`Operational`), free-text search across pattern titles, and single-pattern lookup by ID. Each pattern includes a detection rule, canonical fix, and reference bot. Cached 5 min — single gateway call per cache window regardless of how many filtered queries the user fires. Free SecurityBot Resource — no API key required.

- **PORTFOLIO_BOTS 10→15** — The hardcoded bot list in `acp_portfolio_status` now covers all 15 deployed portfolio bots. Five bots added (alphabetical by slug): ButlerBridgeBot, ConciergeBot, SecurityBot, SolanaBot, WitnessBot. All probe paths verified live 2026-06-07 via `/<slug>/health` (200 OK), no auth required.

- **New slash command:** `/acp-find:security-pattern` — query the security catalogue inline. Supports `[<id>]` + `severity:<level>` + `search:<term>`.

- **`detection` and `canonicalFix`** fields added to `UNTRUSTED_FIELD_NAMES` — these SecurityBot-authored text fields are now flagged with `_untrusted:true` when the untrusted-content envelope is active.

- **`commands/portfolio-status.md`** updated to reflect 15-bot count.

## v0.12.1 — 2026-05-25 — marketplaceGap V1/V2 slice

Surfaces Metabot v1.10.1's marketplace-slice extension to `marketplaceGap`. One field added to `acp_marketplace_gap`; one slash command parser updated. Additive at the field level — but the **endpoint's default flips from `"both"` to `"v2"`**, so existing callers that omit `marketplace` will start seeing V2-only results. This is deliberate: V2 is the marketplace where new ACP-v2 bots actually deploy, so V2-only is the relevant denominator for the offering's primary "where should I build?" use case. Tool count stays at **39**; slash command count stays at **30**.

### Behaviour change — read me first

The `acp_marketplace_gap` tool's underlying gateway endpoint (`POST /v1/marketplace/gap`, backing Metabot's $0.30 `marketplaceGap` offering) now defaults to `marketplace: "v2"` when the field is omitted. Pre-v0.12.1 default was "combined V1+V2 corpus". To recover the prior behaviour, pass `marketplace: "both"` explicitly.

This affects:
- Direct `acp_marketplace_gap` MCP calls that don't set `marketplace`.
- `/acp-find:marketplace-gap` slash command invocations without a positional `v1`/`v2`/`both` keyword or `marketplace:` flag.
- Direct `POST /v1/marketplace/gap` HTTP calls to `api.acp-metabot.dev` that don't include `marketplace` in the body.

Near-duplicate edges still cross marketplaces — a V1 offering near-duped to a V2 offering bumps both ids in their respective slice (and the `"both"` slice produces identical numbers to pre-v0.12.1).

### New input field on `acp_marketplace_gap`

- `marketplace?: "v1" | "v2" | "both"` — Which marketplace pool to compute saturation against. Default `"v2"`. Echoed on the response as `response.marketplace`. Invalid values are rejected by the gateway with `400 invalid_marketplace`; the MCP wrapper coerces case + whitespace before forwarding.

### New response field

- `marketplace: "v1" | "v2" | "both"` — Echo of the resolved marketplace slice ("v2" when omitted, post-v0.12.1).

### `/acp-find:marketplace-gap` parser

Now accepts BOTH a positional keyword (`v1`/`v2`/`both`) and a named flag (`marketplace:v1|v2|both`). When both are supplied the flag wins. The three tokens are RESERVED — they never get parsed as part of a category name. Examples:

- `/acp-find:marketplace-gap` — defaults to v2.
- `/acp-find:marketplace-gap both` — pre-v0.12.1 default reachable via keyword.
- `/acp-find:marketplace-gap "Trading Bots" v2 limit:10` — combined.
- `/acp-find:marketplace-gap marketplace:v1` — named flag form.

The slash command's render adds a sub-headline showing the resolved slice + a "new default 2026-05-25" callout on the v2 path for the first month post-release.

### Threshold caveat for V2-only mode

`recommendationTag` thresholds are global (`saturated_avoid` ≥ 0.70, `high_volume_low_density` ≥ 100 total + <0.40 sat, `medium_volume_emerging` ≥ 30 + <0.50, `niche_underserved` <30 + <0.40, else `balanced`). When `marketplace="v2"` is selected most categories will tag as `niche_underserved` or `balanced` because V2 has lower per-category density than the combined corpus. Use `opportunityScore` as the primary ranking signal when comparing V2 rows. (This is by design — separate per-slice thresholds were considered and deferred per spec Q1.)

### Gateway dependency

Metabot v1.10.1's `/v1/marketplace/gap` endpoint is the source of truth for the new `marketplace` field. The v0.12.1 MCP package is fully forward-compatible against pre-v1.10.1 gateways — the field is just silently ignored by old gateways and the response reverts to today's pre-marketplace-field shape. So `acp-find-mcp@0.12.1` works against any gateway, but only delivers the V1/V2 split when paired with `api.acp-metabot.dev` running Metabot v1.10.1.

### Compatibility

Field-level additive. Default-level breaking (Q2 resolution). MCP protocol version: `2025-11-25` (unchanged). Existing 39 tools, 30 slash commands, and every env var carry forward unchanged.

## v0.12.0 — 2026-05-24 — Surface Metabot v1.10 (Phase 1+2+3)

Surfaces TheMetaBot v1.10 to MCP clients. Additive — every existing tool keeps identical signatures and response shapes. The 9 new optional fields on `acp_find` are forward-compatible: old plugin clients keep working against the new gateway, and old gateways silently ignore the new fields. Tool count **37 → 39**; slash command count **28 → 30**.

**New MCP tools (2)** — both wrap Metabot v1.10 Phase 3 paid offerings:

- `acp_search_narrative` ⭐ — wraps `POST /v1/searchNarrative` ($0.05). Returns a 3-5 sentence Claude-narrated summary of the top-N marketplace results plus a 1-line "why this ranked high" per cited offering. Args: `query` (required), `limit?` (1-50, default 5), `previousQueries?` (max 5 × 200 chars), `marketplace?`. Response wrapped in the v0.11.0 untrusted-content envelope.
- `acp_agent_risk_check` ⭐ — wraps `POST /v1/agentRiskCheck` ($0.05). Defensive scam-risk assessment for one ACP agent: reputation depth + pricing outliers + wallet provenance + V1↔V2 footprint anomaly. Returns 0-100 score + tier (low/medium/high/critical) + per-signal detail. Args: `agentAddress` (required, 0x+40-hex), `chainId?` (1|8453, default 8453). Distinct from `acp_risk_snapshot` (which scores ANY EVM wallet across 4 sub-bots) — this is ACP-seller-specific.

**`acp_find` extension** — 9 new optional fields, all additive:

- **Phase 1 negative filters:** `excludeRequirements: string[]`, `excludeAgents: string[]` (each 0x+40-hex), `excludeChains: string[]`, `maxPriceUsd: number` (0..100000).
- **Phase 1 unified search:** `includeResources: boolean` (default true). Surfaces free Resources alongside paid offerings.
- **Phase 2 sub-offering filters:** `requiresField: string` (top-level requirement-schema field, identifier-shape ≤ 80 chars), `producesField: string` (top-level deliverable-schema field).
- **Phase 3 toggles:** `expand: boolean` (run LLM query rewriter — off when daily $0.50 cap breached), `includeRisk: boolean` (per-hit `riskFlag` low/medium/high/critical via AgentRiskScorer).

Handler passes each through to `POST /v1/search` verbatim — the gateway is what enforces semantics. Old gateways ignore unknown fields; new gateways do the work.

**New slash commands (2):**

- `/acp-find:narrate <query> [limit:N] [marketplace:v1|v2]` — narrate top-N results.
- `/acp-find:risk-check <addr> [chainId:N]` — single-agent risk verdict with tier callout.

**Tests:** 40 (was 35 after v0.11.0; +1 for the schema extension + 2 per new tool = +5).

**Gateway dependency** — Phase 3 of Metabot v1.10 (the new `/v1/searchNarrative` and `/v1/agentRiskCheck` endpoints) isn't deployed at the time of this MCP release. The two new tools will 404 against the current `api.acp-metabot.dev` until Metabot v1.10 ships to the droplet. The 9 new `acp_find` fields work today on the existing gateway — they just don't change behaviour until Metabot v1.10's search rewriter respects them.

**Compatibility:** All v0.12.0 changes are **additive**. Existing 37 tools, 28 slash commands, and every env var carry forward unchanged. MCP protocol version: `2025-11-25` (unchanged).

## v0.11.1 — 2026-05-24 — README lead-block fix (docs-only)

Docs-only patch. No code changes; identical `server.js` to v0.11.0 (sha unchanged).

The published `acp-find-mcp@0.11.0` tarball shipped with the `mcp-server/README.md` lead block still announcing "What's new in v0.10.1" — the v0.11.0 changes were documented only in the Security & operational limits subsections, not at the top of the README. npm tarballs are immutable, so v0.11.1 reships the package with the corrected README lead block ("What's new in v0.11.0") above the v0.10.1 entry. Same fix pattern recorded in `feedback_acp_find_readme_whats_new_lead` to prevent the recurrence on future releases.

If you already pulled v0.11.0, no functional upgrade is needed — but `npx -y acp-find-mcp@0.11.1` will give you the version of the README that correctly reflects what shipped.

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
