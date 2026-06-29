// acp-find edge: the plugin's server.js logic over HTTP.
//   POST /mcp            - remote MCP (Streamable HTTP, stateless, JSON responses)
//   GET  /trust/:address - the authoritative trust verdict (single source of truth)
//   GET  /health         - liveness
// Reuses ../server.js (zero-dep stdio core). The ONLY dependency here is the
// official MCP SDK, scoped to this folder and NOT published to npm.
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  dispatchTool, validateToolArgs, withSlot, fireBootBeacon, SERVER_NAME, SERVER_VERSION,
  toolsForTier, TIER,
} from "../server.js";

const PORT = Number(process.env.EDGE_PORT) || 8080;
const BODY_LIMIT = 2 * 1024 * 1024;
const EVM = /^0x[a-fA-F0-9]{40}$/;

function buildMcpServer() {
  const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, { capabilities: { tools: {} } });
  // Remote boots count once per client session (once:false), not once per
  // process - the edge is long-lived and multiplexes many clients.
  server.oninitialized = () => { try { fireBootBeacon({ transport: "http", once: false }); } catch {} };
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolsForTier(TIER) }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    try {
      const clean = validateToolArgs(req.params.name, req.params.arguments ?? {});
      const result = await withSlot(() => dispatchTool(req.params.name, clean));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: String(err?.message ?? err) }] };
    }
  });
  return server;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let len = 0;
    const chunks = [];
    req.on("data", (c) => {
      len += c.length;
      if (len > BODY_LIMIT) { req.destroy(); reject(new Error("body too large")); }
      else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res, status, obj, maxAge = 0) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": maxAge > 0 ? `public, max-age=${maxAge}` : "no-store",
  });
  res.end(JSON.stringify(obj));
}

export function createEdgeServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");

      if (req.method === "GET" && url.pathname === "/health") {
        return sendJson(res, 200, { ok: true, name: SERVER_NAME, version: SERVER_VERSION });
      }

      if (req.method === "GET" && url.pathname.startsWith("/trust/")) {
        const addr = decodeURIComponent(url.pathname.slice("/trust/".length));
        if (!EVM.test(addr)) return sendJson(res, 400, { error: "invalid address" });
        const verdict = await dispatchTool("acp_agent_trust", { agentAddress: addr });
        return sendJson(res, 200, verdict, 300);
      }

      if (url.pathname === "/mcp") {
        if (req.method !== "POST") { res.writeHead(405).end(); return; }
        const raw = await readBody(req);
        let body;
        try { body = raw ? JSON.parse(raw) : undefined; }
        catch { return sendJson(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
        const server = buildMcpServer();
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        res.on("close", () => { try { transport.close(); server.close(); } catch {} });
        await server.connect(transport);
        await transport.handleRequest(req, res, body);
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
    } catch (err) {
      if (!res.headersSent) sendJson(res, 500, { error: String(err?.message ?? err) });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createEdgeServer().listen(PORT, () => console.error(`acp-find-edge listening on :${PORT} version=${SERVER_VERSION}`));
}
