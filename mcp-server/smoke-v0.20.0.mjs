// Live smoke for v0.20.0 against the real gateway + official indexer.
// Acceptance targets (RoFlo R28):
//   1. acp_agent_trust(scriptmasterlabs) - organic count drops from 15/3 to ~1/1
//      (its zzz000/ZZZ_test buyers are now seeded + name-caught) and the delivery
//      lane carries responsiveness.
//   2. acp_recent_hires rows carry washLikely/washReasons.
//   3. acp_clone_screen(Big Brain Ape) - off_platform_funds_solicitation fires on the
//      "unlock_fully_autonomous_trading_500_usdc_minimum" bait listing + its seeded
//      QA runner strips the 28 self-QA completions.
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["server.js"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, ACP_API_URL: "https://api.acp-metabot.dev", ACP_FIND_TIER: "full" },
});
let buf = "";
const pending = new Map();
child.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    try { const m = JSON.parse(line); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } } catch {}
  }
});
let seq = 0;
function rpc(method, params) {
  const id = ++seq;
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((res, rej) => {
    pending.set(id, res);
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`timeout ${method}`)); } }, 90_000);
  });
}
const call = async (name, args) => {
  const r = await rpc("tools/call", { name, arguments: args });
  const text = r?.result?.content?.[0]?.text ?? "{}";
  return JSON.parse(text);
};

await rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "smoke", version: "0" } });

// 1. ACCEPTANCE: scriptmasterlabs honest count
const trust = await call("acp_agent_trust", { agentAddress: "0x72330994f379a71542e7bd5a4cf99a9d9743f4aa" });
const d = trust?.lanes?.delivery ?? {};
console.log(`[1] scriptmasterlabs: verdict=${trust.trustVerdict} organic=${d.organicExternalCompleted}/${d.organicDistinctBuyers} boostExcluded=${d.boostExcludedCount} responsiveness=${JSON.stringify(d.responsiveness)}`);
console.log(`    headline: ${trust.headline}`);

await new Promise((r) => setTimeout(r, 5000));

// 2. recent_hires washLikely
const rh = await call("acp_recent_hires", { days: 7, limit: 10, marketplace: "v2" });
const rows = rh?.results ?? [];
const flagged = rows.filter((r) => r.washLikely === true).length;
const withField = rows.filter((r) => "washLikely" in r).length;
console.log(`[2] recent_hires: rows=${rows.length} withWashField=${withField} washLikely=true on ${flagged}${rh.washScreenNote ? ` note="${rh.washScreenNote}"` : ""}`);
for (const r of rows.slice(0, 5)) console.log(`    ${r.agentName} ${r.offeringName} delta=${r.delta} washLikely=${r.washLikely} ${JSON.stringify(r.washReasons ?? [])}`);

await new Promise((r) => setTimeout(r, 5000));

// 3. Big Brain Ape: bait-listing flag + seeded runner strip
const clone = await call("acp_clone_screen", { agentAddress: "0x37a8023762c69f7150d878733fd9f635f1070fc6" });
const sig = (clone?.signals ?? []).map((s) => s.signal);
console.log(`[3] BBA clone_screen: verdict=${clone.verdict} signals=[${sig.join(", ")}] organic=${clone?.jobs?.organicExternalCompleted}/${clone?.jobs?.organicDistinctBuyers} boostExcluded=${clone?.jobs?.boostExcludedCount}`);
console.log(`    responsiveness=${JSON.stringify(clone?.jobs?.responsiveness)}`);

child.kill();
process.exit(0);
