// Live smoke for acp-find-mcp v0.14.0 — exercises the two new security tools
// against the real gateway over stdio. Run: `node smoke-v0.14.0.mjs`.
//
// EXPECTED STATE NOTE: the GET /v1/securityScanHistory gateway endpoint ships in
// the SAME release as this plugin but deploys to the droplet separately. Until
// TheMetaBot is redeployed, acp_agent_security_history will surface a 404 from the
// gateway — that is EXPECTED and itself proves the wrapper forwards correctly
// (gateway-side, not a wrapper bug). After the Metabot deploy, it returns
// { agentAddress, count, history[] }. acp_security_scan is operator-only: with no
// ACP_API_KEY it returns the operator-only refusal (no network call).

import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["server.js"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, ACP_API_URL: "https://api.acp-metabot.dev", ACP_VERBOSE: "1" },
});

let buf = "";
const waiters = [];
child.stdout.on("data", (c) => {
  buf += c.toString();
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    const w = waiters.shift();
    if (w) try { w.resolve(JSON.parse(line)); } catch (e) { w.reject(e); }
  }
});
const rpc = (msg) => new Promise((resolve, reject) => {
  waiters.push({ resolve, reject });
  child.stdin.write(JSON.stringify(msg) + "\n");
});
const call = async (name, args) => {
  const r = await rpc({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } });
  const text = r.result?.content?.[0]?.text ?? JSON.stringify(r.result);
  console.log(`\n=== ${name}(${JSON.stringify(args)}) isError=${r.result?.isError ?? false} ===`);
  console.log(text.slice(0, 700));
};

const A = "0xa42b000000000000000000000000000000000048"; // shape-valid sample address

try {
  await rpc({ jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "smoke", version: "0.14.0" } } });

  // 1) history — public; 404 until the Metabot route deploys, else { count, history[] }.
  await call("acp_agent_security_history", { agentAddress: A, limit: 3 });

  // 2) scan — operator-only; without ACP_API_KEY this is the refusal path (no network).
  await call("acp_security_scan", { agentAddress: A });

  // 3) pattern — confirms the catalogue reads 74 live.
  await call("acp_security_pattern", {});
} finally {
  child.kill();
}
