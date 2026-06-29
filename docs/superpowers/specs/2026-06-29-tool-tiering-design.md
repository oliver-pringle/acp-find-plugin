# acp-find tool-surface tiering (CORE vs FULL) + CORE-only remote endpoint

- **Date:** 2026-06-29
- **Status:** Approved (brainstorm) — pending implementation plan
- **Repo:** `oliver-pringle/acp-find-plugin` (`mcp-server/` is the npm package `acp-find-mcp`)
- **Target version:** `v0.18.0`

## Problem

`acp-find` exposes **all 47 tools to every consumer**. ~27 of them are portfolio-specific
wrappers around the operator's own bots (DeFiEval risk scoring, ArenaBot leaderboard, OracleBot
drift, SecurityBot catalogue, SafeRouteBot quote) or niche/redundant power-tools. To the operator
they are useful; to a stranger who adds `acp-find` to answer "find me an agent / is this agent
real?" they are noise that (a) bloats every MCP client's context with verbose tool schemas and
(b) degrades the client's tool-selection accuracy for the ~20 tools that matter.

The package already markets itself as "the trust + intelligence layer." The default surface should
match that promise. The v0.17 remote Streamable-HTTP endpoint (add-by-URL, no install) is the new
front door for exactly the stranger audience — and it currently serves all 47 tools unfiltered
(`edge/edge.js` `tools: TOOLS`).

## Goal

Split the tool surface into two tiers and default the **stranger-facing** front doors to the lean
CORE tier, while the operator's own Claude Code plugin keeps the FULL surface (and all 38 slash
commands). One environment variable selects the tier; the decision is recorded per-tool so adding a
future tool forces an explicit tier choice.

### Non-goals (separate efforts, explicitly out of scope here)

- Trimming the verbose individual tool descriptions.
- Trust-verdict hardening (e.g. requiring >=2 distinct organic buyers for `VERIFIED`).
- Deepening clone-screening signals.
- Embeddable-badge seeding / MCP-registry listings / other distribution work.
- Removing any tool. Nothing is deleted — FULL-only tools are merely hidden from the CORE tier.

## Decision: which front door sees which tier ("Option 1")

`acp-find` runs as one codebase reached three ways. Tier is resolved **once per process** from the
`ACP_FIND_TIER` environment variable (default `core`).

| Front door | How it starts | `ACP_FIND_TIER` | Tier |
|---|---|---|---|
| Remote URL / edge container (`api.acp-metabot.dev/mcp`) | long-lived HTTP process | unset -> default | **core** (20) |
| `npx acp-find-mcp` (Cursor / Cline / Codex / Claude Desktop) | stdio process | unset -> default | **core** (20) |
| Claude Code plugin | stdio process via plugin `.mcp.json` | set to `full` | **full** (47) |

The plugin's `.mcp.json` already passes an `env` block to the local `server.js`; it gains one line:
`"ACP_FIND_TIER": "full"`. No other front door sets the variable, so both stranger paths default to
CORE automatically.

Power users of the bare npm package who want the portfolio tools set `ACP_FIND_TIER=full` themselves
(documented as the migration line — see Docs).

## Tier membership (source of truth for tagging)

### CORE (20) — the trust + discovery spine

Search / discover (6): `acp_find`, `acp_search_agents`, `acp_today`, `acp_categories`,
`acp_marketplace_gap`, `acp_v2_demand`

Evaluate one agent (5): `acp_browse_agent`, `acp_offering`, `acp_agent_reputation`,
`acp_agent_jobs`, `acp_v2_transactions`

Trust — the wedge (4): `acp_agent_trust`, `acp_agent_verify`, `acp_clone_screen`,
`acp_hire_decision`

Compare / compose (3): `acp_compare_agents`, `acp_compose_stack`, `acp_estimate_stack_cost`

Audit + util (2): `acp_security_scan`, `acp_health`

> `acp_security_scan` is a SecurityBot wrapper but, unlike risk/arena/oracle, its function is
> generic (scan *any* agent for vulnerabilities) and the trust verdict already fuses SecurityBot's
> grade — it is the audit half of "is this agent safe to hire?", so it belongs in CORE.

### FULL-only (27) — portfolio-specific, niche, or redundant

Risk family / DeFiEval (7): `acp_risk_snapshot`, `acp_risk_compare`, `acp_risk_deep_dive`,
`acp_risk_rubric`, `acp_risk_sources`, `acp_risk_attestation`, `acp_agent_risk_check`

Arena / ArenaBot (4): `acp_arena_check`, `acp_arena_council_picks`, `acp_arena_leaderboard`,
`acp_arena_overlap`

Oracle / OracleBot (3): `acp_oracle_capabilities`, `acp_oracle_drift`, `acp_oracle_sources`

Security / SecurityBot (2): `acp_security_pattern`, `acp_agent_security_history`

SafeRoute (1): `acp_safe_quote`

Discovery-redundant (1): `acp_recent_hires` (overlaps `acp_today` + `acp_v2_demand`)

Portfolio / power-tools (9): `acp_portfolio_status`, `acp_watch_status`, `acp_resource_call`,
`acp_resources_search`, `acp_search_narrative`, `acp_agent_resources`,
`acp_agent_reputation_history`, `acp_agent_recent_jobs`, `acp_agent_feed_address`

20 (CORE) + 27 (FULL-only) = 47 total. Every tool gets an explicit tag; nothing is implicit.

## Mechanism

### 1. Per-tool tier tag

Every object in the `TOOLS` array (`server.js`) gains a `tier: "core" | "full"` field. The field is
explicit on all 47 entries (no default-by-omission) so a future tool cannot be added without a
conscious tier decision — matching the project's "keep it in lockstep" convention.

