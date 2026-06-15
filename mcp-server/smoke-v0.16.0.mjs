// Live smoke for v0.16.0 — the trust layer: acp_agent_trust + de-blinded
// acp_agent_verify + opt-in includeTrust. Boots server.js with the real
// gateway. No operator key needed (acp_agent_trust uses PUBLIC security history
// + clone_screen + reputation). Spaces POSTs to dodge the gateway burst limit.
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SAFE = "0xe4bce29bc099e2a04369f6a2df98dc7d5eac2ac7";   // SafeRouteBot (real, reachable)
const META = "0xecf9773b50f01f3a97b087a6ecdf12a71afc558c";   // TheMetaBot (real front-door)
const MATRIX = "0x07924dea2c8212969d5dc5655785aa5063adb2bc"; // 40-offering clone

await rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "smoke", version: "0" } });

const tools = await rpc("tools/list", {});
console.log("tools count:", tools?.result?.tools?.length, "(expect 47)");
console.log("has acp_agent_trust:", (tools?.result?.tools || []).some((t) => t.name === "acp_agent_trust"));

let r;
for (const [label, addr] of [["SafeRoute", SAFE], ["Metabot", META], ["MATRIX(clone)", MATRIX]]) {
  r = await call("acp_agent_trust", { agentAddress: addr });
  console.log(`acp_agent_trust(${label}):`, r.isError ? "ERR " + JSON.stringify(r.obj).slice(0, 180)
    : `${r.obj.trustVerdict} score=${r.obj.trustScore} — ${r.obj.headline}`);
  await sleep(5000); // clone_screen + history fan-out — space POSTs past the burst limit
}

r = await call("acp_agent_verify", { walletAddress: META, depth: "full" });
console.log("acp_agent_verify(Metabot) de-blinded:", r.isError ? "ERR " + JSON.stringify(r.obj).slice(0, 180)
  : `${r.obj.verdict} — ${r.obj.headline}; jobs.asProvider.completed=${r.obj.jobs?.asProvider?.completed}`);
await sleep(5000);

r = await call("acp_find", { query: "wallet security and approvals", limit: 3, includeTrust: true });
const rows = r.obj?.results || [];
console.log("acp_find(includeTrust):", r.isError ? "ERR " + JSON.stringify(r.obj).slice(0, 180)
  : `${rows.length} results; trust=[${rows.map((x) => x.trust ? `${String(x.agentName || x.agentAddress || "?").slice(0, 10)}:${x.trust.grade ?? x.trust.status}` : "none").join(", ")}]`);

child.kill();
process.exit(0);
