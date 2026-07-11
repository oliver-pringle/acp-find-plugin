# acp-find-mcp / acp-find v0.19.0 — wash gen-3 detectors

Date: 2026-07-11. Author: session for Oliver. Builds on v0.18.2 (e2e-test-loop filter).
Source of the roadmap: RoFlo Round 27 demand census
(`RuFlo_ACP_Bot_Research/round27/demand-census.md`, section 7) + memory
`project_acp_round27_research`.

## Problem

The v0.18.1/v0.18.2 wash filter (seed list + boosty-offering + test-harness-name
heuristics) is evaded by two live gen-3 wash patterns proven in the R27 census:

1. **Reciprocal metronome pair** — VEGETA (`0xe09f4011…8584`) and iCLONE
   (`0x44cc25d5…6664`) are each other's ONLY counterparty: 49/49 completed each way,
   `$0.05` every ~10 min, and today they TOP `acp_v2_demand`. VEGETA's trust delivery
   lane reads `organicExternalCompleted=50` from 1 buyer, `boostExcludedCount=0` — the
   seed/name filters do not recognise iCLONE as wash. A wash pair with a clean catalogue
   would mint OPERATIONAL/VERIFIED.
2. **Operator name-family** — Taste (`0xbb29da90…`) is bought only by "Tasty" and
   "taster"; reported as "24 organic completions from 2 buyers" → OPERATIONAL 63. The
   name affinity (Taste/Tasty/taster) is invisible to the current filter.
3. **Single-buyer burst** — My Jarvis 11/1, Laguna 25/1 (Varius), Producer 27/1
   (one unregistered wallet, 25 in a 30-min burst), Cybercentry 91/1, Pulse 33/1. A
   single repeat buyer is not diverse demand.

The one **honest** organic buyer of the window — Gitlawb_Mercenary
(`0xc1b92a5c…3ed6`), which paid TheMetaBot `sellerCoachingPack` 4× at `$1.00` — must
survive every new filter. Note the trap: a DIFFERENT wallet, gitlawb-test-buyer
(`0xec6ff51b…5627`), is the sole buyer of Gitlawb's own offerings and IS wash.

## Scope

- **Version 0.19.0** (user-named "v0.19"). Additive only. **No new MCP tools**
  (surface stays 47 full / 20 core); new response FIELDS + detectors + seeds.
- Primary layer = `mcp-server/server.js` (runs in both the npm stdio package and the
  `acp-find-edge` container, which is what the website trust badge/`acp_agent_trust`
  read). Enhancing `clone_screen` is what stops a reciprocal/single-buyer/name-family
  wash from minting VERIFIED/OPERATIONAL.
- Gateway convergence: add the 4 R27 seeds to Metabot `appsettings.json`
  `TrustSignals:FarmWallets` so the `farmWallets` Resource propagates them to every
  plugin install without an npm republish (and Metabot search ranking excludes them).
- **Out of scope:** porting the reciprocal/single-buyer/name-affinity GRAPH detectors
  into the C# `TrustSignalsComputer` (search-ranking blend). The wallet seeds cover the
  known VEGETA/iCLONE case there; the structural generalisation lives in the plugin/edge
  trust layer. Follow-up only if search results show wash inflation.

## Detectors

### D1 — 4 new farm seeds (plugin `BOOST_FARM_WALLETS` + gateway config)

All 4 verified live on the official indexer 2026-07-11:

| Wallet | Indexer name | Why |
|---|---|---|
| `0xe09f40114af6c78788a8003da127c49c56158584` | VEGETA | reciprocal wash pair |
| `0x44cc25d55a4291b92f52062ba023ca1f14206664` | iCLONE | reciprocal wash pair |
| `0xec6ff51b394f6cda716b84b87e6b260331935627` | gitlawb-test-buyer | test-harness; sole buyer of Gitlawb's own offerings (also caught by `nameLooksTestHarness`) |
| `0xbdaa681f63dc45cf2575038a045ef73d1116cf2c` | (unregistered) | 25 completions on Producer in a 30-min burst |

Belt-and-suspenders with D2–D4, which generalise to future unseen pairs.

### D2 — singleBuyerBurst (clone_screen, pure, no fetch)

After the organic set is computed: if
`organicExternalCompleted >= 20 && organicDistinctBuyers == 1`, push signal
`single_buyer_burst` (weight 2 → forces `SUSPICIOUS`, which maps to trust `SUSPECT`).

Threshold rationale: **20 sits above the honest Gitlawb (4 organic from 1 buyer → stays
CLEAN/VERIFIED) and below every observed single-buyer wash burst** (Laguna 25, Producer
27, Pulse 33, VEGETA 50, Cybercentry 91). Uses ORGANIC (post seed/name/reciprocal)
counts, so it measures residual single-buyer concentration.

### D3 — reciprocalPair (clone_screen bounded fetch; acp_v2_demand graph)

For screened provider A with organic buyers B (post seed/name strip): for each buyer
`b` (capped at 6, cached, fail-open), resolve `b` and fetch its provider-side jobs. If
`b` has ≥3 completed provider jobs AND ≥90% of them are sold back to A → `b`↔A is a
reciprocal loop → exclude `b` from organic (add to the wash set, `boostExcludedCount`).

