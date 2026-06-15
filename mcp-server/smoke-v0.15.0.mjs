// Live smoke for v0.15.0 — the 4 official-indexer transaction tools.
// Boots server.js with the real gateway; the indexer URL is hardcoded.
import { spawn } from "node:child_process";
import readline from "node:readline";

const child = spawn(process.execPath, ["server.js"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, ACP_API_URL: "https://api.acp-metabot.dev", ACP_DISABLE_BOOT_BEACON: "1" },
});
const rl = readline.createInterface({ input: child.stdout });
const pending = new Map();
rl.on("line", (line) => {
  let msg; try { msg = JSON.parse(line); } catch { return; }
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
let idc = 1;
function rpc(method, params) {
  const id = idc++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}
async function call(name, args) {
  const res = await rpc("tools/call", { name, arguments: args });
  const txt = res?.result?.content?.[0]?.text ?? "";
  let obj; try { obj = JSON.parse(txt); } catch { obj = { raw: String(txt).slice(0, 200) }; }
  return { isError: res?.result?.isError, obj };
}

const SAFE = "0xe4bce29bc099e2a04369f6a2df98dc7d5eac2ac7";
const META = "0xecf9773b50f01f3a97b087a6ecdf12a71afc558c";
const MATRIX = "0x07924dea2c8212969d5dc5655785aa5063adb2bc";

await rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "smoke", version: "0" } });

const tools = await rpc("tools/list", {});
console.log("tools count:", tools?.result?.tools?.length);

let r;
r = await call("acp_agent_jobs", { agentAddress: SAFE });
console.log("acp_agent_jobs(SafeRoute):", r.isError ? "ERR " + JSON.stringify(r.obj).slice(0,160)
  : `prov ${r.obj.asProvider?.completed}/${r.obj.asProvider?.total} rate=${r.obj.asProvider?.completionRate} distinct=${r.obj.asProvider?.distinctCounterparties}`);

r = await call("acp_v2_transactions", { agentAddress: META, role: "provider", limit: 3 });
console.log("acp_v2_transactions(Metabot prov):", r.isError ? "ERR " + JSON.stringify(r.obj).slice(0,160)
  : `rollup total=${r.obj.rollup?.provider?.total} completed=${r.obj.rollup?.provider?.completed}; job0=${r.obj.jobs?.[0]?.offering}/${r.obj.jobs?.[0]?.jobStatus} from ${r.obj.jobs?.[0]?.counterparty?.name}`);

r = await call("acp_v2_demand", { pages: 2, limit: 5 });
console.log("acp_v2_demand:", r.isError ? "ERR " + JSON.stringify(r.obj).slice(0,160)
  : `providersSeen=${r.obj.providersSeen}; top=` + (r.obj.providers || []).slice(0, 5).map((p) => `${p.providerName || p.providerAddress?.slice(0, 10)}:${p.completed}`).join(", "));

r = await call("acp_clone_screen", { agentAddress: MATRIX });
console.log("acp_clone_screen(MATRIX):", r.isError ? "ERR " + JSON.stringify(r.obj).slice(0,160)
  : `${r.obj.verdict} score=${r.obj.score} offerings=${r.obj.offeringCount} signals=[${(r.obj.signals || []).map((s) => s.signal).join("|")}]`);

r = await call("acp_clone_screen", { agentAddress: SAFE });
console.log("acp_clone_screen(SafeRoute):", r.isError ? "ERR " + JSON.stringify(r.obj).slice(0,160)
  : `${r.obj.verdict} score=${r.obj.score} signals=[${(r.obj.signals || []).map((s) => s.signal).join("|")}]`);

child.kill();
process.exit(0);
