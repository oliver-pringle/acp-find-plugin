# acp-find-mcp v0.13 — specification

**Author:** Hermes (orchestrator), for Oliver Pringle  
**Date:** 2026-06-07  
**Status:** spec — not yet built  
**Depends on:** Metabot v1.10.1 running on `api.acp-metabot.dev` (already deployed)  
**SecurityBot:** `patternCatalogue` Resource live at `/securitybot/v1/resources/patternCatalogue` (already deployed)

---

## Summary

v0.13 is a **tightening release** — no new Metabot endpoints, no new hires. Two changes:

1. **PORTFOLIO_BOTS 10→15** — fix the hardcoded list in `acp_portfolio_status` (currently missing SolanaBot, WitnessBot, ButlerBridge, SecurityBot, ConciergeBot). Today the tool says "10 healthy" when 15 bots are deployed.

2. **`acp_security_pattern`** — new MCP tool wrapping SecurityBot's free `patternCatalogue` Resource. Surfaces the 53-pattern security catalogue (P1-P43 + B1-B9) to any LLM that loads acp-find-mcp — letting it answer "what's the pattern for webhook secret encryption?", "show me every Critical pattern", or "how do I fix P17 silent-401?" without Oliver having to keep KnownBugs.md open.

Tool count: **39 → 40**. Slash command count: **30 → 31**. Both additive — no existing signatures change.

---

## Why v0.13 (not 0.13.0, not larger)

The R17 portfolio audit found the acp-find-mcp plugin reports a stale view of the world: "10 bots healthy" when 15 are running, and Oliver's single highest-ROI security artifact (KnownBugs.md + patterns.json) is invisible to every downstream consumer. Both are data-quality fixes, not new-subsystem builds.

Saving the four speculative MCP tools (portfolio_health, key_sync, schema_drift, offering_performance) for v0.14 — they need new Metabot endpoints, new bot endpoints, or are paid-hire tools with real-USDC costs. v0.13 ships what's ready today.

---

## Change 1: PORTFOLIO_BOTS 10→15

### Current state (server.js lines 1443-1454)

10 bots: TheMetaBot, ChainlinkBot, TheOracleBot, LiquidGuard, MEVProtect, EASIssuer, RevokeBot, ArenaBot, DeFiEval, AgentEval.

### New state — add 5 bots

Additional rows to add to `PORTFOLIO_BOTS`:

| Slug | Name | Role | Probe path |
|---|---|---|---|
| `solanabot` | SolanaBot | Solana DeFi bot (Jupiter quotes / Jito tips / CCTP) | `/solanabot/health` |
| `witnessbot` | WitnessBot | Cryptographic provenance for ACP catalogues | `/witnessbot/health` |
| `butlerbridgebot` | ButlerBridgeBot | x402-fronted bridge into portfolio targets | `/butlerbridgebot/health` |
| `securitybot` | SecurityBot | Dynamic passive security auditor (53-pattern catalogue) | `/securitybot/health` |
| `conciergebot` | ConciergeBot | Portfolio concierge — fan-out runner + orchestrator | `/conciergebot/health` |

**Probe paths VERIFIED 2026-06-07.** All 5 new bots serve `/health` at 200 via Caddy path routing (`/<slug>/health` → `<slug>-api:5000/health`). `/v1/health` returns 401 (requires X-API-Key). The Health endpoint on all 5 bots is a simple middleware-bypass route — no auth required.

No fallback strategy needed:
1. Try `GET /<slug>/health` (8s timeout)
2. If 404, try `GET /<slug>/v1/health`
3. If still 404, try `GET /<slug>/v1/resources/capabilities` (or a known-cheap Resource)
4. Report unreachable with the best available error code

### Files to change

| File | Change |
|---|---|
| `mcp-server/server.js` | Replace `PORTFOLIO_BOTS` const (10→15 entries) |
| `mcp-server/test.js` | Verify `acp_portfolio_status` test still passes |
| `mcp-server/README.md` | "What's new in v0.13" — mention 15-bot coverage |
| `CHANGELOG.md` | New v0.13 entry |

---

