// Live smoke for v0.20.1 - dead-open responsiveness fix + boost-vendor seeds.
// Acceptance: AgentEval's responsiveness discloses openDeadExpired>0 (June zombies
// reclassified) and the vendor screen shows boost signals. Run: node smoke-v0.20.1.mjs
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["server.js"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, ACP_API_URL: "https://api.acp-metabot.dev", ACP_FIND_TIER: "full" },
});
let buf = "";
const pending = new Map();
let id = 0;
child.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    try { const m = JSON.parse(line); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } } catch { /* log line */ }
  }
});
const rpc = (method, params) => new Promise((res) => {
  const m = { jsonrpc: "2.0", id: ++id, method, params };
  pending.set(m.id, res);
  child.stdin.write(JSON.stringify(m) + "\n");
});
const call = async (name, args) => {
  const r = await rpc("tools/call", { name, arguments: args });
  const t = r?.result?.content?.[0]?.text;
  try { return t ? JSON.parse(t) : r; } catch { return { raw: t }; }
};

await rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "smoke-v0.20.1", version: "0" } });
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

const trust = await call("acp_agent_trust", { agentAddress: "0xb97552998e7ee94ef2a260fdc25529ed93e4902b" });
const resp = trust?.lanes?.delivery?.responsiveness ?? trust?.delivery?.responsiveness ?? trust?.responsiveness;
console.log("[smoke] AgentEval verdict:", trust?.trustVerdict, "score:", trust?.trustScore);
console.log("[smoke] AgentEval responsiveness:", JSON.stringify(resp));
console.log("[smoke] AgentEval headline:", trust?.headline);

await new Promise((r) => setTimeout(r, 6000)); // gateway burst limit

const clone = await call("acp_clone_screen", { agentAddress: "0x47ba351968c4ec5a1e8e63830536b247b4bde2b9" });
const signals = (clone?.signals ?? []).map((s) => s?.signal ?? s);
console.log("[smoke] AgentReputer verdict:", clone?.verdict ?? clone?.cloneVerdict, "signals:", JSON.stringify(signals));

child.kill();
process.exit(0);
