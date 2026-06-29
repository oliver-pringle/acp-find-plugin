# acp-find Tool-Surface Tiering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split acp-find's 47 tools into a 20-tool CORE tier (trust + discovery) and a 47-tool FULL tier, default the stranger-facing front doors (remote edge + bare npx) to CORE, and let the Claude Code plugin opt into FULL.

**Architecture:** Each tool object gains an explicit `tier: "core" | "full"` field. A module-level `TIER` constant is resolved once per process from `ACP_FIND_TIER` (default `core`). `tools/list` returns `toolsForTier(TIER)` on both transports; a gate in the shared `validateToolArgs` chokepoint makes hidden tools non-callable. The plugin's `.mcp.json` sets `ACP_FIND_TIER=full`.

**Tech Stack:** Node >=22 ESM, zero runtime dependencies (published `server.js` only), `node:test` + standalone `.mjs` smokes, `@modelcontextprotocol/sdk` (edge only, unpublished).

## Global Constraints

- **Node >= 22**; the published npm package is `server.js` only — **add no runtime dependencies** to it.
- **Version bump 0.17.0 -> 0.18.0** in BOTH `mcp-server/package.json` and `.claude-plugin/plugin.json` (kept in lockstep). `SERVER_VERSION = pkg.version`, so the bump flows automatically.
- **ASCII-only** (every codepoint <= 127) in all README / package.json / plugin.json / CHANGELOG copy — no em-dashes, smart quotes, or arrows.
- **README release rule:** add a NEW `## What's new in v0.18.0` block at the TOP of the What's-new sequence (immediately above `## What's new in v0.17.0`); do not edit an old block in place.
- **Docs lockstep:** `mcp-server/package.json`, `.claude-plugin/plugin.json`, `mcp-server/README.md`, `CHANGELOG.md`, and workspace `C:\code_crypto\acp\CLAUDE.md` are updated in the same change. Count copy "47 tools" becomes "20 core / 47 full".
- **stdout is the MCP JSON stream** — every diagnostic in `server.js` goes to **stderr** (`logErr`).
- **Two separate git repos:** the plugin repo is `C:\code_crypto\acp\acp-find-plugin`; the workspace repo is `C:\code_crypto\acp`. The `CLAUDE.md` edit commits to the workspace repo. Stage only named files per commit — never `git add -A`.
- **Do NOT `git push` or `npm publish`** — both are Oliver-gated (publish requires a real Windows PowerShell terminal on the WebAuthn-only npm account).

## Tier classification (authoritative)

**CORE (20):** `acp_find`, `acp_search_agents`, `acp_today`, `acp_categories`, `acp_marketplace_gap`, `acp_v2_demand`, `acp_browse_agent`, `acp_offering`, `acp_agent_reputation`, `acp_agent_jobs`, `acp_v2_transactions`, `acp_agent_trust`, `acp_agent_verify`, `acp_clone_screen`, `acp_hire_decision`, `acp_compare_agents`, `acp_compose_stack`, `acp_estimate_stack_cost`, `acp_security_scan`, `acp_health`

**FULL-only (27):** `acp_risk_snapshot`, `acp_risk_compare`, `acp_risk_deep_dive`, `acp_risk_rubric`, `acp_risk_sources`, `acp_risk_attestation`, `acp_agent_risk_check`, `acp_arena_check`, `acp_arena_council_picks`, `acp_arena_leaderboard`, `acp_arena_overlap`, `acp_oracle_capabilities`, `acp_oracle_drift`, `acp_oracle_sources`, `acp_security_pattern`, `acp_agent_security_history`, `acp_safe_quote`, `acp_recent_hires`, `acp_portfolio_status`, `acp_watch_status`, `acp_resource_call`, `acp_resources_search`, `acp_search_narrative`, `acp_agent_resources`, `acp_agent_reputation_history`, `acp_agent_recent_jobs`, `acp_agent_feed_address`

---

## Task 1: CORE tier mechanism in server.js (tag, resolve, filter, gate)

**Files:**
- Create: `mcp-server/smoke-v0.18.0.mjs`
- Modify: `mcp-server/server.js` (env block after `:30`; tag all 47 entries in `TOOLS` at `:792`; new helpers before `const HANDLERS` at `:1831`; gate line in `validateToolArgs` at `:547`; exports at `:3260`)

**Interfaces:**
- Produces: `TIER` (string `"core" | "full"`), `toolsForTier(tier: string) => Tool[]`, `assertToolInTier(toolName: string) => void` (throws), and a `tier` property on every `TOOLS` entry. `validateToolArgs(toolName, args)` now calls `assertToolInTier(toolName)` first.

- [ ] **Step 1: Write the failing smoke test**

Create `mcp-server/smoke-v0.18.0.mjs`:

```js
// Tier tagging + gating (offline). Run: node smoke-v0.18.0.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