## Change 2: `acp_security_pattern` — new MCP tool

### What it wraps

SecurityBot's `patternCatalogue` free Resource:

- **URL:** `https://api.acp-metabot.dev/securitybot/v1/resources/patternCatalogue`
- **Method:** GET
- **Auth:** public (Resources are free, no X-API-Key required)
- **Response shape (live, verified 2026-06-07):**
  ```json
  {
    "corpusVersion": "2026-05-30",
    "count": 53,
    "patterns": [
      {
        "id": "P1",
        "title": "Dev-mode auth bypass without explicit opt-in flag",
        "severity": "High",
        "detection": "See KnownBugs.md P1 detection rule.",
        "canonicalFix": "See KnownBugs.md P1 canonical fix.",
        "referenceBot": "ACP_SolanaBot (Program.cs:172-203), ACP_OracleBot (Program.cs:189-216)"
      }
    ]
  }
  ```
  The MCP handler unwraps the top-level envelope — `acp_security_pattern` returns `patterns[]` directly, with `count` and `totalInCatalogue` synthesized. The `corpusVersion` is surfaced as provenance.
- **Size:** ~17 KB (53 patterns). Well within the 256 KB Resource body limit.

### MCP tool design

**Name:** `acp_security_pattern`

**Pattern:** cached Resource wrapper (5-min TTL). Same pattern as `acp_oracle_sources`, `acp_risk_sources`, `acp_risk_rubric`.

**Description for tools/list:**
> "Query the 53-pattern ACP security catalogue (P1-P43 + B1-B9) maintained by TheSecurityBot. Each pattern describes a known vulnerability class with severity (Critical/High/Medium/Low/Operational), a grep/regex detection rule, the canonical fix shipped in the portfolio, and the reference bot whose current implementation is the golden source. Use when an LLM needs to: (a) answer 'what pattern covers webhook secret encryption?' or 'show me every Critical finding', (b) guide a developer through fixing a specific pattern by ID, or (c) validate a new bot against the catalogue. The full catalogue is ~53 patterns — filter by severity, search by keyword, or request a single pattern by ID. Cached 5 min. Free SecurityBot Resource."

**inputSchema:**
```json
{
  "type": "object",
  "properties": {
    "patternId": {
      "type": "string",
      "description": "Optional. A single pattern ID to fetch (e.g. 'P5', 'P17', 'B3'). Case-insensitive match against the 'id' field. When set, only that one pattern is returned."
    },
    "severity": {
      "type": "string",
      "enum": ["Critical", "High", "Medium", "Low", "Operational"],
      "description": "Optional. Filter patterns to this severity level. Case-insensitive."
    },
    "query": {
      "type": "string",
      "description": "Optional. Free-text search across pattern titles. Substring match — e.g. 'webhook' matches P4, P5, P6, P40, P41, P42, B1, B2. Max 200 chars."
    }
  },
  "properties": {}
}
```

**Output:** The raw Resource response (array), post-processed by the MCP handler:
- Single pattern when `patternId` is set (returns the matching object, or `{ error: "not_found", available: ["P1","P2",...] }` when no match)
- Filtered array when `severity` or `query` is set
- Full 53-pattern catalogue when called with no args
- Cached 5 min (CACHE_TTL_MS). The catalogue changes slowly (new patterns added per audit round, ~1-2/month).
- Wrapped in the untrusted-content envelope (`_warning` + per-entry `_untrusted: true` on title, detection, canonicalFix fields). Pattern metadata (id, severity, referenceBot) is NOT flagged untrusted — it's SecurityBot-authored.

**Cache key:** `"securityPatterns"` — one cached copy of the full catalogue. Per-`patternId` lookups fish out of the cached array; per-`severity`/`query` filters also operate on the cached array. This means a single Resource call per 5-minute window regardless of how many filtered queries the user fires — the filtering is client-side inside the MCP server.

