# Design Spec — acp-find as the ACP Trust + Intelligence Layer (v0.16.0, Phase 1)

Date: 2026-06-15
Status: Approved design (brainstorming) → ready for implementation plan
Project: `acp-find-plugin` / `acp-find-mcp` (npm)
Author: Oliver Pringle (RoFlo Round 21, Option A)

## 1. Goal

Reposition the acp-find plugin from a broad "ACP marketplace toolkit" into a focused
**trust + intelligence layer**: the tool that answers *"is this ACP agent real, and does
it actually deliver?"* — and make its accuracy the moat. This is the highest-EV move from
Round 21: the plugin is the portfolio's only asset with real off-Virtuals (developer)
reach, and the V2 clone flood (128 new agents in 30 days, mostly template farms / self-loops)
is actively creating demand for a credible "is this real?" signal that no one else can
produce — because it requires the official-indexer completion data wired in v0.15.0.

This spec covers **Phase 1 only** (`v0.16.0`): a plugin-only release (npm publish, no
backend/droplet deploy). Phases 2–3 (gateway + SecurityBot engine accuracy) are scoped at a
summary level for sequencing and will get their own specs.

## 2. Non-goals (this phase)

- No monetization / paid tiers / API-key auth (decision: stay free, grow adoption, monetize later).
- No backend changes to the Metabot gateway or the SecurityBot engine (those are Phases 2–3).
- No new on-chain or marketplace capability; the bots' data is reused as-is.
- No change to the boot-beacon adoption telemetry (already in place).

## 3. Context — current state (verified in source)

- `acp-find-mcp` v0.15.0, single-file `mcp-server/server.js` (~143 KB), 46 tools, backed by
  the public `api.acp-metabot.dev` gateway. Tool defs live in the `TOOLS` array; handlers in
  the `HANDLERS` object; dispatch at `tools/call` (server.js:2948).
- **The flagship data already exists, unbundled:**
  - `acp_clone_screen` (def server.js:1627, handler 2865) → `{verdict: CLEAN|SUSPICIOUS|LIKELY_CLONE,
    score, signals[], offeringCount, jobs:{total, completed, externalCompleted}}`. Already reads the
    official indexer (`indexerResolveWallet` + `indexerAgentJobs` + `shapeIndexerJob`) and computes
    **`externalCompleted`** = jobs COMPLETED for a distinct counterparty `!= wallet` — the anti-self-loop
    signal (this is what catches BridgeKitty: 100 jobs, 0 external completions).
  - `acp_agent_jobs` (def 1602) → official-indexer reliability rollup `{completionRate,
    completed, distinctCounterparties, ...}`.
  - `acp_agent_security_history` (v0.14) → public SecurityBot history summary `{status
    (scanned|not_auditable|error), score, grade, verdict, findingCount, severityCounts}`. No
    operator key needed (unlike the operator `acp_security_scan`).
  - `acp_agent_reputation` via `/v1/agentReputation` → `{agentScore, agentPercentile, ...}`.
- **`acp_agent_verify` is the DEGRADED existing composite** (def 1367, handler 2445): runs
  reputation + arena + risk_snapshot + `recentJobs` in parallel and emits STRONG_BUY/OK/CAUTION/
  AVOID/UNKNOWN. Its `recentJobs` leg calls `/v1/agentRecentJobs` — Metabot's **blind**
  ChainEventScanner — so `jobs30d` is ~always null/0 and the `STRONG_BUY` gate (`jobs30d >= 10`,
  line 2482) is effectively dead. `acp_safe_quote` (2622) dispatches through `acp_agent_verify`,
  so it inherits the degradation.
- **Established composite pattern** (reuse verbatim): a local `safeCall = fn => try/catch → {error}`,
  `Promise.all([...])`, dispatch-through to other handlers (`HANDLERS.acp_agent_verify(...)` is
  already reused by `acp_safe_quote`), `wrapUntrusted(...)` on any response carrying marketplace
  text, `agentUrl(addr)`, and `checkedAt: new Date().toISOString()`.
- **Stale hardcoded pattern counts** (buyer-visible): `acp_security_pattern` description
  (server.js:1565) says "74-pattern … (P1-P64 + B1-B9)" and "~74 patterns"; line ~1207 carries
  the same "P1-P64 + B1-B9"; `PORTFOLIO_BOTS` securitybot role (1659) says "81-pattern". Live
  catalogue is 85 and grows. CLAUDE.md rule: never hardcode the count — it drifts.

## 4. Design — Phase 1 (`v0.16.0`)

### 4.1 Flagship: `acp_agent_trust` (new tool) — "is this agent real?"

