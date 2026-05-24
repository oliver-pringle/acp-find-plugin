// v0.10.1 live smoke runner — boots server.js against the real gateway and
// exercises the four runtime safeguards: SSRF guard, body caps, concurrency
// semaphore, verbose-log redaction. The semaphore + redaction are local-only
// invariants (no gateway involvement); the SSRF + body-cap paths are tested
// against a local stub since real Metabot Resources are all public.
//
// Run manually with `node smoke-v0.10.1.mjs` after publish. No npm publish
// happens from this script.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(__dirname, "server.js");

function startStubGateway(responder) {
  const server = createServer((req, res) => responder(req, res));
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

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
        try { next.resolve(JSON.parse(line)); }
        catch (err) { next.reject(err); }
      }
    });
  }
  rpc(method, params, id = 1) {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });
  }
  close() { this.child.kill(); }
}

function spawnServer(env) {
  return spawn(process.execPath, [SERVER], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });
}

async function init(conn) {
  await conn.rpc("initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "smoke-v0.10.1", version: "1" },
  });
}

async function call(conn, name, args = {}, id = 2) {
  const t0 = Date.now();
  const r = await conn.rpc("tools/call", { name, arguments: args }, id);
  const ms = Date.now() - t0;
  return { r, ms };
}

let nextId = 100;

(async () => {
  console.log("=== v0.10.1 smoke: live gateway sanity ===");
  {
    const child = spawnServer({ ACP_API_URL: "https://api.acp-metabot.dev" });
    const conn = new Conn(child);
    try {
      await init(conn);
      const tools = await conn.rpc("tools/list", {}, nextId++);
      console.log(`  tools/list: ${tools.result.tools.length} tools (expect 37)`);
      const { r, ms } = await call(conn, "acp_today", {}, nextId++);
      if (r.result?.isError) {
        console.log(`  acp_today: ERROR (${ms}ms) ${r.result.content[0].text.slice(0, 200)}`);
      } else {
        console.log(`  acp_today: OK (${ms}ms) ${r.result.content[0].text.length} chars`);
      }
    } finally { conn.close(); }
  }

  console.log("\n=== v0.10.1 smoke: SSRF guard rejects loopback resource ===");
  {
    const gw = await startStubGateway((req, res) => {
      if (req.url.startsWith("/v1/agent/")) {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({
          resources: [{ name: "evil", url: "http://127.0.0.1:1/admin" }]
        }));
        return;
      }
      res.statusCode = 404; res.end();
    });
    const child = spawnServer({ ACP_API_URL: gw.url });
    const conn = new Conn(child);
    try {
      await init(conn);
      const { r } = await call(conn, "acp_resource_call", {
        agentAddress: "0x" + "a".repeat(40),
        resourceName: "evil",
      }, nextId++);
      const text = r.result?.content?.[0]?.text || "(no text)";
      const ok = r.result?.isError && /blocked.*(loopback|private|link-local)/i.test(text);
      console.log(`  ${ok ? "PASS" : "FAIL"} — ${text.slice(0, 200)}`);
    } finally { conn.close(); await gw.close(); }
  }

  console.log("\n=== v0.10.1 smoke: body cap on resource call ===");
  {
    const big = await startStubGateway((req, res) => {
      res.setHeader("content-type", "application/json");
      res.setHeader("transfer-encoding", "chunked");
      res.write('{"data":"');
      const chunk = "x".repeat(64 * 1024);
      let sent = 0;
      const iv = setInterval(() => {
        res.write(chunk);
        sent += chunk.length;
        if (sent >= 1024 * 1024) {
          clearInterval(iv);
          res.write('"}');
          res.end();
        }
      }, 5);
    });
    const gw = await startStubGateway((req, res) => {
      if (req.url.startsWith("/v1/agent/")) {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({
          resources: [{ name: "huge", url: `${big.url}/feed` }]
        }));
        return;
      }
      res.statusCode = 404; res.end();
    });
    const child = spawnServer({
      ACP_API_URL: gw.url,
      ACP_RESOURCE_BODY_LIMIT: "65536",
      ACP_ALLOW_LOOPBACK_RESOURCES: "1",
    });
    const conn = new Conn(child);
    try {
      await init(conn);
      const { r } = await call(conn, "acp_resource_call", {
        agentAddress: "0x" + "a".repeat(40),
        resourceName: "huge",
      }, nextId++);
      const text = r.result?.content?.[0]?.text || "(no text)";
      const ok = r.result?.isError && /exceeded.*bytes/i.test(text);
      console.log(`  ${ok ? "PASS" : "FAIL"} — ${text.slice(0, 200)}`);
    } finally { conn.close(); await gw.close(); await big.close(); }
  }

  console.log("\n=== v0.10.1 smoke: concurrency cap (3 calls under cap=1) ===");
  {
    const gw = await startStubGateway((req, res) => {
      setTimeout(() => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true }));
      }, 200);
    });
    const child = spawnServer({ ACP_API_URL: gw.url, ACP_MAX_CONCURRENT: "1" });
    const conn = new Conn(child);
    try {
      await init(conn);
      const start = Date.now();
      await Promise.all([
        conn.rpc("tools/call", { name: "acp_today", arguments: {} }, nextId++),
        conn.rpc("tools/call", { name: "acp_today", arguments: {} }, nextId++),
        conn.rpc("tools/call", { name: "acp_today", arguments: {} }, nextId++),
      ]);
      const elapsed = Date.now() - start;
      const ok = elapsed >= 450;
      console.log(`  ${ok ? "PASS" : "FAIL"} — 3 calls × 200 ms upstream = ${elapsed} ms elapsed (cap=1 should serialise to ≥450 ms)`);
    } finally { conn.close(); await gw.close(); }
  }

  console.log("\n=== v0.10.1 smoke: stderr redacts query strings ===");
  {
    const gw = await startStubGateway((req, res) => {
      if (req.url.startsWith("/v1/agent/")) {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({
          resources: [{ name: "search", url: `${gw.url}/search` }]
        }));
        return;
      }
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    });
    const stderrChunks = [];
    const child = spawnServer({
      ACP_API_URL: gw.url,
      ACP_VERBOSE: "1",
      ACP_ALLOW_LOOPBACK_RESOURCES: "1",
    });
    child.stderr.on("data", (c) => stderrChunks.push(c.toString()));
    const conn = new Conn(child);
    try {
      await init(conn);
      await call(conn, "acp_resource_call", {
        agentAddress: "0x" + "a".repeat(40),
        resourceName: "search",
        params: { apiKey: "supersecret123" },
      }, nextId++);
      await new Promise(r => setTimeout(r, 50));
      const stderr = stderrChunks.join("");
      const ok = !stderr.includes("supersecret123") && !stderr.includes("apiKey=");
      console.log(`  ${ok ? "PASS" : "FAIL"} — supersecret123 ${stderr.includes("supersecret123") ? "LEAKED" : "absent"}; apiKey= ${stderr.includes("apiKey=") ? "LEAKED" : "absent"}`);
    } finally { conn.close(); await gw.close(); }
  }

  console.log("\n=== done ===");
  process.exit(0);
})().catch((err) => {
  console.error("smoke failed:", err);
  process.exit(1);
});
