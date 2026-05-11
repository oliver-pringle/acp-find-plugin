// Smoke test for the acp-find MCP server. Runs entirely offline — verifies
// the JSON-RPC handshake, tools/list shape, and that argument validation
// surfaces an isError result. No npm dependencies; uses node:test + plain
// stdio.
//
// Run with `node --test test.js` or `npm test`.

import { spawn } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(__dirname, "server.js");
const PKG = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8"));
const PROTOCOL_VERSION = "2025-11-25";

class Conn {
  constructor(child) {
    this.child = child;
    this.buf = "";
    this.queue = [];
    child.stdout.on("data", (chunk) => {
      this.buf += chunk.toString();
      let i;
      while ((i = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        if (!line) continue;
        const next = this.queue.shift();
        if (!next) continue;
        try {
          next.resolve(JSON.parse(line));
        } catch (err) {
          next.reject(err);
        }
      }
    });
  }
  rpc(msg) {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.child.stdin.write(JSON.stringify(msg) + "\n");
    });
  }
  notify(msg) {
    this.child.stdin.write(JSON.stringify(msg) + "\n");
  }
  close() {
    this.child.kill();
  }
}

function startServer(env = {}) {
  // Point at a guaranteed-broken URL so any accidental gateway call in tests
  // surfaces immediately rather than hanging on DNS / a slow real endpoint.
  const child = spawn(process.execPath, [SERVER], {
    stdio: ["pipe", "pipe", "ignore"],
    env: { ...process.env, ACP_API_URL: "http://127.0.0.1:1", ...env }
  });
  return new Conn(child);
}

const EXPECTED_TOOLS = [
  "acp_agent_recent_jobs",
  "acp_agent_reputation",
  "acp_agent_reputation_history",
  "acp_agent_resources",
  "acp_browse_agent",
  "acp_categories",
  "acp_compare_agents",
  "acp_compose_stack",
  "acp_estimate_stack_cost",
  "acp_find",
  "acp_health",
  "acp_offering",
  "acp_recent_hires",
  "acp_resource_call",
  "acp_resources_search",
  "acp_search_agents",
  "acp_today",
  "acp_watch_status"
];

test("initialize handshake returns server info + protocol version", async () => {
  const conn = startServer();
  try {
    const r = await conn.rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "smoke", version: "0.0.1" }
      }
    });
    assert.equal(r.jsonrpc, "2.0");
    assert.equal(r.id, 1);
    assert.equal(r.result.protocolVersion, PROTOCOL_VERSION);
    assert.equal(r.result.serverInfo.name, "acp-find");
    assert.equal(r.result.serverInfo.version, PKG.version);
  } finally {
    conn.close();
  }
});

test("tools/list returns all 18 tools with required schemas", async () => {
  const conn = startServer();
  try {
    await conn.rpc({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "s", version: "0" } }
    });
    const r = await conn.rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const names = r.result.tools.map(t => t.name).sort();
    assert.deepEqual(names, [...EXPECTED_TOOLS].sort());
    for (const tool of r.result.tools) {
      assert.ok(tool.description?.length > 10, `${tool.name} needs a description`);
      assert.equal(tool.inputSchema.type, "object", `${tool.name} schema must be object`);
    }
  } finally {
    conn.close();
  }
});

test("tools/call with missing required arg surfaces isError", async () => {
  const conn = startServer();
  try {
    await conn.rpc({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "s", version: "0" } }
    });
    const r = await conn.rpc({
      jsonrpc: "2.0", id: 2, method: "tools/call",
      params: { name: "acp_find", arguments: {} } // no query
    });
    assert.equal(r.result.isError, true);
    assert.match(r.result.content[0].text, /query is required/);
  } finally {
    conn.close();
  }
});

test("tools/call with unknown tool name returns isError", async () => {
  const conn = startServer();
  try {
    await conn.rpc({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "s", version: "0" } }
    });
    const r = await conn.rpc({
      jsonrpc: "2.0", id: 2, method: "tools/call",
      params: { name: "acp_does_not_exist", arguments: {} }
    });
    assert.equal(r.result.isError, true);
    assert.match(r.result.content[0].text, /Unknown tool/);
  } finally {
    conn.close();
  }
});

test("acp_compare_agents validates address shape", async () => {
  const conn = startServer();
  try {
    await conn.rpc({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "s", version: "0" } }
    });
    const r = await conn.rpc({
      jsonrpc: "2.0", id: 2, method: "tools/call",
      params: { name: "acp_compare_agents", arguments: { agentAddresses: ["0xabc", "not-a-wallet"] } }
    });
    assert.equal(r.result.isError, true);
    assert.match(r.result.content[0].text, /invalid wallet address/i);
  } finally {
    conn.close();
  }
});

test("acp_estimate_stack_cost rolls one-shot + subscription items into monthly total", async () => {
  const conn = startServer();
  try {
    await conn.rpc({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "s", version: "0" } }
    });
    const r = await conn.rpc({
      jsonrpc: "2.0", id: 2, method: "tools/call",
      params: {
        name: "acp_estimate_stack_cost",
        arguments: {
          items: [
            // $0.01 × 100 = $1.00/mo
            { offeringName: "search", priceUsd: 0.01, priceType: "one_shot", usesPerMonth: 100 },
            // $5 / 7d = $21.43/mo
            { offeringName: "vrf_audit_pack", priceUsd: 5.0, priceType: "subscription", durationDays: 7 },
            // $50/30d = $50/mo
            { offeringName: "macro_treasury", priceUsd: 50.0, priceType: "subscription", durationDays: 30 }
          ],
          budgetUsdMonthly: 100
        }
      }
    });
    assert.equal(r.result.isError, undefined);
    const parsed = JSON.parse(r.result.content[0].text);
    // 1 + 21.428571… + 50 ≈ 72.43
    assert.ok(parsed.totalUsdMonthly > 72 && parsed.totalUsdMonthly < 73,
      `expected total ~72.43, got ${parsed.totalUsdMonthly}`);
    assert.equal(parsed.withinBudget, true);
    assert.equal(parsed.breakdown.length, 3);
    assert.equal(parsed.breakdown[0].monthlyUsd, 1);
  } finally {
    conn.close();
  }
});

test("acp_resource_call requires agentAddress and resourceName", async () => {
  const conn = startServer();
  try {
    await conn.rpc({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "s", version: "0" } }
    });
    const r1 = await conn.rpc({
      jsonrpc: "2.0", id: 2, method: "tools/call",
      params: { name: "acp_resource_call", arguments: { resourceName: "searchStatus" } }
    });
    assert.equal(r1.result.isError, true);
    assert.match(r1.result.content[0].text, /agentAddress is required/);

    const r2 = await conn.rpc({
      jsonrpc: "2.0", id: 3, method: "tools/call",
      params: { name: "acp_resource_call", arguments: { agentAddress: "0xabc" } }
    });
    assert.equal(r2.result.isError, true);
    assert.match(r2.result.content[0].text, /resourceName is required/);
  } finally {
    conn.close();
  }
});

test("ping responds with empty result", async () => {
  const conn = startServer();
  try {
    await conn.rpc({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "s", version: "0" } }
    });
    const r = await conn.rpc({ jsonrpc: "2.0", id: 2, method: "ping" });
    assert.deepEqual(r.result, {});
  } finally {
    conn.close();
  }
});