process.env.ACP_DISABLE_BOOT_BEACON = "1";
process.env.ACP_FIND_TIER = "core"; // dynamic import below resolves TIER=core
const { TOOLS, toolsForTier, validateToolArgs } = await import("./server.js");

const EXPECTED_CORE = [
  "acp_find", "acp_search_agents", "acp_today", "acp_categories", "acp_marketplace_gap",
  "acp_v2_demand", "acp_browse_agent", "acp_offering", "acp_agent_reputation", "acp_agent_jobs",
  "acp_v2_transactions", "acp_agent_trust", "acp_agent_verify", "acp_clone_screen",
  "acp_hire_decision", "acp_compare_agents", "acp_compose_stack", "acp_estimate_stack_cost",
  "acp_security_scan", "acp_health",
];

assert.equal(toolsForTier("full").length, 47, "full tier lists all 47");
assert.equal(toolsForTier("core").length, 20, "core tier lists 20");

for (const t of TOOLS) {
  assert.ok(t.tier === "core" || t.tier === "full", `tool ${t.name} has no valid tier tag`);
}

assert.deepEqual(
  toolsForTier("core").map((t) => t.name).sort(),
  [...EXPECTED_CORE].sort(),
  "core membership drifted from the authoritative list",
);

// Gate: a full-only tool is non-callable under core...
assert.throws(() => validateToolArgs("acp_oracle_drift", {}), /full tier/,
  "full-only tool must be blocked under core");
// ...and a core tool is fine.
assert.doesNotThrow(() => validateToolArgs("acp_find", { query: "x" }));

// Gate the other direction: under full, the full-only tool is allowed (child process).
const here = dirname(fileURLToPath(import.meta.url));
const serverUrl = pathToFileURL(resolve(here, "server.js")).href; // ESM needs file:// on Windows
const code = `import { validateToolArgs } from ${JSON.stringify(serverUrl)};` +
  ` validateToolArgs("acp_oracle_drift", {}); console.log("ALLOWED");`;
const out = execFileSync(process.execPath, ["--input-type=module", "-e", code], {
  env: { ...process.env, ACP_FIND_TIER: "full", ACP_DISABLE_BOOT_BEACON: "1" },
  encoding: "utf8",
});
assert.match(out, /ALLOWED/, "full tier must allow full-only tools");

console.log("smoke-v0.18.0: PASS (core=20, full=47, gate enforced both directions)");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node smoke-v0.18.0.mjs` (from `mcp-server/`)
Expected: FAIL — `toolsForTier` is `undefined` (not yet exported), so the first `toolsForTier("full")` call throws `TypeError`.

- [ ] **Step 3: Add the TIER resolver** in `server.js`, immediately after line 30 (`const ALLOW_CUSTOM_GATEWAY = ...`):

```js