**Edge cases:**
- SecurityBot is unreachable: return `{ error: "SecurityBot patternCatalogue Resource unreachable", gatewayStatus: 502, hint: "The SecurityBot container may be down. Check acp_portfolio_status." }`. Do not cache the error — retry on next call.
- Empty catalogue: return `{ error: "no_patterns", hint: "The patternCatalogue Resource returned an empty array. The SecurityBot may need to rebuild its patterns.json." }`.
- Gateway returns non-JSON: return `{ error: "unexpected_response", contentType: ..., bodySnippet: "first 200 chars" }`.

### Handler pseudocode

```js
acp_security_pattern: async (args) => {
  let catalogue = cacheGet("securityPatterns");
  if (!catalogue) {
    const resp = await callGateway(
      "/securitybot/v1/resources/patternCatalogue",
      undefined,
      "GET"
    );
    // Gateway returns { corpusVersion, count, patterns: [...] }
    const patterns = resp?.patterns;
    if (!Array.isArray(patterns)) {
      throw new Error("SecurityBot patternCatalogue returned non-array patterns field");
    }
    catalogue = { version: resp.corpusVersion, patterns };
    cachePut("securityPatterns", catalogue);
  }

  const all = catalogue.patterns;

  // Single-pattern lookup
  if (args?.patternId) {
    const id = String(args.patternId).trim().toUpperCase();
    const match = all.find(p => String(p.id).toUpperCase() === id);
    if (!match) {
      return wrapUntrusted({
        error: "pattern_not_found",
        requested: id,
        available: all.map(p => p.id).sort()
      });
    }
    return wrapUntrusted(match);
  }

  // Filtering
  let results = all;
  if (args?.severity) {
    const sev = String(args.severity).trim();
    results = results.filter(p =>
      String(p.severity).toLowerCase() === sev.toLowerCase()
    );
  }
  if (args?.query) {
    const q = String(args.query).trim().toLowerCase().slice(0, 200);
    results = results.filter(p =>
      String(p.title ?? "").toLowerCase().includes(q)
    );
  }

  return wrapUntrusted({
    count: results.length,
    totalInCatalogue: all.length,
    corpusVersion: catalogue.version,
    filters: {
      patternId: args?.patternId ?? null,
      severity: args?.severity ?? null,
      query: args?.query ?? null
    },
    patterns: results
  });
}
```

### UNTRUSTED_FIELD_NAMES update

Add `"detection"` and `"canonicalFix"` to the `UNTRUSTED_FIELD_NAMES` set in server.js. These are marketplace-authored text fields from SecurityBot's Resource response that an LLM should treat as display-only. The `id`, `severity`, and `referenceBot` fields are NOT flagged — they're structural metadata.

### cache invalidation note

The 5-min TTL means a newly-added pattern takes up to 5 minutes to appear. This is acceptable — SecurityBot's catalogue updates are infrequent (audit rounds every 1-2 weeks) and the stale window is short. If tighter freshness is ever needed, bump CACHE_TTL_MS or add a `forceRefresh` arg.

---

## New slash command: `/acp-find:security-pattern`

**File:** `commands/security-pattern.md`

**Syntax:**
```
/acp-find:security-pattern [<id>] [severity:<level>] [search:<term>]
```

**Routing:**
- Positional first arg that looks like a pattern ID (`P5`, `B3`, `p17`) → `patternId`
- Named `severity:` flag → `severity`
- Named `search:` flag → `query`
- Bare args that don't look like pattern IDs → treated as `query` (free-text search)
- No args → full catalogue

**Render:**
- Single-pattern mode: full card with severity badge, title, detection rule, canonical fix, reference bot.
- Filtered mode: table with id, severity badge, title, reference bot. Expand to full card on user tap/click.
- Full catalogue mode: compact table, grouped by severity, with a summary count line.

**Examples:**
- `/acp-find:security-pattern` — full 53-pattern catalogue
- `/acp-find:security-pattern P5` — single pattern: webhook secret encryption
- `/acp-find:security-pattern severity:Critical` — only Critical-severity patterns
- `/acp-find:security-pattern search:webhook` — all patterns with "webhook" in the title
- `/acp-find:security-pattern p17` — single pattern: silent-401 fail-fast

---

## Files to change (complete map)

