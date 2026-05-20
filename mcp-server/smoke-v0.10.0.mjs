// v0.10.0 live smoke runner — boots server.js against the real gateway and
// exercises each of the 6 new tools + the 2 pagination updates once.
// Run manually with `node smoke-v0.10.0.mjs` after edits.

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
  try {
    const parsed = JSON.parse(text);
    const summary = {};
    if (parsed.sources)        summary.sources = parsed.sources.length;
    if (parsed.tokensWithIncidents !== undefined) summary.incidents = parsed.tokensWithIncidents;
    if (parsed.supported !== undefined) {
      summary.supported = parsed.supported;
      summary.supportingSources = parsed.supportingSources?.length ?? 0;
    }
    if (parsed.recommendation) summary.recommendation = parsed.recommendation.offeringName;
    if (parsed.ranking)        summary.rankingCount = parsed.ranking.length;
    if (parsed.verdict)        summary.verdict = parsed.verdict;
    if (parsed.bots)           {
      summary.bots = parsed.bots.length;
      summary.healthy = parsed.healthyCount;
      summary.bestLatency = Math.min(...parsed.bots.filter(b => b.reachable).map(b => b.latencyMs));
    }
    if (parsed.count !== undefined && !parsed.bots) summary.resultCount = parsed.count;
    console.log("  →", JSON.stringify(summary));
  } catch {
    console.log("  (non-JSON or parse error)");
  }
  return r;
}

(async () => {
  await rpc("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "smoke-v0.10.0", version: "1" },
  });
  const tools = await rpc("tools/list", {});
  console.log(`tools/list reports ${tools.result.tools.length} tools`);

  const metabot = "0xecf99cda7afa4ad34c4e4a83a87bf42c3ec1558c";

  // OracleBot Resource wrappers
  await call("acp_oracle_sources", { chainId: 8453 });
  await call("acp_oracle_drift", { chainId: 8453 });
  await call("acp_oracle_capabilities", { chainId: 8453, tokenSymbol: "ETH" });

  // Cross-portfolio composites
  await call("acp_portfolio_status");
  await call("acp_hire_decision", { useCase: "wallet intelligence", budgetUsdc: 5 });
  await call("acp_safe_quote", { agentAddress: metabot, offeringName: "today" });

  // Pagination schema sanity (offset accepted without 4xx)
  await call("acp_recent_hires", { days: 30, limit: 3, offset: 0 });
  await call("acp_agent_recent_jobs", { agentAddress: metabot, days: 30, limit: 3, offset: 0 });

  child.kill();
  process.exit(0);
})().catch((err) => {
  console.error("smoke failed:", err);
  child.kill();
  process.exit(1);
});