A new client-side composite. Distinct from `acp_agent_verify` (which answers the *hire-risk*
question STRONG_BUY/AVOID); `acp_agent_trust` answers the *authenticity/reality* question.

**Input:** `{ agentAddress: string (0x+40hex, required), chain?: "base"|"ethereum" (default base) }`.

**Composition (3 parallel legs, each `safeCall`-wrapped, reusing existing handlers — no new
gateway endpoints):**
1. `HANDLERS.acp_clone_screen({agentAddress})` → authenticity verdict + `jobs.externalCompleted`
   (delivery signal). Reused so we do NOT duplicate the indexer-jobs logic.
2. `HANDLERS.acp_agent_security_history({agentAddress, limit:1})` → latest auditability row
   `{status, grade, score}`. Public, no key.
3. `HANDLERS.acp_agent_reputation` via `/v1/agentReputation` → `{agentScore}`.

(We deliberately derive the delivery signal from leg 1's `jobs.externalCompleted` rather than a
separate `acp_agent_jobs` call, to avoid a redundant indexer round-trip. `distinctCounterparties`
may be added later if leg-1 jobs shape proves insufficient — not required for Phase 1.)

**Verdict cascade (first match wins) →** `trustVerdict ∈ {LIKELY_CLONE, SUSPECT, UNVERIFIED,
OPERATIONAL, VERIFIED}`:
1. `LIKELY_CLONE` — clone leg verdict == `LIKELY_CLONE` (dispositive: off-platform resource hosts
   or hourly-timestamp spam).
2. `SUSPECT` — clone verdict == `SUSPICIOUS`.
3. `UNVERIFIED` — security status != `scanned` (i.e. `not_auditable`/`error`/absent) AND
   `externalCompleted == 0`. (No probeable surface AND no proven delivery — cannot confirm real.)
4. `VERIFIED` — security status == `scanned` AND security score >= 55 (grade C or better) AND
   clone verdict == `CLEAN` AND `externalCompleted >= 1`. (Auditable + clean + proven external delivery.)
5. `OPERATIONAL` — otherwise. The honest "real, reachable surface, demand unproven" bucket — where
   most legitimate-but-new bots land (including most of Oliver's own portfolio today).

**`trustScore` (0–100, deterministic, explainable)** — start 50, then:
- auditability: `scanned` → `+ round((score-50)*0.4)` (range roughly −20…+20); `not_auditable` → −20; `error`/absent → −10.
- delivery: `externalCompleted >= 1` → +20; else +0.
- authenticity: `CLEAN` +10; `SUSPICIOUS` −15; `LIKELY_CLONE` −40.
- reputation: `+ round(agentScore*0.1)` (0…+10).
- Clamp to [0,100]. (Score is advisory colour; the `trustVerdict` cascade is the load-bearing output.)

**Output (wrapped in `wrapUntrusted`):**
```
{ agentAddress, agentName, trustVerdict, trustScore, headline,           // one-line "why"
  lanes: {
    authenticity: { verdict, score, signals[] },                          // from clone_screen
    auditability: { status, grade, score },                               // from security history
    delivery:     { externalCompleted, completed, total },                // from clone_screen.jobs
    reputation:   { agentScore } },
  marketplaceUrl, checkedAt,
  note: "Trust heuristic, not a guarantee — pair with acp_security_scan for a full audit." }
```
Any leg erroring surfaces `{error}` inside its lane; partial verdicts are allowed (mirrors
`acp_agent_verify` semantics). Each leg's error degrades gracefully (treated as the weakest
case for that lane in the cascade).

### 4.2 De-blind `acp_agent_verify` (paired credibility fix)

Swap `acp_agent_verify`'s blind `recentJobs` leg (the `/v1/agentRecentJobs` call, server.js:2468)
for the official-indexer rollup (reuse `HANDLERS.acp_agent_jobs` / the same indexer path
`acp_clone_screen` uses). Re-point the `STRONG_BUY` gate at real `completed`/`completionRate`
instead of the dead `jobs30d`. `acp_safe_quote` inherits the fix via its existing dispatch-through.
Keep verify's verdict vocabulary (STRONG_BUY/OK/CAUTION/AVOID/UNKNOWN) — only the data source changes.

### 4.3 Inline trust signal on discovery (opt-in, plugin-only)

Add an opt-in `includeTrust?: boolean` (default **false**) to `acp_find` and `acp_search_agents`.
When true, enrich the top results (cap at the returned page, ≤ the existing `limit`) with a
cached, `safeCall`-wrapped `acp_agent_security_history` summary → attach `trust: {grade, status}`
+ a `cloneFlag` per result. Default-off keeps the normal search path latency-unchanged; this is
purely additive. (Phase 2 may move this server-side, the way `acp_today` already attaches a
`security` block from the gateway — more efficient there.)

