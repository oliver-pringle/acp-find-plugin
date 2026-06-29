// Deterministic edge tests: /health and the /mcp initialize handshake do NOT
// touch the network. The live /trust/<valid> path makes real gateway+indexer
// calls and is exercised by smoke-v0.17.0.mjs, not here.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.ACP_DISABLE_BOOT_BEACON = "1";
process.env.ACP_FIND_TIER = "core";
const { createEdgeServer } = await import("./edge.js");

function listen(server) {
  return new Promise((resolve) => {
    const s = server.listen(0, "127.0.0.1", () => resolve(s.address().port));
  });
}

test("GET /health returns ok + version", async () => {
  const srv = createEdgeServer();
  const port = await listen(srv);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.ok, true);
    assert.ok(j.version, "version present");
  } finally {
    srv.close();
  }
});

test("POST /mcp initialize returns serverInfo", async () => {
  const srv = createEdgeServer();
  const port = await listen(srv);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } },
      }),
    });
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.result.serverInfo.name, "acp-find");
  } finally {
    srv.close();
  }
});

test("POST /mcp tools/list returns the CORE tier (20 tools)", async () => {
  const srv = createEdgeServer();
  const port = await listen(srv);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    });
    assert.equal(res.status, 200);
    const j = await res.json();
    const names = j.result.tools.map((t) => t.name);
    assert.equal(names.length, 20, "edge default tier is core");
    assert.ok(!names.includes("acp_oracle_drift"), "portfolio tool hidden on edge");
    assert.ok(names.includes("acp_agent_trust"), "core trust tool present on edge");
  } finally {
    srv.close();
  }
});

test("GET /trust/<bad> returns 400", async () => {
  const srv = createEdgeServer();
  const port = await listen(srv);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/trust/nope`);
    assert.equal(res.status, 400);
  } finally {
    srv.close();
  }
});

test("unknown route returns 404", async () => {
  const srv = createEdgeServer();
  const port = await listen(srv);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/nope`);
    assert.equal(res.status, 404);
  } finally {
    srv.close();
  }
});