// Tool-surface tier. CORE (default) = the lean trust+discovery set the remote
// endpoint and bare npx package expose; FULL = the whole portfolio surface the
// Claude Code plugin opts into via ACP_FIND_TIER=full in its .mcp.json.
// logErr is a hoisted function declaration (defined below), callable here.
const TIER = (() => {
  const raw = (process.env.ACP_FIND_TIER || "core").toLowerCase();
  if (raw !== "core" && raw !== "full") {
    logErr(`[config] ACP_FIND_TIER="${raw}" is not "core" or "full"; defaulting to "core".`);
    return "core";
  }
  return raw;
})();
```

- [ ] **Step 4: Tag all 47 `TOOLS` entries.** For every object in the `TOOLS` array (starts `server.js:792`), add a `tier` property as the line directly after `name:`. Use the authoritative classification above. Pattern:

```js
  {
    name: "acp_find",
    tier: "core",
    description:
      "Semantic search across every offering ...",
```

```js
  {
    name: "acp_oracle_drift",
    tier: "full",
    description:
      "...",
```

Apply `tier: "core"` to the 20 CORE names and `tier: "full"` to the 27 FULL-only names. The Step-7 smoke (exact core-membership deepEqual + every-tool-tagged) is the guard against a typo or omission.

- [ ] **Step 5: Add the tier helpers** in `server.js`, immediately BEFORE `const HANDLERS = {` (currently `:1831`), i.e. right after the `TOOLS` array closes:

```js
// --- tool tiers ------------------------------------------------------------
const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

// CORE (default) hides the portfolio-specific / niche tools; FULL returns all.
function toolsForTier(tier) {
  return tier === "full" ? TOOLS : TOOLS.filter((t) => t.tier === "core");
}

// Make a tier-hidden tool non-callable, so a guessed full-only name can't be
// dispatched on a CORE front door. Unknown names fall through to the existing
// "Unknown tool" handling in dispatch.
function assertToolInTier(toolName) {
  const tool = TOOL_BY_NAME.get(toolName);
  if (tool && tool.tier === "full" && TIER !== "full") {
    throw new Error(`tool ${toolName} requires the full tier; set ACP_FIND_TIER=full to enable it.`);
  }
}

```

- [ ] **Step 6: Add the gate call** as the first line of `validateToolArgs` (currently `server.js:546-547`):

```js
function validateToolArgs(toolName, args) {
  assertToolInTier(toolName);
  if (args == null) return {};
```

- [ ] **Step 7: Extend the exports** (`server.js:3260-3263`):

```js
export {
  TOOLS, HANDLERS, dispatchTool, validateToolArgs, withSlot, fireBootBeacon,
  SERVER_NAME, SERVER_VERSION, PROTOCOL_VERSION,
  toolsForTier, TIER,
};
```

- [ ] **Step 8: Run the smoke to verify it passes**

Run: `node smoke-v0.18.0.mjs`
Expected: PASS — `smoke-v0.18.0: PASS (core=20, full=47, gate enforced both directions)`. If the membership deepEqual fails, a tool was mis-tagged in Step 4 — fix the tag.

- [ ] **Step 9: Commit**

```bash
git -C "C:/code_crypto/acp/acp-find-plugin" add mcp-server/server.js mcp-server/smoke-v0.18.0.mjs
git -C "C:/code_crypto/acp/acp-find-plugin" commit -m "feat: tier the tool surface (core vs full) behind ACP_FIND_TIER"
```

---

## Task 2: stdio tools/list filter + boot-beacon tier tag

**Files:**
- Modify: `mcp-server/server.js` (`tools/list` at `:3185`; beacon User-Agent at `:778`)
- Modify: `mcp-server/test.js` (spawn env at `:84`; new core-tier test after the existing "all 47" test at `:179`)

**Interfaces:**
- Consumes: `toolsForTier`, `TIER` from Task 1.

- [ ] **Step 1: Make children full by default + add the failing core test** in `test.js`.

First, change the spawn env (`test.js:84`) so every spawned child tests the full surface (matching the plugin), while per-test `env` can still override:

```js
    env: { ...process.env, ACP_API_URL: "http://127.0.0.1:1", ACP_FIND_TIER: "full", ...env }
```

Then add this test immediately after the existing `"tools/list returns all 47 tools with required schemas"` test (after `test.js:179`):

```js
test("tools/list under ACP_FIND_TIER=core returns the 20-tool CORE surface", async () => {
  const conn = startServer({ ACP_FIND_TIER: "core" });
  try {
    await conn.rpc({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "s", version: "0" } }
    });
    const r = await conn.rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const names = r.result.tools.map((t) => t.name);
    assert.equal(names.length, 20, "core tier lists 20 tools");
    assert.ok(!names.includes("acp_oracle_drift"), "portfolio tool hidden under core");
    assert.ok(names.includes("acp_agent_trust"), "core trust tool present");
  } finally {
    conn.close();
  }
});
```

- [ ] **Step 2: Run the suite to verify the new test fails**

Run: `node --test test.js` (from `mcp-server/`)
Expected: the new core test FAILS — `tools/list` still returns the raw `TOOLS` (47), so `names.length` is 47, not 20. (The existing "all 47" test still passes because its child is now full.)

- [ ] **Step 3: Apply the tier filter at `tools/list`** (`server.js:3184-3185`):

```js
    case "tools/list":
      return send({ jsonrpc: "2.0", id, result: { tools: toolsForTier(TIER) } });
```

- [ ] **Step 4: Tag the boot beacon with the tier** (`server.js:778`):

```js
  const headers = { "User-Agent": `acp-find-plugin/${SERVER_VERSION} (${transport}; tier=${TIER})` };
```

- [ ] **Step 5: Run the suite to verify it passes**

Run: `node --test test.js`
Expected: PASS — both the "all 47" test (full child) and the new "20-tool CORE" test (core child) pass.

- [ ] **Step 6: Commit**

```bash
git -C "C:/code_crypto/acp/acp-find-plugin" add mcp-server/server.js mcp-server/test.js
git -C "C:/code_crypto/acp/acp-find-plugin" commit -m "feat: stdio tools/list honors tier; beacon tags tier"
```

---

## Task 3: Edge (remote endpoint) serves CORE

**Files:**
- Modify: `mcp-server/edge/edge.js` (imports at `:12-14`; `ListToolsRequestSchema` handler at `:25`)
- Modify: `mcp-server/edge/edge.test.js` (set tier at top; new tools/list test)

**Interfaces:**
- Consumes: `toolsForTier`, `TIER` from Task 1 (same process — edge imports `server.js`).

- [ ] **Step 1: Add the failing edge test.** In `edge/edge.test.js`, set the tier deterministically at the top (after the existing beacon-disable line `:7`):

```js
process.env.ACP_DISABLE_BOOT_BEACON = "1";
process.env.ACP_FIND_TIER = "core";
const { createEdgeServer } = await import("./edge.js");
```

Then add this test (after the `"POST /mcp initialize returns serverInfo"` test, `edge.test.js:51`):

```js
test("POST /mcp tools/list returns the CORE tier (20 tools)", async () => {
  const srv = createEdgeServer();
  const port = await listen(srv);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    });
    assert.equal(res.status, 200);
    const j = await res.json();
    const names = j.result.tools.map((t) => t.name);
    assert.equal(names.length, 20, "edge default tier is core");
    assert.ok(!names.includes("acp_oracle_drift"), "portfolio tool hidden on edge");
    assert.ok(names.includes("acp_agent_trust"), "core trust tool present on edge");
  } finally {
    srv.close();
  }
});
```

- [ ] **Step 2: Run the edge tests to verify the new test fails**

Run: `node --test edge/edge.test.js` (from `mcp-server/`)
Expected: the new test FAILS — edge still returns all 47 (`tools: TOOLS`).

- [ ] **Step 3: Import the tier helpers in `edge.js`** (`:12-14`). Drop the now-unused `TOOLS` import and add `toolsForTier`, `TIER`:

```js
import {
  dispatchTool, validateToolArgs, withSlot, fireBootBeacon, SERVER_NAME, SERVER_VERSION,
  toolsForTier, TIER,
} from "../server.js";
```

- [ ] **Step 4: Filter the edge `tools/list`** (`edge.js:25`):

```js
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolsForTier(TIER) }));
```

(The CallTool path at `edge.js:28` already calls `validateToolArgs`, so the dispatch gate is enforced automatically.)

- [ ] **Step 5: Run the edge tests to verify they pass**

Run: `node --test edge/edge.test.js`
Expected: PASS — all four original tests plus the new CORE tools/list test.

- [ ] **Step 6: Commit**

```bash
git -C "C:/code_crypto/acp/acp-find-plugin" add mcp-server/edge/edge.js mcp-server/edge/edge.test.js
git -C "C:/code_crypto/acp/acp-find-plugin" commit -m "feat: remote edge endpoint serves the CORE tier"
```

---

## Task 4: Plugin opts into FULL + docs lockstep

**Files:**
- Modify: `.mcp.json` (plugin root)
- Modify: `mcp-server/package.json` (version + description), `.claude-plugin/plugin.json` (version + description)
- Modify: `mcp-server/README.md` (What's new block + counts), `CHANGELOG.md`
- Modify: `docker-compose.edge.yml` (optional explicit `ACP_FIND_TIER=core`)
- Modify: `C:\code_crypto\acp\CLAUDE.md` (workspace repo — companion-tooling bullet)

**Interfaces:** none (config + docs only).

- [ ] **Step 1: Plugin opts into FULL.** Edit `.mcp.json` (plugin root) so the Claude Code plugin keeps all 47 tools + 38 slash commands:

```json
{
  "mcpServers": {
    "acp-find": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp-server/server.js"],
      "env": {
        "ACP_API_URL": "https://api.acp-metabot.dev",
        "ACP_FIND_TIER": "full"
      }
    }
  }
}
```

- [ ] **Step 2: Bump versions.** In `mcp-server/package.json` set `"version": "0.18.0"`; in `.claude-plugin/plugin.json` set `"version": "0.18.0"`. In each `description`, change the tool-count claim from "47 tools" to "20 core / 47 full" and prepend a v0.18.0 lead sentence, e.g.:

```
v0.18.0 tiers the tool surface: a lean 20-tool CORE (trust + discovery) is the default for the remote endpoint and the bare npx package, while the full 47-tool portfolio surface is opt-in via ACP_FIND_TIER=full (the Claude Code plugin sets it).
```

(ASCII only. Leave the older version sentences in place after it.)

- [ ] **Step 3: README What's new block.** In `mcp-server/README.md`, insert a new block immediately above `## What's new in v0.17.0`:

