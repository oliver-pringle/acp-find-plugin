# acp-find-mcp v0.18.2 - e2e-test-loop wash detector (design + plan)

Date: 2026-07-04. RoFlo Round 26 P0 "harden the lens". Approved scope:
name-heuristic + seed + convergence. ERC-8004/ACK interop DEFERRED to its own spike.

## Problem

The V2 wash trade evolved past the v0.18.1 boost filter. R25's fingerprint was
mutual-boost / boost_reciprocal $0.01 pings (caught by `BOOST_FARM_WALLETS` seed +
`offeringsLookBoosty`). R26 (2026-07-04) found a NEW evasion class that passes
`clone_screen` CLEAN and tops the `acp_v2_demand` leaderboard: named end-to-end
test-loops.

- DataPort Arena (0x654c..66f1): 5 completed jobs, all ONE offering, all from ONE
  counterparty literally named "acp-e2e-buyer" (0x72e1a2a350d9640d9d9abceece32713a781923b5),
  all 5 inside 24 minutes.
- ArAIstotle (0x95fb..47ae): 6 completed, all "factCheck", all from ONE counterparty
  named "TestAgent" (0x24c168db8aefbe14d24110abdcc11f502e182fec).

Why today's filter misses them: `walletLooksBoostFarm` only flags a buyer that SELLS
a mutual-boost product. A test-harness buyer sells nothing boosty; its tell is its
NAME plus a single-offering burst. So these currently count as organic and could
mint VERIFIED for the seller.

## Signal (approved: name + seed; behavioral burst DEFERRED)

A buyer is a wash "test-harness" iff its agent NAME matches an anchored regex:

    e2e | end-to-end | test-(agent|buyer|harness|bot|runner|client)
    | smoke-test | (qa|ci)-(buyer|runner|bot) | acp-e2e

Deliberately NARROW to avoid false-positives: bare "test"/"mock"/"sandbox"/"staging"
do NOT match (a legit brand could contain them); only the compound harness forms +
the very-specific "e2e" token. "TestAgent" matches via test-?agent; "acp-e2e-buyer"
via e2e. Folded into the SAME "excluded from organic" bucket as boost farms (both are
wash), fail-open, additive disclosure. The riskier single-offering-burst behavioral
signal is deferred (higher false-positive risk vs a legit high-frequency poller).

## Change set (both surfaces, or the website/badge stays blind)

### Plugin (mcp-server/server.js)
1. `TEST_HARNESS_RE` constant next to `BOOST_OFFERING_RE`.
2. Seed the 2 known e2e buyers into `BOOST_FARM_WALLETS` (fallback for the fail-open
   convergence fetch).
3. `walletLooksBoostFarm(addr, safe)` already fetches `/v1/agent/{addr}` (has `name`
   + `offerings`). Broaden: wash iff `offeringsLookBoosty(offerings)` OR
   `TEST_HARNESS_RE.test(name)`. Keep the function name; broaden the doc-comment.
4. CONVERGENCE (the pending 07-02 follow-up): before `classifyBoostBuyers`, load the
   gateway's `farmWallets` Resource (GET /v1/resources/farmWallets), cached (5-min
   TTL), FAIL-OPEN to the hardcoded seed on any error, and union its seed addresses
   into the effective seed. Future farm additions then reach every install WITHOUT an
   npm republish.
5. Disclosure stays additive: `boostExcludedCount` already means "wash buyers
   excluded"; the harness buyers now count in it (semantics unchanged, coverage
   broadened). Export `TEST_HARNESS_RE` (or a `nameLooksTestHarness` predicate) for
   unit tests.

### Gateway (ACP_Metabot.Api)
1. `FarmWalletRegistry.NameLooksTestHarness(string? name)` - the same regex, compiled.
2. `CorpusBoostyLookup.AgentLooksBoostyAsync` already reads the buyer's offering rows,
   which carry `AgentName`. Broaden its return to
   `OfferingsLookBoosty(rows) || rows.Any(r => NameLooksTestHarness(r.AgentName))`.
   Both consumers - `TrustSignalsWorker.ClassifyHeuristicBuyersAsync` and
   `ArrivalSentinelWorker.ClassifyAsync` - route through this method and gain the
   heuristic for FREE. No new dependency, no new HTTP.
3. Config: add the 2 e2e addresses to `TrustSignals:FarmWallets` in appsettings so
   `IsFarmSeed` catches them in `TrustSignalsComputer` (L50) AND `ArrivalSentinel`
   (L287). Certain coverage for the known 2; served via `/v1/resources/farmWallets`
   so the plugin convergence picks them up.

### Coverage note (documented limitation)
The gateway name-heuristic keys off the buyer's offering-row `AgentName`, so it sees
buyers that have offerings. A pure buyer with NO offerings is caught on the gateway
only by the SEED (config), and on the plugin by the profile fetch (which has the
name regardless). Acceptable for v0.18.2; a future version may add an indexer-name
lookup for zero-offering buyers.

## Tests
- Plugin `test.js`: unit-test the exported harness predicate - matches "TestAgent",
  "acp-e2e-buyer", "smoke-test buyer"; does NOT match "Contest", "Latest", "Sandbox
  Finance", "Test-driven Alpha" (guard the FP boundary).
- Gateway `FarmWalletRegistryTests.cs`: same match/no-match cases for
  `NameLooksTestHarness`. A `CorpusBoostyLookup` test that a harness-named buyer with
  a non-boosty offering is flagged washy.

## Ship
Version 0.18.2 (additive). Docs lockstep: README What's-new lead + Tools heading,
package.json + plugin.json description/version, CHANGELOG, workspace CLAUDE.md.
Gateway: `dotnet build` 0-warning + tests green -> deploy acp-metabot sequentially
(acp-bot-deploy) after Oliver's go. Plugin: `node --check` + `npm test` green ->
Oliver runs `npm publish` (WebAuthn, real PowerShell). No push/deploy without Oliver.
