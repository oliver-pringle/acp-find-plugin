// Live smoke for v0.16.2 — the acp_agent_trust ORGANIC-delivery refinement.
// Boots local server.js against the real gateway + official indexer. Expect:
//   - the operator's OWN bots (completions only from portfolio/Tester wallets) →
//     organicExternalCompleted 0 → OPERATIONAL, NOT VERIFIED (the whole point).
//   - a bot with a genuine external buyer → organic ≥ 1 → can be VERIFIED.
//   - a clone → LIKELY_CLONE / UNVERIFIED.
import { spawn } from "node:child_process";
import readline from "node:readline";

const child = spawn(process.execPath, ["server.js"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, ACP_API_URL: "https://api.acp-metabot.dev", ACP_DISABLE_BOOT_BEACON: "1" },
});
const rl = readline.createInterface({ input: child.stdout });
const pending = new Map();
rl.on("line", (line) => { let m; try { m = JSON.parse(line); } catch { return; } if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
let idc = 1;
function rpc(method, params) { const id = idc++; return new Promise((r) => { pending.set(id, r); child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); }); }
async function call(name, args) { const r = await rpc("tools/call", { name, arguments: args }); const t = r?.result?.content?.[0]?.text ?? ""; let o; try { o = JSON.parse(t); } catch { o = { raw: String(t).slice(0, 160) }; } return o; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const META = "0xecf9773b50f01f3a97b087a6ecdf12a71afc558c";   // own — portfolio/dogfood only
const ORACLE = "0x935e97046b10832664d007430c7b7fd310a6236e"; // own, but 1 genuine external buyer (Whitepaper Grey)
const MATRIX = "0x07924dea2c8212969d5dc5655785aa5063adb2bc"; // clone

await rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "smoke", version: "0" } });
for (const [label, addr] of [["Metabot(own)", META], ["OracleBot(own,1ext)", ORACLE], ["MATRIX(clone)", MATRIX]]) {
  const o = await call("acp_agent_trust", { agentAddress: addr });
  const d = o.lanes?.delivery ?? {};
  console.log(`${label}: ${o.trustVerdict} score=${o.trustScore} | organic=${d.organicExternalCompleted} external=${d.externalCompleted} completed=${d.completed}`);
  await sleep(6000);
}
child.kill();
process.exit(0);