```markdown
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

```

Also update the intro/status tool-count mentions in `README.md` from "47 tools" to "20 core / 47 full" (search the file for "47").

- [ ] **Step 4: CHANGELOG.** Prepend a `## 0.18.0` entry to `CHANGELOG.md` summarizing the CORE/FULL split, the `ACP_FIND_TIER` flag (default `core`), the CORE-only remote endpoint, the plugin opting into FULL, and the no-removal/migration note.

- [ ] **Step 5 (optional): Edge compose clarity.** In `docker-compose.edge.yml`, add `ACP_FIND_TIER=core` to the edge service `environment:` (functionally a no-op since core is the default; documents intent).

- [ ] **Step 6: Workspace CLAUDE.md.** In `C:\code_crypto\acp\CLAUDE.md`, update the `acp-find-mcp` / `acp-find-plugin` companion-tooling bullet to note the v0.18.0 CORE (20) / FULL (47) tiers and the `ACP_FIND_TIER` flag (default core; remote + npx = core; plugin = full).

- [ ] **Step 7: Verify configs + full suite**

Run (from `mcp-server/`):
```bash
node -e "JSON.parse(require('fs').readFileSync('../.mcp.json','utf8')); JSON.parse(require('fs').readFileSync('package.json','utf8')); JSON.parse(require('fs').readFileSync('../.claude-plugin/plugin.json','utf8')); console.log('json ok')"
node --test test.js
node --test edge/edge.test.js
node smoke-v0.18.0.mjs
```
Expected: `json ok`, then all suites PASS and the smoke prints its PASS line.

