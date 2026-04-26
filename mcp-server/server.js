// MCP server for the acp-find plugin.
//
// Implements the Model Context Protocol over stdio with no npm dependencies —
// just Node 22's built-in `fetch`, `readline`, and JSON. Calls the public
// ACP_Metabot gateway and returns ranked search results / curated stacks.
//
// Env:
//   ACP_API_URL  — base URL of the gateway (default: https://api.acp-metabot.dev)
//   ACP_API_KEY  — optional; sent as X-API-Key. Only needed for local dev
//                  against the private docker-compose API.

import { createInterface } from "node:readline";

const API_URL = (process.env.ACP_API_URL || "https://api.acp-metabot.dev").replace(/\/$/, "");
const API_KEY = process.env.ACP_API_KEY;
const SERVER_NAME = "acp-find";
const SERVER_VERSION = "0.1.0";
const PROTOCOL_VERSION = "2024-11-05";

const TOOLS = [
  {
    name: "acp_find",
    description:
      "Semantic search across every offering in the Virtuals Protocol ACP marketplace. Returns ranked agents with similarity scores, prices, and descriptions. Use for 'is there an agent that can do X' questions.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Natural-language description of the capability you're looking for. e.g. 'close a perp position on Hyperliquid' or 'wallet intelligence and risk scoring'."
        },
        limit: {
          type: "number",
          description: "Max results to return (1-50). Default 5.",
          minimum: 1,
          maximum: 50
        },
        priceMaxUsdc: {
          type: "number",
          description: "Optional. Cap result prices to this max USDC value."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "acp_compose_stack",
    description:
      "LLM-curated multi-agent ACP stack for a stated use case. Returns an ordered list of offerings with a rationale describing how they compose. Use for multi-step workflows.",
    inputSchema: {
      type: "object",
      properties: {
        useCase: {
          type: "string",
          description: "Plain-language description of what the user wants to achieve end-to-end."
        },
        budgetUsdc: {
          type: "number",
          description: "Optional cap on total USDC cost across the stack."
        },
        maxOfferings: {
          type: "number",
          description: "Max offerings to include in the stack (1-10). Default 5.",
          minimum: 1,
          maximum: 10
        }
      },
      required: ["useCase"]
    }
  }
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function logErr(...args) {
  process.stderr.write(`[acp-find] ${args.join(" ")}\n`);
}

async function callGateway(path, body) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": `acp-find-plugin/${SERVER_VERSION}`
  };
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} returned ${res.status} ${res.statusText}: ${text || "(empty body)"}`);
  }
  return res.json();
}

async function dispatchTool(name, args) {
  if (name === "acp_find") {
    if (!args?.query) throw new Error("query is required");
    return callGateway("/v1/search", {
      query: args.query,
      limit: args.limit ?? 5,
      priceMaxUsdc: args.priceMaxUsdc
    });
  }
  if (name === "acp_compose_stack") {
    if (!args?.useCase) throw new Error("useCase is required");
    return callGateway("/v1/composeStack", {
      useCase: args.useCase,
      budgetUsdc: args.budgetUsdc,
      maxOfferings: args.maxOfferings ?? 5
    });
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handleRequest(req) {
  const { id, method, params } = req;

  switch (method) {
    case "initialize":
      return send({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION }
        }
      });

    case "notifications/initialized":
    case "notifications/cancelled":
      return; // notifications get no response

    case "tools/list":
      return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });

    case "tools/call": {
      try {
        const result = await dispatchTool(params?.name, params?.arguments);
        return send({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
          }
        });
      } catch (err) {
        return send({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [{ type: "text", text: err?.message || String(err) }]
          }
        });
      }
    }

    case "ping":
      return send({ jsonrpc: "2.0", id, result: {} });

    default:
      if (id != null) {
        return send({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
      }
      return; // notifications with unknown method — ignore
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
const inflight = new Set();

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try {
    req = JSON.parse(trimmed);
  } catch (err) {
    logErr("parse error:", err.message);
    return;
  }
  const p = Promise.resolve(handleRequest(req))
    .catch((err) => logErr("handler error:", err.message))
    .finally(() => inflight.delete(p));
  inflight.add(p);
});

rl.on("close", async () => {
  // Drain in-flight requests before exiting so async tool calls can finish.
  if (inflight.size > 0) await Promise.allSettled([...inflight]);
  process.exit(0);
});

logErr(`MCP server ready — gateway=${API_URL}`);