| File | Change |
|---|---|
| `mcp-server/server.js` | (1) Replace `PORTFOLIO_BOTS` const 10→15. (2) Add `acp_security_pattern` to `TOOLS` array. (3) Add handler to `HANDLERS` map. (4) Add `"detection"` and `"canonicalFix"` to `UNTRUSTED_FIELD_NAMES`. |
| `mcp-server/test.js` | (1) Add `"acp_security_pattern"` to `EXPECTED_TOOLS`. (2) Update tool count assertion from 39→40. (3) Add tests for new tool (arg validation, caching, filtering). |
| `mcp-server/package.json` | Bump version `0.12.1` → `0.13.0` |
| `mcp-server/README.md` | "What's new in v0.13.0" lead block at top |
| `.claude-plugin/plugin.json` | Bump version `0.12.1` → `0.13.0` |
| `CHANGELOG.md` | New v0.13.0 entry |
| `commands/security-pattern.md` | New slash command file |
| `skills/acp-find/SKILL.md` | Add `security-pattern` to the slash-command reference table (if one exists) |
| `C:\code_crypto\ACP\CLAUDE.md` | Line 270-271: `~39 tools`→`~40 tools`, `~30 slash`→`~31 slash` |

---

## Test plan

1. `node --check server.js` — syntax validation
2. `npm test` — must be green with 40 tools + all existing tests passing
3. Live smoke: `npx -y acp-find-mcp` from a fresh install, `tools/list` shows 40 tools
4. `acp_security_pattern` against the live gateway returns 53 patterns with `severity` and `id` fields populated
5. `acp_security_pattern { patternId: "P5" }` returns exactly one pattern with the webhook-secret title
6. `acp_security_pattern { severity: "Critical" }` returns only Critical-severity patterns (filtered count ≤ 53)
7. `acp_security_pattern { query: "webhook" }` returns P4, P5, P6, P40, P41, P42, B1, B2 (8 matches as of 2026-06-07)
8. `acp_portfolio_status` returns 15 bots with `healthyCount` ≥ 9 (some bots may be mid-restart; 9/15 is the realistic floor)
9. `acp_health` reports `plugin.version: "0.13.0"`

---

## Release checklist

1. ☐ Probe-path verification (already done — all 5 new bots confirmed 200 on /health)
2. ☐ `server.js` — PORTFOLIO_BOTS update + new TOOL + handler + UNTRUSTED_FIELD_NAMES
3. ☐ `node --check server.js`
4. ☐ `test.js` — EXPECTED_TOOLS + count assertion + new tests
5. ☐ `npm test` — green
6. ☐ `commands/security-pattern.md` — new slash command
7. ☐ `skills/acp-find/SKILL.md` — update if slash-command table exists
8. ☐ Docs lockstep — README + package.json + plugin.json + CHANGELOG
9. ☐ Workspace CLAUDE.md — bump tool + slash counts
10. ☐ Live smoke — `smoke-v0.13.0.mjs` against real gateway
11. ☐ Commit + PR + merge + tag
12. ☐ User runs `npm publish` (real Windows PowerShell, WebAuthn)
13. ☐ Post-publish: `npm view acp-find-mcp version` + fresh client smoke

---

## NOT in scope (deferred to v0.14+)

- `acp_portfolio_health` (dashboard with offering counts from portfolioRollup)
- `acp_cross_bot_key_sync` (needs new bot endpoints)
- `acp_schema_drift_check` (paid hires — needs buyer budget + ACP_Tester integration)
- `acp_offering_performance` (needs new Metabot endpoint)
- DeFiEval/AgentEval re-registration (operator action, not code)
- Anthropic credits top-up (billing action, not code)
- Sub re-tiering (pricing.ts changes across bots)

---

## Dependencies

- **Metabot v1.10.1** on `api.acp-metabot.dev` — already deployed. No changes needed.
- **SecurityBot** patternCatalogue Resource at `/securitybot/v1/resources/patternCatalogue` — already deployed. No changes needed.
- **Caddy** reverse-proxy config — already routes all 15 bot slugs (verified live 2026-06-07).

No new gateway endpoints. No new Metabot endpoints. Purely an MCP wrapper release.