- VEGETA screened: buyer iCLONE sells 49/49 to VEGETA → 100% → excluded → VEGETA organic
  → 0 (caught **without** the seed).
- Gitlawb screened as TheMetaBot's buyer: Gitlawb sells 16/16 to gitlawb-test-buyer, 0 to
  TheMetaBot → A is 0% of Gitlawb's clients → NOT reciprocal → Gitlawb stays organic.
- Fail-open: a fetch error keeps `b` organic (never strip a real buyer on a transient error).

`acp_v2_demand`: build an in-scan sell graph (buyer→provider) alongside the existing
provider→clients map; flag rows where the provider and its dominant single client each
sell predominantly back to the other.

### D4 — nameAffinity (clone_screen, pure string over free buyer names)

Buyer names come free from the screened agent's own jobs (`shapeIndexerJob` carries
`counterparty.name`). `namesAreAffine(nameA, nameB)` on normalized (lowercase,
alphanumeric-only) names.

**REDUCED after adversarial review (2026-07-11).** The original design had three tests
(prefix, acronym, shared-token). An empirical review measured that the acronym and
shared-token forms false-positived heavily on legitimate same-vertical agents — 25
collisions in a 69-agent sample (a "* Video *" buying from a "* Video *", every
"* Buyer"/"* Seller" pair, `AlphaGuard` vs `AlphaBot`, a 4-word buyer whose initials spell
`base`/`defi`). Since stripping a real buyer erases honest demand (the cardinal risk), the
detector was cut to ONLY the near-identical-name test:

- common-prefix `>= 4` AND `>= 0.8 * max(len)` — i.e. the two names differ only in a short
  suffix: Taste/Tasty (prefix 4, max 5), Taste/taster (prefix 5, max 6), AlphaBot/AlphaBotV2.
  Rejects AlphaGuard/AlphaBot, Crypto Alpha/Crypto Beta, Wallet Guardian/Wallet Tracker, etc.

The weaker BitsAndBytesBack/BABBS_API (acronym) and Producer/Johnny Suede (shared-token)
cases are DELIBERATELY ceded — they were secondary R27 "consider" cases and the FP cost was
too high. They are covered, where they are actually wash, by the reciprocal / seed /
single-buyer detectors.

Non-matches (regression guards): TheMetaBot/Gitlawb_Mercenary, ZeroAgent/{Whitepaper
Grey, Vibe Earn Agent, Mason} + the full empirical FP set — all stay organic.

Affine buyers are excluded from organic (added to the wash set).

### D5 — washLikely on acp_v2_demand rows

Per provider row: `washLikely` (bool) + `washReasons` (array of
`single_buyer|reciprocal_pair|farm_seed|test_harness_name`), plus a top-level
`washSummary { flagged, cleanProviders }`. Makes the leaderboard decision-grade. Advisory
(the activity sample is bounded ~300 events); `clone_screen`/`acp_agent_trust` stay
authoritative.

## Wash-set unification

`clone_screen` already computes `boostBuyers = classifyBoostBuyers(rawBuyers)` (seed OR
boosty/test-name heuristic). v0.19 expands the excluded set to
`washBuyers = boostBuyers ∪ reciprocalBuyers ∪ affineBuyers`; downstream
`organic`/`boostExcludedCount`/verdict logic is unchanged — the new detectors just
enlarge the "wash buyer" set, and each contributes a distinct legibility signal
(`reciprocal_wash_buyers`, `name_family_buyers`, `single_buyer_burst`).

## Files

- `server.js`: 4 seeds; `namesAreAffine` + `normalizeAgentName` + `agentNameAcronym`;
  `isReciprocalBuyer`; expand `clone_screen` wash set + `single_buyer_burst`; enrich
  `acp_v2_demand` with wash graph; export new pure helpers.
- `test.js`: seed membership (4), `namesAreAffine` positives/negatives, singleBuyerBurst
  boundary (20 vs Gitlawb 4), reciprocity pure-helper, demand wash-row classifier. Tool
  count assertion stays 47.
- `package.json` + `plugin.json`: `0.19.0` + description.
- `README.md`: "What's new in v0.19.0" lead. `CHANGELOG.md`: new entry.
- `commands/clone-screen.md`, `commands/demand.md`, `commands/trust.md`: surface new fields.
- Workspace `C:\code_crypto\ACP\CLAUDE.md`: bump the acp-find paragraph.
- Gateway `ACP_Metabot.Api/appsettings.json`: +4 `TrustSignals:FarmWallets`.
- Smoke: `mcp-server/smoke-v0.19.0.mjs` against the live gateway/indexer.

## Verification

- `node --check server.js`; `npm test` green (69 + new).
- Adversarial review: Gitlawb stays organic; TheMetaBot stays VERIFIED; VEGETA/iCLONE,
  Taste (Tasty/taster), Laguna, Producer all get caught.
- Live smoke: clone_screen(VEGETA) no longer organic; clone_screen(TheMetaBot) still
  VERIFIED with organic Gitlawb; acp_v2_demand rows carry washLikely.
- npm publish is Oliver-gated (WebAuthn/PowerShell). Edge + Metabot redeploys follow.