> *Rejected alternative:* a separate `CORE_NAMES` Set. It keeps the membership away from the tool
> definition, so a newly added tool silently lands in the wrong tier and drifts. A per-tool field
> co-locates the decision with the tool.

### 2. Tier resolution

A module-level constant resolved once at startup, beside the other `ACP_*` env reads near the top of
`server.js`:

- Read `process.env.ACP_FIND_TIER`, lowercase, default `"core"`.
- Accept only `core` | `full`. Any other value -> write a warning to **stderr** (never stdout — it
  would corrupt the MCP JSON stream) and fall back to `core`.

### 3. List filtering — `toolsForTier(tier)`

`toolsForTier(tier)` returns `tier === "full" ? TOOLS : TOOLS.filter(t => t.tier === "core")`.
Applied at both `tools/list` sites:

- stdio loop: `server.js` `tools/list` case (currently `result: { tools: TOOLS }`).
- edge: `edge/edge.js` `ListToolsRequestSchema` handler (currently `tools: TOOLS`).

Both read the same module-level resolved tier (edge imports from `server.js`, same process).

### 4. Dispatch gating — shared chokepoint

A hidden tool must also be **non-callable**, so a stranger who guesses a FULL-only tool name cannot
reach it. Both dispatch paths (stdio `tools/call` and edge `CallToolRequestSchema`) already call
**`validateToolArgs(name, args)`** before running a handler. Add the tier guard at the top of
`validateToolArgs` (or a dedicated `assertToolInTier(name)` invoked there): if the named tool's tier
is not permitted by the active tier, throw a clear error, e.g.
`acp_oracle_drift requires the full tier; set ACP_FIND_TIER=full`. One edit covers both transports.

### 5. Exports

Export `toolsForTier` and the resolved tier constant from `server.js` so `edge/edge.js` consumes
them. `validateToolArgs` is already exported.

### 6. Boot-beacon tier tag

The beacon is headers-only; the tier rides in the existing User-Agent parenthetical alongside the
transport token, e.g. `acp-find-plugin/0.18.0 (stdio; tier=core)`. The gateway already parses the
UA, so adoption metrics can split core vs full boots with no payload/body change.

## Behaviour summary

- Bare `npx acp-find-mcp` -> lists 20, FULL-only tools error if called.
- Plugin (`ACP_FIND_TIER=full`) -> lists 47, everything callable; all 38 slash commands work
  unchanged.
- Edge container -> lists 20 (the `/trust/:address` route calls `acp_agent_trust`, which is CORE).
- `ACP_FIND_TIER=banana` -> stderr warning, behaves as `core`.

## Slash commands

No change. The Claude Code plugin runs FULL, so all 38 `/acp-find:*` commands keep working. The
npm/edge stranger paths do not ship slash commands at all, so the FULL-only commands have no broken
surface there.

## Docs lockstep (required by project convention)

All updated in the same change:

- **Version bump** to `v0.18.0` in `mcp-server/package.json` and `.claude-plugin/plugin.json`.
- **Count copy:** every "47 tools" claim becomes **"20 core / 47 full"** in `mcp-server/package.json`
  description, `.claude-plugin/plugin.json` description, `mcp-server/README.md`, and `CHANGELOG.md`.
- **README "What's new" lead block:** a new `## What's new in v0.18.0` section at the **top** of
  `mcp-server/README.md` (per the release rule — a new lead block, not an edit to an old one),
  explaining the two tiers, the default-core behaviour, and a prominent **migration line**: *npm /
  Cursor users who want the portfolio tools set `ACP_FIND_TIER=full`.*
- **`CHANGELOG.md`** entry for v0.18.0.
- **Workspace `CLAUDE.md`** companion-tooling bullet updated to note the CORE/FULL tiers and the
  `ACP_FIND_TIER` flag.
- **`docker-compose.edge.yml`** may optionally set `ACP_FIND_TIER=core` explicitly for clarity
  (functionally a no-op since core is the default).

## Testing

- **`mcp-server/smoke-v0.18.0.mjs`:** assert `toolsForTier("core").length === 20`,
  `toolsForTier("full").length === 47`; assert a FULL-only tool (e.g. `acp_oracle_drift`) dispatched
  while tier is `core` throws the tier error, and the same tool under `full` is permitted; assert
  every tool carries a valid `tier` tag (guards against an untagged future tool).
- **`edge/edge.test.js`:** assert the edge `tools/list` returns the CORE set (20).
- **`mcp-server/test.js`:** existing suite (pure-helper imports, beacon path) must still pass.
- Live smoke against the gateway is unaffected (CORE contains all tools the existing smokes touch).

## Risks / migration

- **Existing bare-npm users relying on a portfolio tool** lose it from the default surface. Mitigated
  by the documented `ACP_FIND_TIER=full` opt-in and the prominent README migration line. Acceptable
  at 0.x; nothing is removed.
- **Untagged future tool** would be invisible in CORE. Mitigated by the smoke assertion that every
  tool has a valid tier tag.
- **stderr vs stdout discipline** for the invalid-value warning — must not write to stdout (MCP JSON
  stream). Called out in the mechanism.

## Repo-hygiene note (adjacent, low-cost, include opportunistically)

The plugin repo root, `mcp-server/`, and `edge/` carry empty PowerShell `>>`-redirect artifact files
(`0`, `1`, `{,`, `console.log('ERR'`, `has`, `${ip`, etc.). They are committed-adjacent noise in the
published repo root. Deleting them + a `.gitignore` guard is not required by this change but is a
cheap cleanup to fold in if convenient. (Not a blocker; can be deferred.)
