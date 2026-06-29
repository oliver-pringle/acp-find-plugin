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