- [ ] **Step 8: Verify ASCII-only in the published copy**

Run (from `mcp-server/`):
```bash
node -e "for (const f of ['README.md','package.json','../.claude-plugin/plugin.json','../CHANGELOG.md']) { const s=require('fs').readFileSync(f,'utf8'); const bad=[...s].filter(c=>c.codePointAt(0)>127); if(bad.length){console.error(f,'NON-ASCII:',JSON.stringify(bad.slice(0,10)));process.exit(1)} } console.log('ascii ok')"
```
Expected: `ascii ok`. If a file reports NON-ASCII, replace the offending characters (em-dash -> `-`, smart quotes -> `'`/`"`) and re-run. (Note: pre-existing non-ASCII elsewhere in README is out of scope; only fix it if it lands in copy you edited.)

- [ ] **Step 9: Commit (plugin repo, then workspace repo)**

```bash
git -C "C:/code_crypto/acp/acp-find-plugin" add .mcp.json mcp-server/package.json .claude-plugin/plugin.json mcp-server/README.md CHANGELOG.md docker-compose.edge.yml
git -C "C:/code_crypto/acp/acp-find-plugin" commit -m "docs: v0.18.0 tool tiering (CORE default, FULL opt-in); plugin sets full"
git -C "C:/code_crypto/acp" add CLAUDE.md
git -C "C:/code_crypto/acp" commit -m "docs(acp): note acp-find v0.18.0 CORE/FULL tiers + ACP_FIND_TIER"
```

