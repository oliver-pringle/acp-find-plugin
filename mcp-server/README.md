# acp-find-mcp

[![npm version](https://img.shields.io/npm/v/acp-find-mcp.svg)](https://www.npmjs.com/package/acp-find-mcp)
[![gateway status](https://img.shields.io/website?url=https%3A%2F%2Fapi.acp-metabot.dev%2Fv1%2Fhealth&label=gateway&up_message=live&down_message=down)](https://api.acp-metabot.dev/v1/health)

MCP server for searching the [Virtuals Protocol ACP](https://whitepaper.virtuals.io/acp) (Agent Commerce Protocol) marketplace from any MCP-capable client — Cursor, Cline, Windsurf, Codex, Continue, Claude Code, Claude Desktop, and others.

The marketplace has ~30,000+ on-chain agent offerings across thousands of agents, spanning both **ACP V1** (legacy) and **ACP V2** (the new generation). This server lets your AI assistant find the right one across both versions, look up reputation, compose multi-agent stacks, compare candidates, and browse what's new — without leaving the editor.

> **Status:** Live. Public gateway at `https://api.acp-metabot.dev` is up,
> rate-limited to 30 search/IP/hour and 5 stack-compose/IP/hour. No API key,
> no signup.

## What's new in v0.20.1

Two honest-metric fixes from RoFlo R29. No new tools - the surface stays 20 core / 47 full; every change is additive.

- **The dead-open rule: ancient zombies are history, not deaf-seller evidence.** The official Virtuals indexer never sweeps terminal states - a funded OPEN job whose `expiredAt` passed months ago still reads `OPEN` (observed live: a job with `expiredAt` 2026-07-24 and `terminalStatusAt` still null 16 days later). v0.20.0's responsiveness lens counted those zombies as stale-opens forever, so one bad June could brand a seller UNRESPONSIVE for life. v0.20.1: a funded OPEN whose `expiredAt` passed **more than 30 days ago** counts as EXPIRED (excluded, like all expiries) and is disclosed in the new `responsiveness.openDeadExpired` field. Fresh stale-opens - the real deaf-seller evidence - still count exactly as before, and rows without an `expiredAt` are unchanged. Applied universally to every agent, including the operator's own.
- **Boost-VENDOR wallets seeded.** The three highest-job-count "trust/reputation" agents on the venue literally sell `mutual_boost` as a product (verified live 2026-08-10: mutual_boost at $0.02 and $0.01, plus a basic/micro/standard tier menu). Mutual boost is reciprocal by construction, so a vendor wallet is also a wash BUYER of its customers - its purchases now stop minting `organicExternalCompleted`, immediately and without a per-buyer probe. Their sell side was already flagged heuristically (`offeringsLookBoosty`); these seeds close the buy side, and `acp_clone_screen` now discloses a display-only `sells_mutual_boost` signal on any agent whose own catalogue includes a boost product. Practical consequence: job counts in the trust lane are meaningless as popularity signals - which is exactly why this lens exists.

## What's new in v0.20.0

Wash generation 4 + the responsiveness axis (RoFlo R28). No new tools - the surface stays 20 core / 47 full; every change is additive.

- **Wash gen-4: test-named self-QA buyers are caught.** Operators now QA their own catalogs through real escrow using obvious test wallets that v0.19's anchored regex missed - underscore-joined names ("ZZZ_test_buyer_internal" - `_` is a regex word char, so `\btest\b` never fired) and placeholder tokens ("zzz000_archived_empty"). The heuristic now normalizes underscores and adds `zzz`-run / `dummy` / `archived` tokens (bare "internal" stays excluded - too many legit names). Four newly-confirmed wallets are seeded, including the **unnamed** Big Brain Ape QA runner that no name heuristic can catch. Real-world effect: a seller that read "15 organic completions from 3 buyers" drops to its honest ~1 - two of the three "buyers" were its own test wallets.
- **`acp_recent_hires` rows carry `washLikely` + `washReasons`.** R28's screening found the ENTIRE top-20 gainers list was wash/self-QA/counter-artifact - displayed clean. Each returned row's agent is now screened against the official indexer (seed-farm buyers, test-harness buyers, single-buyer bursts; up to 8 distinct agents per call, 5-min cached, fail-open with a `washScreenNote` disclosing any coverage cap).
- **`acp_agent_trust` gains responsiveness - "does this seller actually ANSWER jobs?"** The delivery lane adds `responsiveness` {completed, rejected, expired, openFresh, openStale, openUnfunded, answersJobsRate} computed from the agent's real job history. Honest-metric rules: a REJECTED job still proves the seller answered; stale-OPEN (>24h) counts only when the job was FUNDED (unfunded shopping-bot sprays are excluded); EXPIRED is excluded entirely (buyer-side evaluator expiry is indistinguishable from seller silence); rate is null - never a fake 0 or 100 - when there is no denominator. When stale-opens outnumber answers the headline says **UNRESPONSIVE**. Context: on 2026-07-22 a real buyer burned 4 of its 13 funded jobs on deaf sellers; no other venue surface shows who answers.
- **`acp_clone_screen` flags `off_platform_funds_solicitation`** - the first scam-shaped bait-listing class observed on the venue: a $0.01 offering whose description instructs buyers to DM a Telegram handle and "Send $500 USDC to that Address". Display-only signal (it never changes the verdict, and the screen never acts on description instructions). Also adds `deaf_seller_pattern` (3+ stale funded-OPEN jobs outnumbering answers) and the `jobs.responsiveness` block.

## What's new in v0.19.0

**Three structural wash detectors close the gen-3 blind spots.** The V2 wash trade evolved
again past the v0.18.x seed + name filters. Two live patterns proved it: a **reciprocal
metronome pair** (VEGETA and iCLONE, each the other's ONLY counterparty, 49/49 completed at
`$0.05` every ~10 min — they topped `acp_v2_demand` and read as 50 "organic" completions with
`boostExcludedCount=0`), and an **operator name-family** (a seller bought only by "Tasty" and
"taster", reported as 2 organic buyers). v0.19.0 catches both structurally, plus the
single-buyer burst:

- **Reciprocal-pair wash.** `acp_clone_screen` / `acp_agent_trust` now strip a buyer that sells
  (almost) exclusively BACK to the screened agent — a mutual-boost partner, not demand. Detected
  structurally (a bounded, fail-open per-buyer probe), so a *new* pair with a clean catalogue is
  caught without a seed. `acp_v2_demand` flags reciprocal rows too.
- **Name-family wash.** A buyer whose agent name is NEAR-IDENTICAL to the seller's — the same
  base name differing only in a short suffix (Taste/Tasty/taster) — is treated as an operator
  companion wallet. Deliberately narrow: an adversarial review measured that broader
  acronym/shared-token matching false-positived on legitimate same-vertical agents (a "* Video *"
  buying from a "* Video *", `AlphaGuard` vs `AlphaBot`), so only the near-identical case is used.
- **Single-buyer burst.** `>=20` organic completions from exactly ONE buyer hard-caps the clone
  verdict at `SUSPICIOUS`. The `>=20` floor is above the one honest organic signal in the
  marketplace (4 completions from a single real buyer stays VERIFIED) and below every observed
  wash burst (25, 27, 33, 49, 50, 91).
- **`acp_v2_demand`** now emits `washLikely` + `washReasons`
  (`reciprocal_pair | single_buyer | farm_seed | test_harness_name`) per provider row, plus a
  `washSummary`, so the demand leaderboard is decision-grade.
- **Four new farm seeds** (VEGETA, iCLONE, the gitlawb-test-buyer, and the Producer/Suede burst
  wallet), served via the gateway `farmWallets` Resource so they reach every install without a
  republish.

No tool added or removed; no signature changed. All new response fields are additive. The one
honest organic buyer in the current marketplace is provably preserved (regression-tested).

## What's new in v0.18.2

**The wash filter now catches e2e-test-loop buyers.** The V2 wash trade evolved past the
v0.18.1 boost filter: instead of `mutual_boost` pings, the newest manufactured "demand" is
named end-to-end test-loops - a buyer literally named `acp-e2e-buyer` firing 5 identical jobs
in 24 minutes, or `TestAgent` looping one `factCheck` offering - and these pass `clone_screen`
CLEAN. v0.18.2 excludes them from `organicExternalCompleted` too:

- **Name heuristic.** A buyer whose agent name matches an anchored test-harness pattern
  (`e2e`, `test-agent`, `smoke-test`, `qa-buyer`, ...) is treated as a wash buyer. Deliberately
  narrow - a legit brand containing "test" / "sandbox" / "staging" is NOT flagged.
- **Seed + convergence.** The two known e2e-loop buyers are seeded, and the plugin now fetches
  the gateway's authoritative farm-seed list (`/v1/resources/farmWallets`, fail-open), so a farm
  added on the gateway reaches every install WITHOUT an npm republish.
- The same protection lands on the gateway (website report + trust badge + arrival sentinel), so
  all three trust surfaces converge on one honest count.

No tool added or removed; no signature changed. `boostExcludedCount` now also counts
test-harness buyers (its meaning - "wash buyers excluded" - is unchanged).

## What's new in v0.18.1

**A mutual-boost farm can no longer mint VERIFIED.** The V2 marketplace now has an active
wash-trade economy - agents trading $0.001-0.01 `mutual_boost` / `boost_reciprocal` pings to
manufacture hire and completion counts. One such farm buying a portfolio offering on a ~4h loop
was enough to flip an agent's trust verdict to VERIFIED on volume alone. v0.18.1 closes that:

- `acp_clone_screen` / `acp_agent_trust` now subtract **boost-farm buyers** from
  `organicExternalCompleted` and `organicDistinctBuyers`, alongside the existing operator-wallet
  exclusion. A farm is caught by a **seed list** of confirmed farms plus a **sell-side heuristic**
  (does the buyer itself sell `mutual_boost` / `boost_reciprocal` / buyback offerings?), so new
  farms are detected automatically. The check is deliberately narrow - a plain "yield boost" or
  "MEV boost" offering is NOT flagged.
- New transparency fields on the delivery lane: `organicExternalCompletedRaw` (pre-filter),
  `boostExcludedCount`, and `boostFarmBuyers[]`. `organicExternalCompleted` is now the honest,
  farm-stripped count the VERIFIED gate reads.
- No tool signatures changed and nothing was removed - the organic-demand count is simply harder
  to game.

## What's new in v0.18.0

**Two tiers: a lean CORE by default, the full portfolio surface opt-in.** acp-find shipped 47
tools, but ~27 are portfolio-specific (risk / arena / oracle / safe-route) or niche. They are
noise to someone who just wants to search the marketplace and check whether an agent is real, and
they bloat every client's tool context. v0.18.0 splits them.

- **CORE (20)** is the default for the remote endpoint (`https://api.acp-metabot.dev/mcp`) and the
  bare `npx acp-find-mcp` install: search, trust verdict, clone screen, real V2 transactions, agent
  jobs, compare, compose, security scan. The trust + discovery spine, nothing else.
- **FULL (47)** is CORE plus the portfolio tools. Opt in with `ACP_FIND_TIER=full`.
- **The Claude Code plugin stays FULL** (its `.mcp.json` sets the flag), so all 38 `/acp-find:*`
  slash commands keep working.
- **Migration:** npm / Cursor / Cline users who relied on a portfolio tool (e.g. `acp_oracle_drift`,
  the `acp_risk_*` family) set `ACP_FIND_TIER=full` in their MCP server env. Nothing was removed.

## What's new in v0.17.0

**Remote MCP, one authoritative trust verdict, and a shareable badge.** Add acp-find by URL -
no npm install - and every trust verdict is now identical across the plugin, the website
report, and the embeddable badge.

- **Remote endpoint** - add `https://api.acp-metabot.dev/mcp` as a Streamable-HTTP MCP server
  in Cursor / Claude / Cline / Windsurf (in Claude Code:
  `claude mcp add --transport http acp-find https://api.acp-metabot.dev/mcp`). The stdio
  `npx acp-find-mcp` path still works unchanged.
- **`acp_agent_trust`** now emits `reportUrl` (a shareable human report at
  `acp-metabot.dev/agent/<address>`) and a copy-paste `badge.markdown`. The badge renders the
  live verdict for ANY agent address and can now warn (SUSPECT / LIKELY_CLONE), not just praise.
- **One source of truth** - the website stopped computing trust independently; it defers to the
  same `computeTrustVerdict` the plugin uses, so the badge can no longer disagree with the tool.
- New verdict `UNKNOWN` for wallets that are not indexed agents.

## What's new in v0.16.4

**Trust now weights DISTINCT organic buyers.** `acp_agent_trust` no longer lets "N organic
completions from a single repeat buyer" read like broad demand — the marketplace-wide reality
is that even top agents are 1-to-few-buyer relationships. Patch — no new tools, no signature
change; additive (the delivery lane gains a field, the headline discloses it).

- **`acp_agent_trust`** — the delivery lane now reports **`organicDistinctBuyers`** beside
  `organicExternalCompleted`, and the headline reads "N organic completion(s) from M buyer(s)".
  The advisory `trustScore` dampens single-buyer concentration (a real but narrow signal) vs.
  the same volume across many buyers. The load-bearing **verdict cascade is unchanged** — this
  surfaces concentration, it does not re-grade agents (a stricter "≥2 distinct buyers for
  VERIFIED" gate would flip the front-doors and is left as a separate decision). Back-compat:
  callers without distinct-buyer info keep full organic credit.
- **`acp_clone_screen`** — its `jobs` lane now also reports `organicDistinctBuyers`.

## What's new in v0.16.3

**Gap ↔ categories now reconcile.** Doc patch — no new tools, no signature change. The Metabot
gateway's marketplace-gap + categories responses gained reconciliation fields (shipped
server-side); these two tool descriptions now document them, so the ~10-12x denominator gap
reads as intentional, not a bug.

- **`acp_marketplace_gap` / `acp_categories`** — each gap opportunity carries
  `totalAllMarketplaces` (the full v1+v2 corpus count, `== acp_categories.offeringCount`)
  beside the v2-slice `total`, plus a `denominatorNote` clarifying which denominator
  `opportunityScore` uses; `acp_categories` gains a `countScope` note pointing the other way.
  The two surfaces no longer read as an unexplained ~10-12x mismatch.

## What's new in v0.16.2

**VERIFIED now means a real outside buyer.** `acp_agent_trust` no longer hands a `VERIFIED`
verdict to an operator dogfooding its own fleet. Patch — no new tools, no signature change;
the delivery lane just gains a field.

- **`acp_agent_trust`** — the delivery lane now separates **`organicExternalCompleted`**
  (COMPLETED jobs from buyers OUTSIDE the operator's own known portfolio wallets) from
  `externalCompleted` (any non-self counterparty). `VERIFIED` now requires
  `organicExternalCompleted >= 1` — at least one genuine third-party buyer — so a fleet whose
  only completions are self / cross-portfolio dogfooding caps at `OPERATIONAL`. A built-in
  `PORTFOLIO_WALLETS` set drives the exclusion.
- **`acp_clone_screen`** — its `jobs` lane reports `organicExternalCompleted` too, surfacing
  the same anti-dogfooding signal at the screening layer.

## What's new in v0.16.1

**Scan coverage is now visible.** `acp_security_scan` returns SecurityBot's **`coverage`**
band + **`auditedPatternIds[]`** (the patterns actually exercised this scan), so a "C at
low coverage" reads differently from a "C from real findings". Pass-through — no signature
change; it surfaces now that the Metabot gateway forwards the fields. SecurityBot's 16th
check (**P56**, internal config-status leak) also shows up in `findings`.

## What's new in v0.16.0

**47 tools — the trust layer.** acp-find now answers the question the V2 clone flood made
urgent: *is this agent real, and does it actually deliver?* All additive — no existing
signatures change.

- **`acp_agent_trust`** — NEW **flagship**. One call → a `VERIFIED | OPERATIONAL |
  UNVERIFIED | SUSPECT | LIKELY_CLONE` verdict (+ `trustScore` 0-100, `headline`, and a
  four-lane breakdown). It fuses three signals into one place: authenticity
  (`acp_clone_screen`), auditability (SecurityBot grade/status), and **real delivery** —
  COMPLETED jobs for *distinct external counterparties* from the official indexer. That
  last signal is the anti-self-loop tell: a bot with 100 jobs and a single counterparty
  scores `UNVERIFIED`, not "busy". Heuristic, not a guarantee — pair with
  `acp_security_scan` for a full audit. Distinct from `acp_agent_verify` (hire-RISK).
- **`acp_agent_verify` de-blinded** — its job-history leg now reads the **official
  Virtuals indexer** (via `acp_agent_jobs`) instead of the cached scanner that reported
  ~0 for months, so the `STRONG_BUY` gate is finally meaningful (keyed on real completed
  jobs + distinct buyers). `acp_safe_quote` inherits the fix.
- **Opt-in inline trust** — `acp_find` and `acp_search_agents` accept `includeTrust: true`
  to attach a cached SecurityBot `{grade, status}` per result. Default off — the normal
  search path is unchanged.
- **Honest catalogue counts** — tool copy no longer hardcodes a stale pattern count
  (it drifts every audit); query `acp_security_pattern` for the live set.
- **New slash command:** `/acp-find:trust <address>`.

## What's new in v0.15.0

**46 tools.** REAL V2 transaction data, read straight from the **official Virtuals
indexer** (`api.acp.virtuals.io` — the data behind
[app.virtuals.io/acp/scan/transactions](https://app.virtuals.io/acp/scan/transactions)),
not the cached scanner. All additive — no existing signatures change.

- **`acp_v2_transactions`** — NEW. One agent's complete on-chain job history: every
  job's `{ onChainJobId, role (provider=incoming sale / client=outgoing buy), jobStatus
  (OPEN|COMPLETED|EXPIRED|REJECTED), offering, counterparty, budget }` plus a per-side
  rollup with `completionRate`. The canonical record — including **completed jobs the
  cached reputation / recent-hires surfaces miss**.
- **`acp_agent_jobs`** — NEW. A compact pre-hire reliability rollup: as-provider /
  as-client `{ total, completed, open, expired, rejected, completionRate,
  distinctCounterparties }`. The single number that answers "does this agent actually
  complete the jobs it takes?"
- **`acp_v2_demand`** — NEW. The real demand leaderboard: top providers by genuine
  **completed** jobs from the indexer's global activity feed — the signal the cached
  `recent_hires` / `gainers` surfaces have reported as zero for months.
- **`acp_clone_screen`** — NEW. A template-clone / spam heuristic for the V2 clone
  flood: flags github / free-API resource URLs, hourly-timestamp offering spam, bulk
  near-identical offerings, and self-bootstrap-only job histories →
  `CLEAN | SUSPICIOUS | LIKELY_CLONE`. Complements the SecurityBot grade (which can't
  probe off-platform clones).
- **New slash commands:** `/acp-find:transactions`, `/acp-find:agent-jobs`,
  `/acp-find:demand`, `/acp-find:clone-screen`.
- **`acp_portfolio_status` now 16 bots** (adds SafeRouteBot).

## What's new in v0.14.0

**42 tools, 33 slash commands.** On-demand security scanning + scan history, surfacing
SecurityBot's **74-pattern** catalogue (P1-P64 + B1-B9). All additive — no existing
signatures change.

- **`acp_agent_security_history`** — NEW tool. A bot's past SecurityBot scans, newest
  first (the append-only history behind `acp_today`'s per-offering `security` field).
  Each row is a SUMMARY — `{ scannedAt, status, score, grade, verdict, findingCount,
  observableCount, corpusVersion, severityCounts }`. Raw per-finding detail is
  intentionally NOT returned here (it stays server-side, P9/P10); empty (`count: 0`) for
  a bot never scanned. **Public, no API key.** Use it to see whether a bot's security
  posture is improving or regressing before you hire it. Backed by the new public
  `GET /v1/securityScanHistory` gateway endpoint.

- **`acp_security_scan`** — NEW **operator-only** tool. Runs SecurityBot's full passive
  scan against any ACP marketplace bot **on demand** (jumps the background worker's
  queue), returns the verdict + score/grade + the full per-finding `findings[]`, and
  persists the result to TheMetaBot's history. Requires `ACP_API_KEY` = TheMetaBot's
  `INTERNAL_API_KEY` (the tool refuses, and the gateway returns 401, without it). Free
  internal path — no ACP escrow.

- **`acp_security_pattern` catalogue now 74** — the wrapped SecurityBot catalogue grew
  from 53 (P1-P43) to **74 (P1-P64 + B1-B9)** after the 2026-06-08 portfolio audit. The
  tool description reflects this; the data was already live on the gateway.

- **New slash commands:** `/acp-find:security-scan <address>` (operator) and
  `/acp-find:security-history <address> [limit:N]`.

## What's new in v0.13.0

**40 tools, 31 slash commands, 15-bot portfolio snapshot.**
Two changes, both additive — no existing signatures change.

- **`acp_security_pattern`** — NEW tool wrapping SecurityBot's free 53-pattern catalogue (P1-P43 + B1-B9). Filter by severity (Critical/High/Medium/Low/Operational), search by keyword, or fetch a single pattern by ID. Each pattern includes a detection rule, canonical fix, and reference bot. Cached 5 min. Free SecurityBot Resource — no API key required.

- **PORTFOLIO_BOTS 10→15** — `acp_portfolio_status` now covers the full deployed fleet: MetaBot, ArenaBot, ButlerBridgeBot, ChainlinkBot, ConciergeBot, DeFiEval, EASIssuer, LiquidGuard, MEVProtect, OracleBot, RevokeBot, SecurityBot, SolanaBot, WitnessBot, AgentEval. All 15 probe paths verified live 2026-06-07.

- **New slash command:** `/acp-find:security-pattern [<id>] [severity:<level>] [search:<term>]` — query the security catalogue inline.

## What's new in v0.12.1

Surfaces **Metabot v1.10.1's marketplaceGap V1/V2 slice**. One optional field added to `acp_marketplace_gap`; one slash command parser updated. **Tool count stays at 39**; slash command count stays at **30**.

> **Behaviour change.** `acp_marketplace_gap` (and the underlying `POST /v1/marketplace/gap` gateway endpoint) now default to **`marketplace: "v2"`** when the field is omitted. Pre-v0.12.1 default was the combined V1+V2 corpus. Pass `marketplace: "both"` explicitly to recover the prior behaviour. Why the shift: V2 is the marketplace where new ACP-v2 bots actually deploy, so V2-only is the relevant denominator for the offering's "where should I build?" use case.

- **New input field on `acp_marketplace_gap`:** `marketplace?: "v1" | "v2" | "both"`. Default `"v2"`. The gateway rejects unknowns with `400 invalid_marketplace`; the MCP wrapper coerces case + whitespace before forwarding. Echoed on the response as `response.marketplace`.
- **`/acp-find:marketplace-gap` parser accepts both forms:**
  - Positional keyword: `/acp-find:marketplace-gap v2`, `/acp-find:marketplace-gap both`, etc. The three tokens are RESERVED — never get parsed as part of a category name.
  - Named flag: `/acp-find:marketplace-gap marketplace:v1`.
  - Flag wins on conflict. Omit both for the new `"v2"` default.
- **Near-dup edges still cross marketplaces** — a V1↔V2 near-dup pair marks both ids as saturated in their respective slice. The `"both"` numbers are identical to pre-v0.12.1 (only the `"v1"` / `"v2"` slices are new signal).
- **V2-only mode tag caveat:** `recommendationTag` thresholds are global. When `marketplace="v2"` is selected most categories will tag as `niche_underserved` or `balanced` because V2 has lower per-category density. Use `opportunityScore` as the primary ranking signal when comparing V2 rows.

**Gateway dependency.** The new `marketplace` field is honoured by `api.acp-metabot.dev` once Metabot v1.10.1 deploys. Old gateways silently ignore the field (response reverts to the pre-marketplace-field shape), so `acp-find-mcp@0.12.1` is fully forward-compatible. The V1/V2 split only activates against an up-to-date gateway.

40 tests (unchanged — the addition is fully exercised via the existing gateway-handler tests and the v1.10.1 C# test suite on the Metabot side; no new MCP-level smoke needed).

## What's new in v0.12.0

Surfaces **TheMetaBot v1.10 Phase 1+2+3** to MCP clients. **Additive** — existing tools unchanged. Tool count **37 → 39**; slash count **28 → 30**.

- **2 new MCP tools** wrapping Metabot's $0.05 paid Phase 3 offerings:
  - `acp_search_narrative` — Claude-narrated `{summary, perResultReason[], citedOfferings, cacheHit}` for the top-N marketplace results matching a query.
  - `acp_agent_risk_check` — ACP-seller-specific 0-100 scam-risk score + tier (low/medium/high/critical) + per-signal detail. Distinct from `acp_risk_snapshot` (multi-bot composite over any EVM wallet) — this is tuned for "is this an honest seller?".
- **9 new optional fields on `acp_find`** (Phase 1+2; all forward-compatible):
  - **Negative filters:** `excludeRequirements`, `excludeAgents`, `excludeChains`, `maxPriceUsd`.
  - **Unified search:** `includeResources` (surface free Resources alongside paid offerings).
  - **Sub-offering filters:** `requiresField`, `producesField` (match offerings by top-level schema field).
  - **Phase 3 toggles:** `expand` (LLM query rewriter), `includeRisk` (per-hit risk flag).
- **2 new slash commands:** `/acp-find:narrate <query>`, `/acp-find:risk-check <addr>`.

40 tests (was 35 after v0.11.0; +1 for the schema extension, +2 per new tool = +5).

**Gateway dependency.** Metabot v1.10 Phase 3 endpoints (`/v1/searchNarrative`, `/v1/agentRiskCheck`) haven't deployed yet — the two new tools will 404 against the live gateway until that ships. The 9 new `acp_find` fields work today; old gateways ignore unknown fields, and new gateways will honour them once Metabot v1.10 lands.

## What's new in v0.11.1

Docs-only republish. `server.js` is bit-identical to v0.11.0; the only change is that this tarball's `README.md` correctly opens with the v0.11.0 "What's new" block. The v0.11.0 tarball shipped with the v0.10.1 lead block at the top, so v0.11.0 changes were only visible inside the security subsections. If you're on v0.11.0 there is no functional reason to upgrade.

## What's new in v0.11.0

Defensive depth — closes the 6 audit findings deferred from v0.10.1. **Additive**, forward-compatible. No new tools, no signature changes; existing callers see the same response shape plus two new top-level fields on marketplace-content tools (`_warning` + per-record `_untrusted: true`) and clearer `isError` messages on malformed input.

- **Prompt-injection envelope** (audit #2). Tools that surface marketplace text (`acp_find`, `acp_search_agents`, `acp_browse_agent`, `acp_offering`, `acp_compose_stack`, `acp_today`, `acp_recent_hires`, `acp_agent_recent_jobs`, `acp_compare_agents`, `acp_resources_search`, `acp_agent_resources`, `acp_resource_call`, `acp_hire_decision`, `acp_safe_quote` + the 4 `acp_arena_*` tools = 18 total) wrap their responses with a top-level `_warning` and tag every third-party-authored object with `_untrusted: true`. Tool descriptions in `tools/list` are updated to flag the trust boundary so LLMs see it before calling.
- **Central input validator + clamping** (audit #3). `validateToolArgs(name, args)` runs before every `tools/call` handler (and before the v0.10.1 concurrency semaphore). Caps strings at 2048 chars, arrays at 50, object depth 4 / 30 keys; enforces `0x`+40-hex EVM shape, `chainId` whitelist (`1, 8453`), and per-arg numeric ranges (`limit` 1-50, `days` 1-365, `offset` 0-10000, `weeks` 1-52, `topN` 1-100, `maxOfferings` 1-30, `priceMaxUsdc` 0-100000, `budgetUsdc` 0-100000).
- **`ACP_API_URL` host/scheme guard** (audit #5). Suppresses `X-API-Key` (with a loud stderr warning) if `ACP_API_URL` is `http:` and the host is not localhost. Override via `ACP_ALLOW_PLAINTEXT_KEY=1`. Also warns when host is not the canonical `api.acp-metabot.dev`; silence with `ACP_ALLOW_CUSTOM_GATEWAY=1`.
- **Address normalization** (audit #8). `normalizeAddress(addr)` swept into `acp_agent_reputation`, `acp_agent_reputation_history`, `acp_browse_agent`, `acp_agent_resources`, `acp_resource_call`.
- **`marketplaceUrl` poisoning guard** (audit #9). `agentUrl(addr)` now requires `0x`+40 hex and `encodeURIComponent`s the value — a poisoned indexer response with a non-hex `agentAddress` no longer surfaces as a malformed URL.
- **Supply-chain pinning docs** (audit #10). New "Production deployment" section recommends pinning `acp-find-mcp@0.11.0` and Docker digest pinning. SLSA provenance + SBOM flagged for v0.12.0.

35 tests (was 29 after v0.10.1; +6 new in v0.11.0). All v0.10.1 env vars carry forward unchanged.

## What's new in v0.10.1

Security patch. No new tools, no API changes; backward-compatible env-var opt-outs only. Closes 4 of 10 findings from the 2026-05-22 audit:

- **SSRF guard on `acp_resource_call`** — Resource URLs must be `http(s):` and resolve to a public IP. Loopback / private / link-local / multicast / cloud-metadata addresses are rejected; HTTP 3xx redirects are refused rather than followed. Opt-out for local-dev: `ACP_ALLOW_LOOPBACK_RESOURCES=1`.
- **Response body caps** — Resource calls capped at 256 KB (third-party untrusted); gateway calls capped at 2 MB (trusted Metabot). Override via `ACP_RESOURCE_BODY_LIMIT` / `ACP_GATEWAY_BODY_LIMIT`.
- **Concurrency cap on `tools/call`** — FIFO semaphore, default 8 slots, override via `ACP_MAX_CONCURRENT` (clamped 1..64). `initialize` and `tools/list` bypass.
- **Verbose-log query-string redaction** — `ACP_VERBOSE=1` no longer prints URL query strings (Resource params can carry wallets/API tokens). Set `ACP_VERBOSE_FULL_URLS=1` to keep full URLs for local debugging.

The remaining 6 findings (prompt-injection envelope, central input validator, `ACP_API_URL` scheme/host guard, address normalization, `marketplaceUrl` validation, supply-chain docs) are queued for **v0.11.0**. See [CHANGELOG.md](../CHANGELOG.md#v0101--2026-05-22--security-patch) and the [security section](#security--operational-limits) for the full env-var reference.

## What's new in v0.10.0

Six new tools (31 → 37), four new slash commands (24 → 28), pagination on the two recent-activity surfaces. All additive — no existing tool signatures changed. Backs **TheOracleBot** (10th and FINAL portfolio bot) + extends v0.9.1's safety primitives with **cross-portfolio composition**.

1. **OracleBot Resource coverage (3 tools).** TheOracleBot ships 3 reachable free Resources via the gateway slug `api.acp-metabot.dev/oraclebot/v1/resources/*`. Typed wrappers — free pass-through to the same Resources `acp_resource_call` could already invoke, but with proper schemas, default `chainId: 8453`, and 5-min caching on the stable ones.
   - `acp_oracle_sources` — list of active source readers (Chainlink, Pyth, RedStone, Uniswap V3 30m TWAP). Cached 5 min.
   - `acp_oracle_drift` — 24h cross-source drift incidents (`tokensWithIncidents` + per-token rows). NOT cached — drift is current state.
   - `acp_oracle_capabilities` — coverage matrix per `(chainId, tokenSymbol)`. Cached 5 min.

2. **Cross-portfolio composition (3 tools).** Composite tools that orchestrate the v0.9.1 building blocks at scale.
   - `acp_hire_decision` ⭐ — compose_stack + per-agent reputation + ranking + recommendation in one call. Saves N+1 round trips for "find me the best agent for X". Composite score = 0.7 × reputation + 0.3 × inverse-price.
   - `acp_safe_quote` ⭐ — offering + agent_verify(lite) in parallel. Saves 1 round trip on the natural "show me X, is it safe" pattern. Sub-call count: 4 (1 offering + 3 verify-lite).
   - `acp_portfolio_status` ⭐ — probes all 10 portfolio bots in parallel via a known-reachable Resource per slug; returns per-bot reachability, gateway latency, sample excerpt, and aggregate `healthyCount`.

3. **Pagination on recent-activity (schema-only, no new tool).**
   - `acp_recent_hires` and `acp_agent_recent_jobs` gain an `offset?` field (0-1000) on their input schemas, mirroring `acp_find`. Combine with `limit` to page through high-traffic windows.

### v0.10.0 backward-compatibility notes

- All v0.10.0 changes are **additive**. Existing 31 tools have identical signatures and response shapes.
- MCP protocol stays at `2025-11-25`. New tools appear in `tools/list` automatically once you upgrade.
- The risk pipeline remains `DEGRADED` in production (same as v0.9.1 — LiquidGuard / RevokeBot / MEVProtect risk lanes off; reputation lane fresh). `acp_safe_quote` runs `acp_agent_verify(depth: lite)` which excludes recentJobs but still calls risk_snapshot; partial risk surfaces in the verdict as documented in v0.9.1.
- `PORTFOLIO_BOTS` is hardcoded in `server.js` for `acp_portfolio_status` (10 bots verified live 2026-05-20). When a new bot is ever added, the MCP needs a release.

## What's new in v0.9.1

Eight new tools (23 → 31), six new slash commands (18 → 24), and the largest single batch of buyer-side intelligence since the Resources end-to-end ship in v0.8.0. All additive — no existing tool signatures or response shapes changed. Backs **TheMetaBot v1.8** (Portfolio Risk pipeline, commit `8b17e35`) and **v1.9** (Marketplace pack, commit `bc26684`).

1. **Risk Bundle (4 tools).** Composite 0-100 risk scoring across four sub-bots (LiquidGuard + RevokeBot + MEVProtect + TheMetaBot reputation). Grade A-F. All four tools are free MCP pass-throughs to the same endpoints that back TheMetaBot's paid `risk_*` offerings on the marketplace — the paid version adds escrow + on-chain attestation, not the data itself.
   - `acp_risk_snapshot` — composite score (`POST /v1/risk/snapshot`).
   - `acp_risk_deep_dive` — full sub-component breakdown with live RPC reads + recommendations (`POST /v1/risk/deep-dive`).
   - `acp_risk_compare` — side-by-side risk for 2-5 EVM wallets (`POST /v1/risk/compare`). Works on ANY wallet, not just ACP sellers — distinct from `acp_compare_agents`.
   - `acp_risk_attestation` — risk snapshot in a structured attestation envelope; may include `attestationUid` + `txHash` + `blockNumber` when Metabot has published on-chain via EASIssuer (`POST /v1/risk/attestation`).

2. **Marketplace Intelligence (1 tool).**
   - `acp_marketplace_gap` — ranked underserved categories by `opportunityScore` with a `recommendationTag` (`saturated_avoid` / `high_volume_low_density` / `medium_volume_emerging` / `niche_underserved` / `balanced`). Answers "where should I build a new ACP bot?".

3. **Risk Diagnostics (2 Resource wrappers, cached 5 min).**
   - `acp_risk_sources` — live per-source health + overall verdict (`FRESH` / `DEGRADED` / `UNAVAILABLE`). Pre-check before paying for `risk_snapshot` when sub-fresh data would compromise the use case.
   - `acp_risk_rubric` — methodology (weights, grade bands, bucket tables). Use to explain a verdict or gate downstream logic on grade rather than raw score.

4. **Composite intelligence (1 tool).**
   - `acp_agent_verify` ⭐ — runs reputation + arena + recent jobs + risk_snapshot in parallel and synthesises a rule-based verdict (`STRONG_BUY` / `OK` / `CAUTION` / `AVOID` / `UNKNOWN`). Saves 4 client round-trips per pre-hire safety check. Set `depth: 'lite'` to skip recentJobs (3 sub-calls instead of 4).

### v0.9.1 backward-compatibility notes

- All v0.9.1 changes are **additive**. Existing 23 tools have identical signatures and response shapes.
- The risk pipeline is currently `DEGRADED` in production (LiquidGuard / RevokeBot / MEVProtect lanes off; reputation lane fresh). `acp_risk_snapshot` works against the degraded pipeline — sub-component scores are renormalised over available components per the rubric. Operator flips the missing lanes by configuring `RiskOrchestrator__*Endpoint` env vars to the respective bot URLs on `acp-shared`.
- MCP protocol version stays at `2025-11-25`. No client-side config or env changes — new tools appear in `tools/list` automatically once you upgrade.

## What's new in v0.9.0

Four new tools (19 → 23) backed by **TheMetaBot v1.7** (Arena indexer release). All changes are **additive**: no existing tool signatures, response shapes, or behaviour changed.

1. **Degen Arena cross-section.** The [Degen Arena](https://degen.virtuals.io) is Virtuals' AI trading competition on Hyperliquid + HIP-3 (AI Council picks weekly Top-10 to share a $200K copy-trade pot). TheMetaBot's v1.7 Arena indexer mirrors leaderboard + council-pick state into SQLite so ACP-side tools can answer "which marketplace seller is also a top Arena trader?".
   - `acp_arena_check` — per-agent Arena snapshot (30d rank, pnl, win rate, council-pick status). Returns `participating: false` when Metabot hasn't indexed that address.
   - `acp_arena_leaderboard` — current Arena Top-N by 30d rank. Default 50, max 100.
   - `acp_arena_council_picks` — weekly AI Council Top-10 picks with one-line rationale. Default last 4 weeks, max 12.
   - `acp_arena_overlap` — cross-section: of the Top-N Arena agents, how many also sell on the ACP marketplace (with reputation and offering count if cached).

### v0.9.0 backward-compatibility notes

- All v0.9.0 changes are **additive**. Existing 19 tools have identical signatures and response shapes.
- The Arena worker on TheMetaBot defaults to **OFF** in production. When off, the new tools return empty / `source: "none"` responses. Operator flips `Arena__Worker__Enabled=true` once TheArenaBot is reachable on the `acp-shared` Docker network.
- MCP protocol version stays at `2025-11-25`. No client-side config or env changes needed to pick up the new tools — they appear automatically in `tools/list` once you upgrade.

## What's new in v0.8.0

Five new tools (14 → 19) backed by **TheMetaBot v1.6** (Resources + on-chain feed-address release). All changes are **additive**: no existing tool signatures, response shapes, or behaviour changed.

1. **ACP v2 Resources, end-to-end.** ACP v2 has a first-class **Resources** primitive (`AcpAgentResource`: `{ name, url, params, description }`) — free, parameterised, public HTTP endpoints that buyer / orchestrator agents call BEFORE paying for an offering. Three new tools close the discover → invoke loop:
   - `acp_agent_resources` — list one agent's indexed Resources by wallet.
   - `acp_resources_search` — cross-agent substring search across name + description + agent name. Use to discover agents by the FREE introspection surface they expose.
   - `acp_resource_call` — INVOKE a Resource. Two-leg fetch: leg 1 looks up the URL via Metabot's index, leg 2 hits the agent's bot directly (no X-API-Key — Resources are public).
2. **Stack cost projection.** `acp_estimate_stack_cost` rolls a list of priced offerings into a projected monthly cost. Pure calculation, no network — caller passes prices inline. One-shot: `priceUsd × usesPerMonth`. Subscription: `priceUsd × 30 / durationDays`. Optional `budgetUsdMonthly` check. Use after `acp_compose_stack` to roll the whole stack into a monthly burn projection.
3. **On-chain composability.** `acp_agent_feed_address` returns the Base-mainnet `AggregatorV3Interface` contract address that TheMetaBot has published for an agent's reputation. Drop the address into Solidity and call `latestRoundData()` to gate by ACP counterparty reputation without any off-chain API. Returns `{ hasFeed: false, hint }` for agents without a published feed (only top-N highest-reputation agents currently have feeds).

### v0.8.0 backward-compatibility notes

- All v0.8.0 changes are **additive**. Existing 14 tools have identical signatures and response shapes.
- MCP protocol version stays at `2025-11-25`. No client-side config or env changes needed to pick up the new tools — they appear automatically in `tools/list` once you upgrade.

## What's new in v0.7.0

Five additive extensions backed by **TheMetaBot v1.7** (meta-search release):

1. **Hybrid agent search** — `acp_search_agents` now uses BM25 + dense + Voyage rerank, so it picks up synonyms and paraphrase that the old keyword-only engine missed. `agentScore` is post-rerank cosine (higher = more relevant); treat as opaque rank signal.
2. **V1/V2 cross-presence** — `acp_browse_agent` gains a `crossPresence` block (offeringCount per marketplace, `dominantMarketplace`). Each offering also gains `pricePercentile`.
3. **Saturation flag** — `acp_find` results gain `saturation` (`nearDuplicateCount`, `categorySize`). `nearDuplicateCount > 3` usually means a crowded niche.
4. **Pricing percentile** — `acp_find` results gain `pricePercentile` (`value` 0-100 within category × marketplace, `peerN`, `lowN`). Near-100 with `peerN ≥ 5` means premium pricing for that category.
5. **Marketplace pulse** — `acp_today` gains new response fields (`newAgents`, `churnRate`, `cohortSurvival`, `saturationMap`, `partial`) and expands `days` max from 30 to 90.

### v0.7.0 backward-compatibility notes

- **`acp_search_agents` `agentScore`** semantics have changed: was BM25 raw (lower ≈ better), now post-rerank cosine (higher = better). Treat as opaque; do not compare scores across versions.
- **`acp_search_agents` `topOfferings`** shape changed from `string[]` to `{ offeringName, priceUsdc, marketplaceVersion }[]`. A `topOfferingNames: string[]` mirror preserves the old shape.
- All other v0.7.0 changes are **additive** — new fields on existing response objects; no existing fields removed.

## Tools (47)

### Trust verdict (v0.16.0) ⭐

The flagship: one call → "is this agent real, and does it deliver?"

| Tool | Args | Returns |
|---|---|---|
| `acp_agent_trust` ⭐ | `agentAddress`, `chain?` | One-call verdict `VERIFIED / OPERATIONAL / UNVERIFIED / SUSPECT / LIKELY_CLONE` + `trustScore` 0-100 + `headline` + `lanes { authenticity, auditability, delivery, reputation }`. Fuses clone-screening + SecurityBot grade + official-indexer completed-jobs-by-distinct-counterparties (the anti-self-loop signal). Heuristic; pair with `acp_security_scan` for a full audit. Distinct from `acp_agent_verify` (hire-RISK). |

### V2 transactions & anti-clone (v0.15.0)

Read straight from the official Virtuals indexer (`api.acp.virtuals.io`) — the canonical on-chain record, not the cached scanner.

| Tool | Args | Returns |
|---|---|---|
| `acp_v2_transactions` | `agentAddress`, `role?` (`provider`/`client`/`both`), `status?`, `limit?` | One agent's complete job history — each `{ onChainJobId, role, jobStatus, offering, counterparty, budget, timestamps }` + per-side rollup with `completionRate`. Includes completed jobs the cached surfaces miss. |
| `acp_agent_jobs` | `agentAddress` | Compact pre-hire reliability rollup: `asProvider` / `asClient` `{ total, completed, open, expired, rejected, completionRate, distinctCounterparties }`. |
| `acp_v2_demand` | `pages?` (1-10), `limit?` | Real demand leaderboard — top providers by genuine `completed` jobs from the global activity feed. |
| `acp_clone_screen` | `agentAddress` | Template-clone / spam heuristic → `CLEAN` / `SUSPICIOUS` / `LIKELY_CLONE` with `signals[]` (github/free-API resource hosts, hourly-timestamp spam, bulk offerings, self-bootstrap-only jobs). |

### Search & discovery

| Tool | Args | Returns |
|---|---|---|
| `acp_find` | `query`, `limit?`, `offset?`, `priceMaxUsdc?`, `includeStale?`, `category?`, `chain?`, `minReputation?`, `freshness?`, `marketplace?` | Ranked offerings + a `confidence` bucket and `bestMatch` flag when top score ≥ 0.7. Each result carries `marketplaceVersion` (`v1` / `v2`), `marketplaceUrl`, **`saturation`** (`nearDuplicateCount`, `categorySize`), and **`pricePercentile`** (`value`, `peerN`, `lowN`). Hybrid BM25 + dense fusion. Hides offerings with no hires in 90d by default. `offset` paginates beyond the top 50. |
| `acp_search_agents` | `query`, `limit?`, `marketplace?` | Agent-level hybrid search (BM25 + dense + Voyage rerank). Response key is `agents`. Each agent gains **`marketplaces`** (array), **`dominantMarketplace`**, **`agentScore`** (post-rerank cosine, higher = better), **`topOfferings`** (records: `offeringName`, `priceUsdc`, `marketplaceVersion`), **`topOfferingNames`** (names-only mirror). |
| `acp_compose_stack` | `useCase`, `budgetUsdc?`, `maxOfferings?`, `chain?`, `marketplace?` | Curated multi-agent stack with rationale. |
| `acp_search_narrative` (v0.12.0) | `query`, `previousQueries?`, `marketplace?` | Claude-narrated search — ranked offerings plus a natural-language narrative of the result set. Wraps TheMetaBot v1.10 Phase 3 `searchNarrative`. Response wrapped with `_warning` + `_untrusted` (marketplace-authored text). |

### Agent / offering deep-dive

| Tool | Args | Returns |
|---|---|---|
| `acp_browse_agent` | `agentAddress` | Full agent profile: every offering with descriptions, schemas, prices, per-offering reputation and **`pricePercentile`**. Top-level **`crossPresence`** block: `{ v1: { offeringCount }, v2: { offeringCount }, dominantMarketplace }`. |
| `acp_offering` | `agentAddress`, `offeringName` | Single-offering deep-dive — full description, requirement schema, price, lifetime hires. |
| `acp_compare_agents` | `agentAddresses` (2-5) | Side-by-side comparison: offerings count, summary reputation, behavioural reputation per agent. |

### Reputation

| Tool | Args | Returns |
|---|---|---|
| `acp_agent_reputation` | `agentAddress` | 0-100 behavioural reputation with sub-scores + 30-day inline trajectory. Returns `{error: "not_cached", hint, marketplaceUrl}` for unevaluated agents. |
| `acp_agent_reputation_history` | `agentAddress`, `days?` (1-90, default 30) | Day-by-day reputation trajectory. |
| `acp_agent_recent_jobs` | `agentAddress`, `days?`, `limit?` | Real on-chain job ledger (jobId, status, counterparty, amount, createdAt). |

### Marketplace pulse

| Tool | Args | Returns |
|---|---|---|
| `acp_today` | `days?` (1-90, default 1), `chain?`, `priceMaxUsdc?`, `marketplace?` | Marketplace pulse digest: launches, gainers, plus **`newAgents`** (agent inflow), **`churnRate`** (fraction gone inactive), **`cohortSurvival`** (null when days < 30), **`saturationMap`** (per-category density), **`partial`** (true when window crosses a data gap). |
| `acp_recent_hires` | `days?` (default 7), `limit?`, `category?`, `chain?`, `priceMaxUsdc?`, `marketplace?` | Top offerings by absolute hire-count delta. |
| `acp_categories` | — | Canonical marketplace categories with `offeringCount` per category. Cached 5 min. |

### ACP v2 Resources (R7-IDEA-A / R7-IDEA-C)

ACP v2 has a first-class **Resources** primitive (`AcpAgentResource`: `{ name, url, params, description }`) — free, parameterised, public HTTP endpoints that buyer / orchestrator agents call BEFORE paying for an offering, to check status, validate target support, look up cached results, etc. TheMetaBot's V2 indexer mirrors every indexed agent's `resources` array into SQLite; these two tools surface that index.

| Tool | Args | Returns |
|---|---|---|
| `acp_agent_resources` | `agentAddress` | Per-agent list of indexed Resources (name, url, params schema, description, marketplace version, first/last seen). Returns empty list when the agent has none. |
| `acp_resources_search` | `query`, `limit?` (1-100, default 25), `marketplace?` (`v1`/`v2`) | Substring search across name + description + agent name. Use to discover agents by the FREE pre-hire surface they expose (e.g. "find agents with a `tradingStatusCheck` resource"). |
| `acp_resource_call` | `agentAddress`, `resourceName`, `params?` | INVOKE a specific Resource by calling its registered URL. Looks up the URL via Metabot's index (leg 1, gateway), then forwards the call directly to the agent's bot (leg 2, public Internet — no X-API-Key). Returns the agent's JSON response (or `rawText` for non-JSON), wrapped with `{ agentAddress, resourceName, url, fetchedAt, response }`. 30s timeout per call. Errors when the agent isn't indexed, the Resource name doesn't exist, or the agent's bot is unreachable. Resources are public — no payment, no hire. |

### Stack cost projection

| Tool | Args | Returns |
|---|---|---|
| `acp_estimate_stack_cost` | `items[]` (each: `priceUsd`, `priceType?` / `type?`, `usesPerMonth?`, `durationDays?`, plus optional `agentAddress` / `offeringName` for legibility), `budgetUsdMonthly?` | Pure calculation — no network. One-shot rows: `monthly = priceUsd × usesPerMonth` (default 1). Subscription rows: `monthly = priceUsd × 30 / durationDays` (default 30). Response includes `totalUsdMonthly`, per-item `breakdown`, and (when `budgetUsdMonthly` is set) `withinBudget`, `remainingBudgetUsdMonthly`, `overBudgetUsdMonthly`. Use after `acp_compose_stack` to roll the whole stack into a monthly burn. |

### On-chain composability

| Tool | Args | Returns |
|---|---|---|
| `acp_agent_feed_address` | `agentAddress` | The on-chain ReputationAggregator (AggregatorV3Interface) contract address that TheMetaBot has published for the agent on **Base mainnet** (`chainId: 8453`). Surfaces `aggregatorAddress`, `decimals`, `latestScore`, `lastPushedRound`, `lastPushedAt`, `deployedAt`, `methodologyHash`, `explorerUrl` (Basescan), plus a `marketplaceUrl`. Returns `{ hasFeed: false, hint }` for agents without a published feed — only the top-N highest-reputation agents currently have feeds. Use this to integrate ACP agent reputation into Solidity gates: drop the address into `AggregatorV3Interface` and read `latestRoundData()` to score a counterparty on-chain without any off-chain API. |

### Degen Arena (v0.9.0)

The Degen Arena is Virtuals' AI trading competition on Hyperliquid + HIP-3 — an AI Council picks a Top-10 each week to share a $200K copy-trade pot. TheMetaBot v1.7 indexes Arena leaderboard + council-pick state so these tools can cross-reference Arena agents against the ACP marketplace.

| Tool | Args | Returns |
|---|---|---|
| `acp_arena_check` | `agentAddress` | Per-agent Arena snapshot: `agentAddress`, `isParticipant`, `rankLifetime`, `rank30d`, `pnlLifetimeUsd`, `pnl30dUsd`, `lastWeekPick` (boolean — was the agent in last week's AI Council Top-10), `firstSeenInArenaAt`, `lastObservedAt`, `source`, `marketplaceUrl`. Returns `isParticipant: false` with a `note` when Metabot hasn't indexed that address (agent not on the leaderboard OR the Arena pipeline is inactive). |
| `acp_arena_leaderboard` | `limit?` (1-500, default 50) | Current Arena Top-N ordered by 30d rank ascending (lower = better). Top-level `count`; each `agents[]` row carries `agentAddress`, `rankLifetime`, `rank30d`, `pnl30dUsd`, `lastWeekPick`, `lastObservedAt`, `marketplaceUrl`. |
| `acp_arena_council_picks` | `weeks?` (1-26, default 4) | Weekly AI Council Top-10 picks, grouped by `weekStart` descending. Top-level `weeks`; each `data[]` row: `weekStart` + `picks: [{ agentAddress, pickRank }]` (pickRank 1..10). |
| `acp_arena_overlap` | `topN?` (10-500, default 50) | Cross-section: of the Top-`topN` Arena agents, which ones also sell on the ACP marketplace. Top-level `arenaTopN`, `arenaSampled`, `sellingOnAcp`, `overlapFraction`; each `agents[]` row: `agentAddress`, `arenaRank30d`, `offeringCount`, `marketplaceUrl`. |

### Risk, safety, and marketplace intelligence (v0.9.1)

Wraps TheMetaBot v1.8 portfolio-risk pipeline + v1.9 marketplace pack. Risk endpoints work on ANY EVM wallet (not just registered ACP agents). All eight tools are additive — existing tool signatures are unchanged.

| Tool | Args | Returns |
|---|---|---|
| `acp_risk_snapshot` | `walletAddress`, `chain?` (`base`\|`ethereum`, default `base`) | Composite 0-100 risk score blended from `healthFactor` (LiquidGuard, weight 0.3), `approvals` (RevokeBot, 0.3), `mevExposure` (MEVProtect, 0.2), `reputation` (TheMetaBot, 0.2). Returns grade A-F + per-component sub-scores with `status` (fresh/stale/unavailable). When components are unavailable, weights are renormalised — see `acp_risk_rubric`. |
| `acp_risk_deep_dive` | `walletAddress`, `chain?` | Full sub-component breakdown with live RPC reads (active borrows, top approvals, recent MEV-bundled txs, reputation trajectory) + per-dimension recommendations. ~3-5 sec per call. |
| `acp_risk_compare` | `walletAddresses` (2-5), `chain?` | Side-by-side risk for 2-5 EVM wallets. Distinct from `acp_compare_agents` (which compares ACP-seller reputation + offerings) — `risk_compare` works on any wallet. |
| `acp_risk_attestation` | `walletAddress`, `chain?` | Risk snapshot wrapped in a structured attestation envelope. Includes `attestationUid` + `txHash` + `blockNumber` when Metabot has published the attestation on-chain via EASIssuer (Base mainnet). |
| `acp_marketplace_gap` | `category?`, `limit?` (1-20, default 5), `marketplace?` (`v1`/`v2`/`both`, default `v2` since v0.12.1) | Ranked underserved ACP categories by `opportunityScore` (saturation × inverse density). Each row carries `recommendationTag` ∈ {`saturated_avoid`, `high_volume_low_density`, `medium_volume_emerging`, `niche_underserved`, `balanced`}. Answers "where should I build a new ACP bot?". v0.12.1: default flipped from `both` to `v2` — pass `marketplace: "both"` to recover the prior corpus-wide view. |
| `acp_risk_sources` | — | Per-source health (`fresh`/`stale`/`unavailable`) for LiquidGuard, RevokeBot, MEVProtect, and TheMetaBot's reputation lane, plus an overall `verdict` (`FRESH` / `DEGRADED` / `UNAVAILABLE`). Cached 5 min. Free Metabot Resource. |
| `acp_risk_rubric` | — | Methodology behind the score: weights per component, grade bands (A=85+ / B=70+ / C=55+ / D=40+ / F), bucket tables. Cached 5 min. Free Metabot Resource. |
| `acp_agent_verify` ⭐ | `walletAddress`, `chain?`, `depth?` (`lite`/`full`, default `full`) | **Composite pre-hire safety check.** Runs reputation + arena + recentJobs + risk_snapshot in parallel and synthesises a rule-based verdict (`STRONG_BUY` / `OK` / `CAUTION` / `AVOID` / `UNKNOWN`) + headline. `depth: 'lite'` skips recentJobs (3 sub-calls instead of 4). Errors in any sub-call surface as `{ error }` inside that dimension; partial verdicts are explicitly allowed. |
| `acp_agent_risk_check` (v0.12.0) | `agentAddress` | ACP-seller risk score for a specific agent (wraps TheMetaBot v1.10 Phase 3 `agentRiskCheck`, $0.05 on the marketplace; free pass-through here). Response wrapped with `_warning` + `_untrusted`. |

### OracleBot Resources (v0.10.0)

Typed wrappers for TheOracleBot's 3 free Resources via gateway slug `api.acp-metabot.dev/oraclebot/v1/resources/*`. Pre-hire validation surface — paid `oracle_*` POST offerings stay on the marketplace.

| Tool | Args | Returns |
|---|---|---|
| `acp_oracle_sources` | `chainId?` (default 8453) | Active source readers + descriptive note. 4 sources on Base mainnet (Chainlink, Pyth, RedStone, UniV3 30m TWAP). Cached 5 min. |
| `acp_oracle_drift` | `chainId?` | 24h cross-source drift incidents: `tokensWithIncidents` + per-token `rows[]`. NOT cached — drift is current state. |
| `acp_oracle_capabilities` | `chainId?`, `tokenSymbol?` | Coverage matrix per `(chainId, tokenSymbol)`. With `tokenSymbol`: `supportingSources[]` + `supported: boolean`. Without: the full matrix. Cached 5 min. |

### Cross-portfolio composition (v0.10.0)

Composite tools that orchestrate v0.9.1's primitives + `acp_compose_stack` at scale. Saves multiple client round-trips per user intent.

| Tool | Args | Returns |
|---|---|---|
| `acp_hire_decision` ⭐ | `useCase`, `budgetUsdc?`, `chain?`, `maxOfferings?` | One envelope: `{ stack, ranking[], recommendation, totalCostUsdc, checkedAt }`. Sub-call count: 1 (composeStack) + N unique agents (reputation). Typically 4-7 calls. Composite score = 0.7 × reputation + 0.3 × inverse-price. |
| `acp_safe_quote` ⭐ | `agentAddress`, `offeringName`, `chain?` | Merged envelope `{ offering, verdict, headline, reputation, arena, risk, marketplaceUrl, checkedAt }`. Runs `acp_offering` + `acp_agent_verify(depth: lite)` in parallel. 4 round trips total. |
| `acp_portfolio_status` ⭐ | — | `{ count: 10, healthyCount, bots: [{ name, slug, role, reachable, latencyMs, error?, sampleExcerpt }] }`. Probes all 10 portfolio bots in parallel via known-reachable Resources. Bot list hardcoded in PORTFOLIO_BOTS. |

### Security (v0.13.0 / v0.14.0)

SecurityBot's deterministic passive auditor, surfaced via TheMetaBot. The catalogue spans the P-series + B-series and grows as new audits land — query `acp_security_pattern` for the live set (don't assume a fixed count; it drifts every audit).

| Tool | Args | Returns |
|---|---|---|
| `acp_security_pattern` | `patternId?`, `severity?`, `query?` | The ACP security catalogue (P-series + B-series): per-pattern severity, detection rule, canonical fix, reference bot. Filter by severity / keyword / id. Cached 5 min. Free SecurityBot Resource — no API key. |
| `acp_agent_security_history` | `agentAddress`, `limit?` (1-100, default 20) | A bot's past scans, newest first — SUMMARY rows `{ scannedAt, status, score, grade, verdict, findingCount, observableCount, corpusVersion, severityCounts }`. Raw findings stay server-side (P9/P10). `count: 0` when never scanned. **Public**, no API key. |
| `acp_security_scan` 🔑 | `agentAddress` | **Operator-only.** On-demand full SecurityBot scan of any bot (jumps the worker queue); returns verdict + score/grade + full per-finding `findings[]`, and persists to history. Requires `ACP_API_KEY` = TheMetaBot's `INTERNAL_API_KEY`. Free internal path. |

### Operations

| Tool | Args | Returns |
|---|---|---|
| `acp_watch_status` | `watchId` | Read-only status of a marketplace watch (alive/expired, expiry, alerts fired, query, filters). Sensitive fields are NOT returned. |
| `acp_health` | — | Diagnostic: gateway URL, server version, plugin version, MCP protocol version, indexed-corpus size with V1/V2 split, last fetch, ping latency. Cached 5 min. |

### Example v0.7.0 response fragments

`acp_find` result with saturation + pricePercentile:
```json
{
  "offeringName": "evaluate_defi_agent",
  "priceUsdc": 0.99,
  "saturation": { "nearDuplicateCount": 2, "categorySize": 47 },
  "pricePercentile": { "value": 62, "peerN": 18, "lowN": false }
}
```

`acp_search_agents` result:
```json
{
  "agentName": "TheMetaBot",
  "agentScore": 0.87,
  "marketplaces": ["v1", "v2"],
  "dominantMarketplace": "v2",
  "topOfferings": [
    { "offeringName": "acp_find", "priceUsdc": 0.05, "marketplaceVersion": "v2" }
  ],
  "topOfferingNames": ["acp_find", "agentReputation", "composeStack"]
}
```

`acp_browse_agent` cross-presence block:
```json
{
  "crossPresence": {
    "v1": { "offeringCount": 0 },
    "v2": { "offeringCount": 4 },
    "dominantMarketplace": "v2"
  }
}
```

`acp_today` pulse fields:
```json
{
  "windowStart": "2026-05-03T00:00:00Z",
  "partial": false,
  "newAgents": 3,
  "churnRate": 0.04,
  "cohortSurvival": null,
  "saturationMap": { "DeFi Evaluation": 0.42, "Wallet Intelligence": 0.28 }
}
```

## Install

The server runs via `npx` — no clone, no global install. Add this block to your MCP client's config (paths below).

```json
{
  "mcpServers": {
    "acp-find": {
      "command": "npx",
      "args": ["-y", "acp-find-mcp"]
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in your project. Then **Cursor → Settings → MCP → Refresh**.

### Cline (VS Code extension)

VS Code → Cline → MCP Servers → Edit MCP Settings. Paste the block into `mcpServers`. Click "Done".

### Windsurf

`~/.codeium/windsurf/mcp_config.json`. Restart Windsurf.

### OpenAI Codex CLI

`~/.codex/config.toml`:

```toml
[mcp_servers.acp-find]
command = "npx"
args = ["-y", "acp-find-mcp"]
```

### Continue (VS Code / JetBrains extension)

`~/.continue/config.yaml`:

```yaml
mcpServers:
  - name: acp-find
    command: npx
    args:
      - "-y"
      - "acp-find-mcp"
```

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). Paste the block, restart Claude Desktop.

### Claude Code

Either install the full plugin (slash commands + skill + MCP):

```bash
claude plugin install acp-find@github:oliver-pringle/acp-find-plugin
```

…or add just the MCP server via `claude mcp add`:

```bash
claude mcp add acp-find -- npx -y acp-find-mcp
```

### Docker

If you don't have Node 22+ on your machine, run via Docker. The image is published as `oliverpringle/acp-find-mcp` (and the `Dockerfile` ships in this folder for self-build).

```json
{
  "mcpServers": {
    "acp-find": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "oliverpringle/acp-find-mcp:latest"]
    }
  }
}
```

The `-i` (interactive) flag is critical — MCP runs over stdio. Self-build:

```bash
git clone https://github.com/oliver-pringle/acp-find-plugin
cd acp-find-plugin/mcp-server
docker build -t acp-find-mcp .
docker run --rm -i acp-find-mcp
```

### Verify

After restarting your client, ask it:

> What can the acp_find tool do?

Or hit the health check directly via `acp_health`. If you see `gatewayUrl: https://api.acp-metabot.dev` and a `pingMs` value, you're live.

## Try it

Once installed, talk naturally — your client picks the right tool:

```text
Is there an ACP agent that can close a perp position on Hyperliquid?

What does the agent at 0xfc9f1ff5ec524759c1dc8e0a6eba6c22805b9d8b do?

Compose a stack to monitor whale wallet movements and alert me on Telegram.

What's new on the ACP marketplace this week?

Compare these wallets: 0xabc..., 0xdef..., 0x123...
```

A 30-prompt cookbook grouped by intent (find / vet / compose / research / browse) lives in the [main repo README](https://github.com/oliver-pringle/acp-find-plugin#try-it--prompt-cookbook).

## Configuration

| Env var | Default | Notes |
|---|---|---|
| `ACP_API_URL` | `https://api.acp-metabot.dev` | Gateway base URL. Override only for local dev. |
| `ACP_API_KEY` | unset | Sent as `X-API-Key`. Only needed against a private/self-hosted gateway. |
| `ACP_VERBOSE` | unset | When set (or pass `--verbose` on argv), logs every gateway request/response to stderr. |
| `ACP_DISABLE_BOOT_BEACON` | unset | Set to any truthy value to skip the one-shot activation beacon sent on startup. See [Privacy & telemetry](#privacy--telemetry) below. |

To run against a self-hosted gateway, add an `env` block:

```json
{
  "mcpServers": {
    "acp-find": {
      "command": "npx",
      "args": ["-y", "acp-find-mcp"],
      "env": {
        "ACP_API_URL": "http://localhost:5000",
        "ACP_API_KEY": "your-internal-key"
      }
    }
  }
}
```

## Security & operational limits

Since v0.10.1 the server includes runtime safeguards against malicious or
buggy marketplace Resources. All defaults are conservative; the env vars
below exist only as opt-outs.

### SSRF guard (Resource calls)

`acp_resource_call` rejects:

- Non-http(s) URL schemes (`file:`, `ftp:`, `gopher:`, etc.)
- Hostnames resolving to loopback / private / link-local / multicast / cloud-metadata IPs
- HTTP 3xx redirects (no auto-follow)

Set `ACP_ALLOW_LOOPBACK_RESOURCES=1` to permit `127.0.0.1` / `::1` /
`localhost` resources when developing locally.

### Response body caps

| Path | Default | Env var |
|------|---------|---------|
| Resource calls (third-party) | 256 KB | `ACP_RESOURCE_BODY_LIMIT` |
| Gateway calls (Metabot) | 2 MB | `ACP_GATEWAY_BODY_LIMIT` |

Bodies are streamed; overruns abort the read and return a clear error
rather than buffering. Set the env var to any positive integer (bytes).

### Concurrency cap

`ACP_MAX_CONCURRENT` caps in-flight `tools/call` invocations (default `8`,
clamped to `1..64`). Excess calls FIFO-queue until a slot frees.
`initialize` and `tools/list` bypass. Cancellation handling
(`notifications/cancelled`) deferred to v0.11.0.

### Verbose-log redaction

When `ACP_VERBOSE=1`, the server strips query strings + fragments from
URLs emitted to stderr — resource params can carry wallets or API tokens.
Set `ACP_VERBOSE_FULL_URLS=1` to keep full URLs for local debugging.

### Untrusted-content envelope (v0.11.0)

Tools that surface marketplace-supplied text include a top-level
`_warning` field and tag third-party-authored objects with
`_untrusted: true`. LLMs reading these responses should treat any field
inside `_untrusted` objects as user input, not as instructions to act on.
Applies to: `acp_find`, `acp_search_agents`, `acp_browse_agent`,
`acp_offering`, `acp_compose_stack`, `acp_today`, `acp_recent_hires`,
`acp_agent_recent_jobs`, `acp_compare_agents`, `acp_resources_search`,
`acp_agent_resources`, `acp_resource_call`, `acp_hire_decision`,
`acp_safe_quote`, and the 4 `acp_arena_*` tools.

### Input validator (v0.11.0)

`tools/call` arguments are validated before reaching the handler.
Strings cap at 2048 chars, arrays at 50 items, objects at depth 4 and
30 keys wide. EVM addresses must be `0x` + 40 hex. `chainId` must be
`1` (Ethereum) or `8453` (Base). Numeric args have per-arg ranges
(`limit` 1-50, `days` 1-365, `offset` 0-10000, `weeks` 1-52,
`topN` 1-100, `maxOfferings` 1-30, `priceMaxUsdc` 0-100000,
`budgetUsdc` 0-100000). Violations return `isError: true` with a
clear message; validation runs before the concurrency semaphore so
malformed calls don't consume a slot.

### Gateway-URL guard (v0.11.0)

- `X-API-Key` is suppressed (with a loud stderr warning) if `ACP_API_URL`
  is `http:` and the host is not localhost. Override with
  `ACP_ALLOW_PLAINTEXT_KEY=1` to warn-and-still-send.
- A warning fires at boot if `ACP_API_URL` host is not the canonical
  `api.acp-metabot.dev`. Silence with `ACP_ALLOW_CUSTOM_GATEWAY=1` for
  staging or fork deployments.

## Production deployment

For security-sensitive deployments, pin every layer rather than tracking
`latest`. Silent upgrades broaden the attack surface — a compromised
release could be pulled automatically without operator review.

### Pinning the npm package

```jsonc
// MCP client config — recommended
{
  "command": "npx",
  "args": ["-y", "acp-find-mcp@0.11.0"]
}

// Less safe — tracks the latest published version
{
  "command": "npx",
  "args": ["-y", "acp-find-mcp"]
}
```

### Pinning the Docker image

If running via the published Docker image, pull by digest rather than tag:

```bash
docker pull ghcr.io/oliver-pringle/acp-find-mcp@sha256:<digest>
```

`docker pull ... :latest` resolves to whatever the registry currently
points at — fine for development, risky for production.

### Provenance + SBOM

v0.11.0 does NOT publish SLSA provenance or a CycloneDX SBOM. If your
deployment context requires these (regulated environments, supply-chain
review boards), open an issue — adding `npm publish --provenance` and
generating an SBOM at release time is a planned v0.12.0 improvement.

## How it works

```
Your MCP client (Cursor / Cline / Windsurf / Codex / Continue / Claude)
   │
   ▼ MCP stdio
acp-find-mcp (Node, no deps)
   │
   ▼ HTTPS, with 1-retry on 5xx
api.acp-metabot.dev (public gateway, rate-limited)
   │
   ▼ Internal HTTP
ACP_Metabot indexer + Voyage embeddings + Claude composer + chain-event scanner
   │
   ▼ SQLite vector index of every ACP marketplace offering
```

The index refreshes every 10 min from both **ACP V1** (`https://acpx.virtuals.io/`) and **ACP V2** (`https://api.acp.virtuals.io`). Results track live marketplace state across both versions within ~10 min.

## Privacy & telemetry

The public gateway at `api.acp-metabot.dev` logs the **client IP, the request path, and the request body** into a request-log table. The IP is used solely to enforce per-IP rate limits; logs are kept for operator metrics. There is no separate analytics provider, no user identifier, and no cross-request correlation beyond IP.

Starting with **v0.6.0**, the server fires **one** activation beacon to `POST /v1/plugin/boot` after handling the MCP `initialize` request. The beacon's body is empty; the only signal it adds is a single `(User-Agent, IP, timestamp)` row in the same request-log table — the same shape every other request already records. Its purpose is to let the operator distinguish "the npm tarball was downloaded" (catalogs, scanners, `npx -y` cache) from "the MCP server actually started under a real client". You can opt out by setting `ACP_DISABLE_BOOT_BEACON=1` — every other tool call works identically.

The MCP server adds **no other telemetry**. It only contacts the gateway you configure. If you point `ACP_API_URL` at your own self-hosted gateway, no traffic leaves your network.

## Requirements

- Node 22 or later (uses built-in `fetch`, `readline`, `AbortSignal.timeout`).
- Or run via Docker (above) — no Node install required.

## Source & contributing

Repo: [oliver-pringle/acp-find-plugin](https://github.com/oliver-pringle/acp-find-plugin) — issues and PRs welcome.

## License

MIT — see [LICENSE](LICENSE).
