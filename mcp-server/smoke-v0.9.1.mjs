// v0.9.1 live smoke runner — boots server.js against the real gateway and
// exercises each of the 8 new tools once. Not part of the published package;
// run manually with `node smoke-v0.9.1.mjs` after editing server.js.
//
// Requires the public gateway at https://api.acp-metabot.dev to be reachable.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(__dirname, "server.js");

const child = spawn(process.execPath, [SERVER], {
  stdio: ["pipe", "pipe", "inherit"],
  env: {
    ...process.env,
    ACP_API_URL: "https://api.acp-metabot.dev",
    ACP_VERBOSE: "1",
  },
});

let buf = "";
const queue = [];
child.stdout.on("data", (chunk) => {
  buf += chunk.toString();
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    const next = queue.shift();
    if (!next) continue;
    try { next.resolve(JSON.parse(line)); }
    catch (err) { next.reject(err); }
  }
});

let nextId = 1;
function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    queue.push({ resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

async function call(name, args = {}) {
  console.log(`\n=== ${name} ===`);
  const t0 = Date.now();
  const r = await rpc("tools/call", { name, arguments: args });
  const ms = Date.now() - t0;
  if (r.result?.isError) {
    console.log(`ERROR (${ms}ms): ${r.result.content[0].text.slice(0, 400)}`);
    return null;
  }
  const text = r.result.content[0].text;
  console.log(`OK (${ms}ms): ${text.length} chars`);
  // Surface a key field per tool for visual smoke.
  try {
    const parsed = JSON.parse(text);
    const summary = {};
    if (parsed.verdict)     summary.verdict     = parsed.verdict;
    if (parsed.score !== undefined) summary.score = parsed.score;
    if (parsed.grade)       summary.grade       = parsed.grade;
    if (parsed.headline)    summary.headline    = parsed.headline.slice(0, 120);
    if (parsed.opportunities) summary.opportunities = parsed.opportunities.length;
    if (parsed.weights)     summary.weights     = parsed.weights;
    if (parsed.grades)      summary.grades      = parsed.grades.map(g => g.grade).join("");
    console.log("  →", JSON.stringify(summary));
  } catch {
    console.log("  (non-JSON or parse error)");
  }
  return r;
}

(async () => {
  // Handshake
  await rpc("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "smoke-v0.9.1", version: "1" },
  });
  const tools = await rpc("tools/list", {});
  console.log(`tools/list reports ${tools.result.tools.length} tools`);

  // Exercise the 8 new tools. TheMetaBot is 0xecf9...558c per CLAUDE.md.
  const metabot = "0xecf99cda7afa4ad34c4e4a83a87bf42c3ec1558c";
  const oraclebot = "0x935e97046b10832664d007430c7b7fd310a6236e";

  await call("acp_risk_sources");
  await call("acp_risk_rubric");
  await call("acp_marketplace_gap", { limit: 3 });
  await call("acp_risk_snapshot", { walletAddress: metabot, chain: "base" });
  await call("acp_risk_deep_dive", { walletAddress: metabot, chain: "base" });
  await call("acp_risk_compare", { walletAddresses: [metabot, oraclebot], chain: "base" });
  await call("acp_risk_attestation", { walletAddress: metabot, chain: "base" });
  await call("acp_agent_verify", { walletAddress: metabot, chain: "base", depth: "lite" });

  child.kill();
  process.exit(0);
})().catch((err) => {
  console.error("smoke failed:", err);
  child.kill();
  process.exit(1);
});