### 4.4 Stop misreporting the catalogue size

Replace every hardcoded count in buyer-visible tool copy with live-catalogue language that won't
drift: `acp_security_pattern` description (server.js:1565 — "74-pattern"/"P1-P64 + B1-B9"/"~74
patterns"), line ~1207, and the `PORTFOLIO_BOTS` securitybot role string (1659, "81-pattern").
Use e.g. "the ACP security catalogue (P-series + B-series; query `acp_security_pattern` for the
live set)". No number is hardcoded.

### 4.5 Repositioning (docs, in lockstep)

- `package.json` `description`: lead with the trust framing ("the trust + intelligence layer for
  ACP — know which agents are real and which actually deliver, before you hire or build").
- `mcp-server/README.md`: NEW `## What's new in v0.16.0` lead block at the very top (house rule),
  reframed one-liner/hero, `acp_agent_trust` documented as the flagship; keep prior version blocks below.
- Bump `package.json` version → `0.16.0`; `CHANGELOG.md` entry; `.claude-plugin/plugin.json` version.
- New slash command `commands/acp-find/trust.md` (`/acp-find:trust <address>`) wrapping `acp_agent_trust`.
- Workspace `CLAUDE.md` acp-find line: tool count (46 → 47, only `acp_agent_trust` is new) + the trust framing.
- Plugin root `README.md` if it carries a tool list/positioning.

## 5. Testing

- Extend `test.js` (node --test) with `acp_agent_trust` unit cases over mocked leg outputs:
  one per verdict tier (LIKELY_CLONE, SUSPECT, UNVERIFIED, OPERATIONAL, VERIFIED) + a partial-error
  case (one leg `{error}`) asserting graceful degrade + score clamping at [0,100].
- Add `mcp-server/smoke-v0.16.0.mjs` (mirror the existing `smoke-v0.15.0.mjs`): live calls of
  `acp_agent_trust` against (a) a known real reachable bot — expect VERIFIED/OPERATIONAL with a
  real grade, (b) a clone (e.g. MATRIX `0x07924dea…`) — expect LIKELY_CLONE/UNVERIFIED, and a
  `acp_find … includeTrust:true` call asserting the enrichment attaches without breaking the base shape.
- Regression: `acp_agent_verify` + `acp_safe_quote` still return their verdict vocab after the
  de-blinding; existing tests stay green.

## 6. Risks & mitigations

- **Latency:** `acp_agent_trust` fans out 3 legs (clone_screen itself makes ~4 indexer/gateway
  calls). Acceptable — it's an on-demand deep check, and all legs run in parallel + use the cache.
  `includeTrust` on search is opt-in to protect the default path.
- **Verdict miscalibration:** the cascade thresholds (score >= 55, externalCompleted >= 1) are first-cut;
  the smoke run against real bots + clones validates them before publish. Tunable constants, documented inline.
- **Over-claiming:** `acp_agent_trust` is a heuristic; the `note` + `headline` state that explicitly,
  and it points to `acp_security_scan` for a full audit. Honesty is the product.
- **npm publish quirk:** publishing requires a REAL Windows PowerShell terminal (WebAuthn-only npm
  account; harness `!`/Bash fall back to a non-existent TOTP). This is Oliver's manual step, flagged in rollout.

## 7. Rollout

1. Implement on a feature branch (not main).
2. `npm test` green + `smoke-v0.16.0.mjs` passes against the live gateway.
3. Docs lockstep complete (§4.5).
4. Oliver publishes from real PowerShell (`cd …\mcp-server && npm publish`) + `git tag v0.16.0`.
5. Boot-beacon adoption is the success metric (no new instrumentation needed).

## 8. Phases 2–3 (summary, separate specs — NOT this push)

- **Phase 2 (gateway/droplet):** repoint the legacy blind tools (`acp_recent_hires`, `acp_today.gainers`,
  the `agentRecentJobs`/digest endpoints) at the official indexer (proxy + cache) so ~10 tools heal;
  fix `cohortSurvival` survivalRate > 1.0, `churnRate = 0`, the `marketplace_gap`-vs-`acp_categories`
  denominator (~12×), and the agent-search blind spot that hides the flagship TheMetaBot.
- **Phase 3 (SecurityBot engine/droplet):** broaden target discovery (host `/health` fallback → fewer
  `not_auditable`), surface the computed `coverage` + `auditedPatternIds` in the scan deliverable +
  history, add `ConfigStatusLeakCheck` (P56 → 16 checks), fix SecurityBot's own stale count copy.

## 9. Open questions

None blocking. Verdict-threshold constants (§4.1) are first-cut and validated by the §5 smoke run
before publish.
