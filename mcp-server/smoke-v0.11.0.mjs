// v0.11.0 live smoke runner — boots server.js and exercises the 6 fixes in
// this release: untrusted-content envelope, input validator (over-long string
// + out-of-range numeric), ACP_API_URL host/scheme guard, agentUrl poisoning
// guard, and address normalization on tool args.
//
// The envelope check uses the LIVE gateway (api.acp-metabot.dev). The other
// checks are local-only — validator + gateway-URL guard never reach the
// network, and the agentUrl poisoning check uses a stub gateway.
//
// Run manually with `node smoke-v0.11.0.mjs` after publish. No npm publish
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
    clientInfo: { name: "smoke-v0.11.0", version: "1" },
  });
}

async function call(conn, name, args = {}, id = 2) {
  const t0 = Date.now();
  const r = await conn.rpc("tools/call", { name, arguments: args }, id);
  const ms = Date.now() - t0;
  return { r, ms };
}

let nextId = 100;
let passCount = 0;
let failCount = 0;

function record(label, ok, detail) {
  if (ok) {
    passCount++;
    console.log(`  PASS — ${label}${detail ? ` (${detail})` : ""}`);
  } else {
    failCount++;
    console.log(`  FAIL — ${label}${detail ? ` (${detail})` : ""}`);
  }
}

(async () => {
  // -------------------------------------------------------------------------
  // 1. Live gateway sanity — envelope present in real acp_today response
  // -------------------------------------------------------------------------
  console.log("=== v0.11.0 smoke 1/6: live gateway returns _warning envelope ===");
  {
    const child = spawnServer({ ACP_API_URL: "https://api.acp-metabot.dev" });
    const conn = new Conn(child);
    try {
      await init(conn);
      const { r, ms } = await call(conn, "acp_today", {}, nextId++);
      const text = r.result?.content?.[0]?.text || "(no text)";
      if (r.result?.isError) {
        record("envelope check", false, `gateway error (${ms}ms): ${text.slice(0, 200)}`);
      } else {
        let parsed = null;
        try { parsed = JSON.parse(text); } catch {}
        const hasWarning = parsed && typeof parsed._warning === "string" && /untrusted/i.test(parsed._warning);
        record("envelope check", hasWarning, hasWarning
          ? `_warning present (${ms}ms, ${text.length} chars)`
          : `_warning missing or wrong shape — first 200 chars: ${text.slice(0, 200)}`);
      }
    } finally { conn.close(); }
  }

  // -------------------------------------------------------------------------
  // 2. Validator rejects over-long string args
  // -------------------------------------------------------------------------
  console.log("\n=== v0.11.0 smoke 2/6: validator rejects 3000-char query ===");
  {
    const child = spawnServer({});
    const conn = new Conn(child);
    try {
      await init(conn);
      const { r } = await call(conn, "acp_find", { query: "x".repeat(3000) }, nextId++);
      const text = r.result?.content?.[0]?.text || "(no text)";
      const ok = r.result?.isError === true && /too long/i.test(text);
      record("over-long string rejected", ok, text.slice(0, 200));
    } finally { conn.close(); }
  }

  // -------------------------------------------------------------------------
  // 3. Validator clamps out-of-range numeric args
  // -------------------------------------------------------------------------
  console.log("\n=== v0.11.0 smoke 3/6: validator rejects limit: 9999 ===");
  {
    const child = spawnServer({});
    const conn = new Conn(child);
    try {
      await init(conn);
      const { r } = await call(conn, "acp_find", { query: "wallet", limit: 9999 }, nextId++);
      const text = r.result?.content?.[0]?.text || "(no text)";
      const ok = r.result?.isError === true && /out of range/i.test(text);
      record("out-of-range numeric rejected", ok, text.slice(0, 200));
    } finally { conn.close(); }
  }

  // -------------------------------------------------------------------------
  // 4. Gateway-URL guard warns + suppresses X-API-Key over plaintext
  // -------------------------------------------------------------------------
  console.log("\n=== v0.11.0 smoke 4/6: plaintext non-localhost gateway suppresses key ===");
  {
    const stderrChunks = [];
    const child = spawn(process.execPath, [SERVER], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        ACP_API_URL: "http://example.invalid",
        ACP_API_KEY: "test-key-123",
      },
    });
    child.stderr.on("data", (c) => stderrChunks.push(c.toString()));
    const conn = new Conn(child);
    try {
      await init(conn);
      // Give stderr a moment to flush the startup-time warning.
      await new Promise((r) => setTimeout(r, 100));
      const stderr = stderrChunks.join("");
      const ok = /refusing to send X-API-Key/i.test(stderr);
      record("plaintext-key warning fires", ok,
        ok ? "stderr contains the suppression warning" : `stderr did not match. First 400 chars: ${stderr.slice(0, 400)}`);
    } finally { conn.close(); }
  }

  // -------------------------------------------------------------------------
  // 5. agentUrl tightening — non-hex agentAddress drops marketplaceUrl
  // -------------------------------------------------------------------------
  console.log("\n=== v0.11.0 smoke 5/6: agentUrl poisoning guard ===");
  {
    const gw = await startStubGateway((req, res) => {
      res.setHeader("content-type", "application/json");
      if (req.url.startsWith("/v1/digest")) {
        res.end(JSON.stringify({
          results: [{ agentAddress: "javascript:alert(1)", agentName: "EvilBot" }]
        }));
        return;
      }
      res.end("{}");
    });
    const child = spawnServer({ ACP_API_URL: gw.url });
    const conn = new Conn(child);
    try {
      await init(conn);
      const { r } = await call(conn, "acp_today", {}, nextId++);
      const text = r.result?.content?.[0]?.text || "(no text)";
      const noBadUrl = !/app\.virtuals\.io\/acp\/agents\/[^"]*javascript:/i.test(text);
      let parsed = null;
      try { parsed = JSON.parse(text); } catch {}
      const records = parsed?.results || [];
      const evil = records.find((x) => x.agentName === "EvilBot");
      const noMarketplaceUrl = !!evil && evil.marketplaceUrl === undefined;
      const ok = noBadUrl && noMarketplaceUrl;
      record("poisoned agentAddress produces no marketplaceUrl", ok,
        ok ? "no javascript: URL embedded; marketplaceUrl undefined on poisoned record"
           : `noBadUrl=${noBadUrl}, noMarketplaceUrl=${noMarketplaceUrl}, first 300 chars: ${text.slice(0, 300)}`);
    } finally { conn.close(); await gw.close(); }
  }

  // -------------------------------------------------------------------------
  // 6. Address normalization rejects non-hex agentAddress at validator layer
  // -------------------------------------------------------------------------
  console.log("\n=== v0.11.0 smoke 6/6: acp_browse_agent rejects 'not-an-address' ===");
  {
    const child = spawnServer({});
    const conn = new Conn(child);
    try {
      await init(conn);
      const { r } = await call(conn, "acp_browse_agent", { agentAddress: "not-an-address" }, nextId++);
      const text = r.result?.content?.[0]?.text || "(no text)";
      const ok = r.result?.isError === true && /(address|hex)/i.test(text);
      record("malformed agentAddress rejected", ok, text.slice(0, 200));
    } finally { conn.close(); }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\n=== done — ${passCount}/${passCount + failCount} PASS ===`);
  process.exit(failCount === 0 ? 0 : 1);
})().catch((err) => {
  console.error("smoke failed:", err);
  process.exit(1);
});