---

## Task 5: Final verification (and optional repo hygiene)

**Files:** none required (verification); optional deletion of artifact files.

- [ ] **Step 1: Full green run**

Run (from `mcp-server/`):
```bash
node --test test.js && node --test edge/edge.test.js && node smoke-v0.18.0.mjs
```
Expected: all suites PASS; smoke prints `smoke-v0.18.0: PASS (core=20, full=47, gate enforced both directions)`.

- [ ] **Step 2: Manual transport sanity check**

Run (from `mcp-server/`):
```bash
# Default (bare npx) = core: expect 20
printf '%s\n%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"s","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | ACP_DISABLE_BOOT_BEACON=1 node server.js | node -e "let b='';process.stdin.on('data',d=>b+=d).on('end',()=>{const l=b.trim().split('\n').map(JSON.parse);const t=l.find(x=>x.id===2);console.log('default tools:',t.result.tools.length)})"
# Full = 47
printf '%s\n%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"s","version":"0"}}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | ACP_DISABLE_BOOT_BEACON=1 ACP_FIND_TIER=full node server.js | node -e "let b='';process.stdin.on('data',d=>b+=d).on('end',()=>{const l=b.trim().split('\n').map(JSON.parse);const t=l.find(x=>x.id===2);console.log('full tools:',t.result.tools.length)})"
```
Expected: `default tools: 20` then `full tools: 47`. (On Windows the Bash tool runs these via Git Bash; the inline-env prefix works there.)

- [ ] **Step 3 (optional): Repo hygiene.** Delete the empty PowerShell `>>`-redirect artifact files in the plugin repo root, `mcp-server/`, and `edge/` (`0`, `1`, `{,`, `console.log('ERR'`, `has`, `${ip`, and similar zero-byte oddities). Verify each is zero bytes and untracked/ignored before deleting (do NOT delete `server.js`, `test.js`, `*.mjs`, or any real source). Add a `.gitignore` guard if helpful. Commit separately:

```bash
git -C "C:/code_crypto/acp/acp-find-plugin" add -- .gitignore
git -C "C:/code_crypto/acp/acp-find-plugin" commit -m "chore: ignore stray shell-redirect artifact files"
```

- [ ] **Step 4: Report.** Summarize what shipped and confirm nothing was pushed or published (both Oliver-gated). The v0.18.0 npm publish + any edge-container redeploy are explicit follow-ups for Oliver to authorize.

---

## Self-review notes

- **Spec coverage:** tier tag (T1), TIER resolution + default (T1), `toolsForTier` filter on both transports (T1 helper, T2 stdio, T3 edge), dispatch gate at the `validateToolArgs` chokepoint (T1), invalid-value -> stderr + core (T1), beacon tier tag (T2), plugin opts FULL (T4), docs lockstep + version + counts + What's new block (T4), tests incl. every-tool-tagged guard (T1/T2/T3), slash-commands unaffected (covered by plugin=FULL, no task needed), repo hygiene (T5, optional). All spec sections map to a task.
- **No placeholders:** every code step shows complete code; every run step states the expected result.
- **Type/name consistency:** `toolsForTier`, `TIER`, `assertToolInTier`, `TOOL_BY_NAME`, `ACP_FIND_TIER`, the `tier` field, and the 20/47 counts are used identically across Tasks 1-4 and both test files.
