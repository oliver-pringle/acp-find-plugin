#!/usr/bin/env node
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
//   ACP_VERBOSE  — set to any truthy value to log every gateway request /
//                  response to stderr. Same as passing --verbose on argv.

import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf-8"));

const API_URL = (process.env.ACP_API_URL || "https://api.acp-metabot.dev").replace(/\/$/, "");
const API_KEY = process.env.ACP_API_KEY;
const VERBOSE = !!process.env.ACP_VERBOSE || process.argv.includes("--verbose");
const SERVER_NAME = "acp-find";
const SERVER_VERSION = pkg.version;
const PROTOCOL_VERSION = "2025-11-25";
const MARKETPLACE_URL_BASE = "https://app.virtuals.io/acp/agents";
const CACHE_TTL_MS = 5 * 60 * 1000;
const RETRY_BACKOFF_MS = 200;
const REQUEST_TIMEOUT_MS = 30000;

// --- helpers ---------------------------------------------------------------

// Walk Error.cause chain so a "fetch failed" surfaces its real DNS/connect/TLS
// reason (Node wraps undici errors in a generic TypeError).
function formatError(err) {
  if (!err) return "Unknown error";
  let msg = err.message || String(err);
  let cause = err.cause;
  while (cause) {
    msg += ` → ${cause.message || cause.code || String(cause)}`;
    cause = cause.cause;
  }
  return msg;
}

function logErr(...args) {
  process.stderr.write(`[acp-find] ${args.join(" ")}\n`);
}
function logVerbose(...args) {
  if (!VERBOSE) return;
  const s = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
  process.stderr.write(`[acp-find:verbose] ${s}\n`);
}

// Categories almost never change; health is cheap but high-frequency in
// conversational sessions. A 5-min in-memory cache cuts gateway load without
// noticeable staleness.
const cache = new Map();
function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return undefined;
  if (Date.now() - e.t > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return e.v;
}
function cachePut(key, v) {
  cache.set(key, { t: Date.now(), v });
}

function agentUrl(addr) {
  if (!addr || typeof addr !== "string") return undefined;
  return `${MARKETPLACE_URL_BASE}/${addr}`;
}

// Walk a JSON tree and add `marketplaceUrl` to every object that has an
// `agentAddress` and doesn't already carry one. Lets the gateway stay agnostic
// of frontend conventions while every result still gets a hire link.
function decorateMarketplaceUrls(obj) {
  if (Array.isArray(obj)) {
    for (const x of obj) decorateMarketplaceUrls(x);
    return;
  }
  if (obj && typeof obj === "object") {
    if (typeof obj.agentAddress === "string" && !obj.marketplaceUrl) {
      obj.marketplaceUrl = agentUrl(obj.agentAddress);
    }
    for (const k of Object.keys(obj)) decorateMarketplaceUrls(obj[k]);
  }
}

// Bucket the top result's score into a confidence label so callers can render
// a graded callout instead of the binary bestMatch flag.
function addConfidence(result) {
  if (!result || !Array.isArray(result.results)) return;
  if (result.results.length === 0) {
    result.confidence = "none";
    return;
  }
  const top = Number(result.results[0]?.score ?? 0);
  result.confidence =
    top >= 0.7 ? "high" :
    top >= 0.5 ? "medium" :
    top >= 0.35 ? "low" : "sketchy";
}

// Returns "v1", "v2", or undefined ("search both"). Anything else silently
// drops to undefined; the gateway's 400 handler catches stray values.
function normalizeMarketplace(raw) {
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim().toLowerCase();
  return (s === "v1" || s === "v2") ? s : undefined;
}

function isHexAddress(s) {
  return typeof s === "string" && /^0x[0-9a-fA-F]{40}$/.test(s.trim());
}

// --- transport -------------------------------------------------------------

// One retry on transient 5xx or network errors; never retries on 4xx (client
// fault — retrying just doubles the rate-limit hit). 200ms backoff is enough
// to skip a single in-flight glitch without making the user wait.
async function fetchWithRetry(url, init) {
  try {
    const res = await fetch(url, init);
    if (res.status >= 500 && res.status < 600) {
      logVerbose(`${res.status} on ${url}; retrying once after ${RETRY_BACKOFF_MS}ms`);
      await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS));
      return fetch(url, init);
    }
    return res;
  } catch (err) {
    logVerbose(`network error on ${url}: ${err.message}; retrying once after ${RETRY_BACKOFF_MS}ms`);
    await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS));
    return fetch(url, init);
  }
}

async function callGateway(path, body, method = "POST") {
  const headers = { "User-Agent": `acp-find-plugin/${SERVER_VERSION}` };
  if (API_KEY) headers["X-API-Key"] = API_KEY;

  const init = { method, headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) };
  if (method !== "GET" && body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const startedAt = Date.now();
  logVerbose(`→ ${method} ${path}`);
  const res = await fetchWithRetry(`${API_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} returned ${res.status} ${res.statusText}: ${text || "(empty body)"}`);
  }
  const json = await res.json();
  logVerbose(`← ${method} ${path} ${res.status} (${Date.now() - startedAt}ms)`);
  return json;
}

// --- tool definitions ------------------------------------------------------

const TOOLS = [
  {
    name: "acp_find",
    description:
      "Semantic search across every offering in the Virtuals Protocol ACP marketplace. Returns ranked agents with similarity scores, prices, descriptions, a `marketplaceVersion` (`v1` | `v2`), a `marketplaceUrl` for one-click hire, and a reputation block. Searches V1 + V2 marketplaces in one call by default. Uses hybrid BM25 + dense fusion so rare-keyword queries (contract addresses, tickers, niche jargon) work alongside semantic ones. Returns a `confidence` bucket (high|medium|low|sketchy|none) derived from the top score. Optional filters: priceMaxUsdc, chain, minReputation, freshness/includeStale, category, marketplace, offset (pagination). Use for 'is there an agent that can do X' questions.",
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
        offset: {
          type: "number",
          description: "Skip the first N results before applying limit. Use to paginate beyond the top 50; 0 ≤ offset ≤ 1000.",
          minimum: 0,
          maximum: 1000
        },
        priceMaxUsdc: {
          type: "number",
          description: "Optional. Cap result prices to this max USDC value."
        },
        includeStale: {
          type: "boolean",
          description: "Set true to include offerings that have never been hired or whose hire count hasn't grown in 90 days. Default false (filter on). Superseded by `freshness` when both are passed."
        },
        category: {
          type: "string",
          description: "Optional. Restrict results to a single canonical category (case-insensitive). Use acp_categories to list valid names — e.g. 'DEX Swap', 'Wallet Intelligence', 'Token Risk Detection'."
        },
        chain: {
          type: "array",
          items: { type: "string" },
          description: "Optional. Restrict results to one or more chain ids (e.g. [\"base\",\"base-sepolia\"]). Case-insensitive; up to 8 entries."
        },
        minReputation: {
          type: "number",
          description: "Optional. Filter to agents whose cached on-chain reputation score is at least this value (0-100). Agents not yet evaluated pass through (unindexed != bad).",
          minimum: 0,
          maximum: 100
        },
        freshness: {
          type: "number",
          description: "Optional. Keep only offerings whose hire count has grown within the last N days (1-365). Cleaner numeric alternative to includeStale.",
          minimum: 1,
          maximum: 365
        },
        marketplace: {
          type: "string",
          enum: ["v1", "v2"],
          description: "Optional. Restrict results to one ACP marketplace. Default = both V1 and V2 (recommended; V2 is the new generation of agents). Pass 'v1' to search only the legacy V1 corpus, or 'v2' to search only V2 agents."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "acp_compose_stack",
    description:
      "LLM-curated multi-agent ACP stack for a stated use case. Returns an ordered list of offerings (each tagged with `marketplaceVersion` and `marketplaceUrl`) plus a rationale describing how they compose. Searches V1 + V2 marketplaces by default. Use for multi-step workflows.",
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
        },
        chain: {
          type: "array",
          items: { type: "string" },
          description: "Optional. Restrict candidates to one or more chain ids (e.g. [\"base\"]). Up to 8 entries."
        },
        marketplace: {
          type: "string",
          enum: ["v1", "v2"],
          description: "Optional. Restrict candidates to one ACP marketplace. Default = both. Pass 'v2' for stacks that should only use V2 agents."
        }
      },
      required: ["useCase"]
    }
  },
  {
    name: "acp_agent_reputation",
    description:
      "Look up the cached on-chain behavioural reputation for an ACP agent (0-100 score from completion rate, dispute rate, recency, 30-day throughput, and average response time). Returns the latest score plus a 30-day daily trajectory so you can see whether the agent is improving or declining. Returns 404 if the agent has not yet been evaluated; in that case, hire the agentReputation offering on the marketplace to force a live computation. Response includes a `marketplaceUrl` for one-click profile.",
    inputSchema: {
      type: "object",
      properties: {
        agentAddress: {
          type: "string",
          description: "EVM wallet address of the agent (0x-prefixed). Lower- or mixed-case is fine."
        }
      },
      required: ["agentAddress"]
    }
  },
  {
    name: "acp_agent_reputation_history",
    description:
      "Day-by-day on-chain reputation trajectory for an ACP agent (up to 90 days). Each row is a UTC date plus that day's agentScore and per-sub-score breakdown. Use to spot improving or declining agents over time, or after acp_agent_reputation when the user wants the full longer-term trend rather than the inline 30-day snapshot.",
    inputSchema: {
      type: "object",
      properties: {
        agentAddress: {
          type: "string",
          description: "EVM wallet address of the agent (0x-prefixed). Lower- or mixed-case is fine."
        },
        days: {
          type: "number",
          description: "Lookback window in days (1-90). Default 30.",
          minimum: 1,
          maximum: 90
        }
      },
      required: ["agentAddress"]
    }
  },
  {
    name: "acp_today",
    description:
      "Daily digest of the ACP marketplace. Returns offerings launched in the last N days plus the biggest hire-count gainers (when comparison data is available). Each result is tagged with `marketplaceVersion` and `marketplaceUrl`. Spans both marketplaces by default. Optional filters: chain, priceMaxUsdc, marketplace. Use for 'what's new on ACP', 'show me what just launched', 'what's trending'.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Lookback window in days (1-30). Default 1 (last 24h).",
          minimum: 1,
          maximum: 30
        },
        priceMaxUsdc: {
          type: "number",
          description: "Optional. Cap result prices to this max USDC value."
        },
        chain: {
          type: "array",
          items: { type: "string" },
          description: "Optional. Restrict results to one or more chain ids (e.g. [\"base\",\"base-sepolia\"]). Up to 8 entries."
        },
        marketplace: {
          type: "string",
          enum: ["v1", "v2"],
          description: "Optional. Restrict the digest to one ACP marketplace. Default = both."
        }
      }
    }
  },
  {
    name: "acp_browse_agent",
    description:
      "Full profile for an ACP agent by wallet address. Returns the agent's reputation summary plus every offering they own with full descriptions, requirement schemas, prices, per-offering reputation, and a `marketplaceUrl`. Use when the user pastes a wallet address and asks 'what does this agent do', or after acp_find when the user wants the full picture of a specific agent.",
    inputSchema: {
      type: "object",
      properties: {
        agentAddress: {
          type: "string",
          description: "EVM wallet address of the agent (0x-prefixed). Lower- or mixed-case is fine."
        }
      },
      required: ["agentAddress"]
    }
  },
  {
    name: "acp_offering",
    description:
      "Deep-dive on a single offering by (agentAddress, offeringName). Returns just that offering's full description, requirement schema, price, lifetime hires, and per-offering reputation, plus a `marketplaceUrl`. Use when the user has narrowed in on one offering and wants to see exactly what it accepts as input before they hire. Faster than parsing the full agent profile when only one offering matters.",
    inputSchema: {
      type: "object",
      properties: {
        agentAddress: {
          type: "string",
          description: "EVM wallet address of the agent (0x-prefixed)."
        },
        offeringName: {
          type: "string",
          description: "Exact offering name as registered on the marketplace. Matched case-insensitively."
        }
      },
      required: ["agentAddress", "offeringName"]
    }
  },
  {
    name: "acp_compare_agents",
    description:
      "Side-by-side comparison of 2-5 agents by wallet address. For each agent: lifetime offerings count, summary reputation (jobs / score / percentile), and behavioural reputation (completion / dispute / recency / volume30d / responseTime sub-scores) when cached. Use after acp_find when the user has shortlisted candidates and wants a structured comparison before hiring.",
    inputSchema: {
      type: "object",
      properties: {
        agentAddresses: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 5,
          description: "EVM wallet addresses (0x-prefixed) — between 2 and 5."
        }
      },
      required: ["agentAddresses"]
    }
  },
  {
    name: "acp_watch_status",
    description:
      "Read the current state of a marketplace watch by id. Watches are registered by hiring TheMetaBot's `watch` offering and fire a webhook on new matches for a saved query. This tool is read-only — it returns whether the watch is alive, when it expires, how many alerts have fired, and the watch's query and filters. Sensitive fields (buyer address, webhook URL) are not returned.",
    inputSchema: {
      type: "object",
      properties: {
        watchId: {
          type: "string",
          description: "Opaque watch id returned at registration time."
        }
      },
      required: ["watchId"]
    }
  },
  {
    name: "acp_recent_hires",
    description:
      "Top offerings by absolute hire-count growth in the last N days. Different from acp_today (which mixes new launches and gainers); this surface is purely 'what's getting hired right now' so users can see traction concentrating. Tagged with `marketplaceVersion` and `marketplaceUrl`.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Lookback window in days (1-30). Default 7.",
          minimum: 1,
          maximum: 30
        },
        limit: {
          type: "number",
          description: "Max results to return (1-50). Default 10.",
          minimum: 1,
          maximum: 50
        },
        priceMaxUsdc: {
          type: "number",
          description: "Optional. Cap result prices to this max USDC value."
        },
        category: {
          type: "string",
          description: "Optional. Restrict to a single canonical category."
        },
        chain: {
          type: "array",
          items: { type: "string" },
          description: "Optional. Restrict to one or more chain ids."
        },
        marketplace: {
          type: "string",
          enum: ["v1", "v2"],
          description: "Optional. Restrict to one ACP marketplace. Default = both."
        }
      }
    }
  },
  {
    name: "acp_agent_recent_jobs",
    description:
      "Recent on-chain job ledger for one agent: per-job (jobId, status, counterparty, amount, createdAt). Built from the chain-event scanner. Use when a user wants to see whether an agent is actually being hired and what the recent traffic looks like, before committing to a job themselves.",
    inputSchema: {
      type: "object",
      properties: {
        agentAddress: {
          type: "string",
          description: "EVM wallet address of the agent (0x-prefixed)."
        },
        days: {
          type: "number",
          description: "Lookback window in days (1-90). Default 30.",
          minimum: 1,
          maximum: 90
        },
        limit: {
          type: "number",
          description: "Max jobs to return (1-100). Default 25.",
          minimum: 1,
          maximum: 100
        }
      },
      required: ["agentAddress"]
    }
  },
  {
    name: "acp_search_agents",
    description:
      "Search for AGENTS (not offerings) by query against agent name + bio + total offerings. Distinct from acp_find which searches the offering corpus. Use when the user wants to discover providers by what THEY do across all their offerings, rather than picking one specific service.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural-language query against agent name and aggregated offering descriptions."
        },
        limit: {
          type: "number",
          description: "Max agents to return (1-50). Default 5.",
          minimum: 1,
          maximum: 50
        },
        marketplace: {
          type: "string",
          enum: ["v1", "v2"],
          description: "Optional. Restrict to one ACP marketplace. Default = both."
        }
      },
      required: ["query"]
    }
  },
  {
    name: "acp_categories",
    description:
      "Returns the canonical list of marketplace categories used by acp_find's classification (e.g. 'DEX Swap', 'Wallet Intelligence', 'Token Risk Detection'), each with an `offeringCount` showing how dense that category is on the marketplace. Use this when the user asks 'what kinds of agents are available' or when they want to browse the marketplace by topic rather than by query.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "acp_health",
    description:
      "Diagnostic check on the public ACP_Metabot gateway. Returns gateway URL, server version, plugin version, MCP protocol version, indexed-corpus size (with V1 vs V2 split), last indexer fetch time, category-classifier readiness, and round-trip ping in ms. Use when search/stack tools return errors, when the user asks 'is acp-find working?', or to confirm the gateway is reachable before a long session.",
    inputSchema: { type: "object", properties: {} }
  }
];

// --- tool handlers ---------------------------------------------------------

const HANDLERS = {
  acp_find: async (args) => {
    if (!args?.query) throw new Error("query is required");
    const offset = typeof args.offset === "number" && args.offset > 0 ? args.offset : undefined;
    const result = await callGateway("/v1/search", {
      query: args.query,
      limit: args.limit ?? 5,
      offset,
      priceMaxUsdc: args.priceMaxUsdc,
      staleAfterDays: args.includeStale ? 0 : 90,
      category: args.category,
      chain: Array.isArray(args.chain) ? args.chain : undefined,
      minReputation: typeof args.minReputation === "number" ? args.minReputation : undefined,
      freshness: typeof args.freshness === "number" ? args.freshness : undefined,
      marketplace: normalizeMarketplace(args.marketplace)
    });
    decorateMarketplaceUrls(result);
    addConfidence(result);
    return result;
  },

  acp_compose_stack: async (args) => {
    if (!args?.useCase) throw new Error("useCase is required");
    const result = await callGateway("/v1/composeStack", {
      useCase: args.useCase,
      budgetUsdc: args.budgetUsdc,
      maxOfferings: args.maxOfferings ?? 5,
      chain: Array.isArray(args.chain) ? args.chain : undefined,
      marketplace: normalizeMarketplace(args.marketplace)
    });
    decorateMarketplaceUrls(result);
    return result;
  },

  acp_agent_reputation: async (args) => {
    if (!args?.agentAddress) throw new Error("agentAddress is required");
    const addr = String(args.agentAddress).trim().toLowerCase();
    const url = `${API_URL}/v1/agentReputation?agent=${encodeURIComponent(addr)}`;
    const headers = { "User-Agent": `acp-find-plugin/${SERVER_VERSION}` };
    if (API_KEY) headers["X-API-Key"] = API_KEY;
    const startedAt = Date.now();
    logVerbose(`→ GET /v1/agentReputation?agent=${addr}`);
    const res = await fetchWithRetry(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    logVerbose(`← GET /v1/agentReputation ${res.status} (${Date.now() - startedAt}ms)`);
    if (res.status === 404) {
      const body = await res.json().catch(() => ({}));
      return {
        error: body.error ?? "not_cached",
        hint:  body.hint  ?? "Hire the agentReputation offering on the ACP marketplace to force a live computation.",
        marketplaceUrl: agentUrl(addr)
      };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`/v1/agentReputation returned ${res.status} ${res.statusText}: ${text || "(empty body)"}`);
    }
    const json = await res.json();
    json.marketplaceUrl = agentUrl(addr);
    return json;
  },

  acp_agent_reputation_history: async (args) => {
    if (!args?.agentAddress) throw new Error("agentAddress is required");
    const addr = String(args.agentAddress).trim().toLowerCase();
    const days = typeof args.days === "number" ? args.days : 30;
    const result = await callGateway(
      `/v1/agentReputationHistory?agent=${encodeURIComponent(addr)}&days=${encodeURIComponent(days)}`,
      undefined,
      "GET"
    );
    if (result && typeof result === "object") result.marketplaceUrl = agentUrl(addr);
    return result;
  },

  acp_today: async (args) => {
    const days = typeof args?.days === "number" ? args.days : 1;
    const params = new URLSearchParams();
    params.set("days", String(days));
    const mp = normalizeMarketplace(args?.marketplace);
    if (mp) params.set("marketplace", mp);
    if (Array.isArray(args?.chain)) {
      for (const c of args.chain) {
        if (typeof c === "string" && c.trim()) params.append("chain", c.trim());
      }
    }
    if (typeof args?.priceMaxUsdc === "number") {
      params.set("priceMaxUsdc", String(args.priceMaxUsdc));
    }
    const result = await callGateway(`/v1/digest?${params.toString()}`, undefined, "GET");
    decorateMarketplaceUrls(result);
    return result;
  },

  acp_browse_agent: async (args) => {
    if (!args?.agentAddress) throw new Error("agentAddress is required");
    const result = await callGateway(`/v1/agent/${encodeURIComponent(args.agentAddress)}`, undefined, "GET");
    decorateMarketplaceUrls(result);
    return result;
  },

  acp_offering: async (args) => {
    if (!args?.agentAddress) throw new Error("agentAddress is required");
    if (!args?.offeringName) throw new Error("offeringName is required");
    if (!isHexAddress(args.agentAddress)) throw new Error("agentAddress must be 0x followed by 40 hex chars");
    const profile = await callGateway(
      `/v1/agent/${encodeURIComponent(args.agentAddress)}`, undefined, "GET");
    const wanted = String(args.offeringName).trim().toLowerCase();
    const offerings = Array.isArray(profile?.offerings) ? profile.offerings : [];
    const offering = offerings.find(o =>
      String(o?.offeringName ?? "").trim().toLowerCase() === wanted);
    if (!offering) {
      return {
        error: "offering_not_found",
        agentAddress: profile?.agentAddress,
        agentName: profile?.agentName,
        availableOfferings: offerings.map(o => o?.offeringName).filter(Boolean),
        marketplaceUrl: agentUrl(profile?.agentAddress)
      };
    }
    return {
      agentAddress: profile?.agentAddress,
      agentName: profile?.agentName,
      agentReputation: profile?.reputation,
      offering,
      marketplaceUrl: agentUrl(profile?.agentAddress)
    };
  },

  acp_compare_agents: async (args) => {
    const list = Array.isArray(args?.agentAddresses) ? args.agentAddresses : [];
    if (list.length < 2) throw new Error("agentAddresses must contain at least 2 wallets");
    if (list.length > 5) throw new Error("agentAddresses must contain at most 5 wallets");
    for (const a of list) {
      if (!isHexAddress(a)) throw new Error(`invalid wallet address: ${a}`);
    }
    const addrs = list.map(a => String(a).trim().toLowerCase());

    const agents = await Promise.all(addrs.map(async (addr) => {
      let profile = null;
      let profileError = null;
      try {
        profile = await callGateway(
          `/v1/agent/${encodeURIComponent(addr)}`, undefined, "GET");
      } catch (err) {
        profileError = formatError(err);
      }

      let behaviouralReputation = null;
      try {
        const url = `${API_URL}/v1/agentReputation?agent=${encodeURIComponent(addr)}`;
        const headers = { "User-Agent": `acp-find-plugin/${SERVER_VERSION}` };
        if (API_KEY) headers["X-API-Key"] = API_KEY;
        const res = await fetchWithRetry(url, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });
        if (res.status === 404) {
          const body = await res.json().catch(() => ({}));
          behaviouralReputation = { error: body.error ?? "not_cached" };
        } else if (res.ok) {
          behaviouralReputation = await res.json();
        } else {
          behaviouralReputation = { error: `${res.status} ${res.statusText}` };
        }
      } catch (err) {
        behaviouralReputation = { error: formatError(err) };
      }

      return {
        agentAddress: addr,
        agentName: profile?.agentName ?? null,
        totalOfferings: Array.isArray(profile?.offerings) ? profile.offerings.length : null,
        summaryReputation: profile?.reputation ?? null,
        behaviouralReputation,
        marketplaceUrl: agentUrl(addr),
        profileError
      };
    }));

    return { count: agents.length, agents };
  },

  acp_watch_status: async (args) => {
    if (!args?.watchId) throw new Error("watchId is required");
    const id = String(args.watchId).trim();
    return callGateway(`/v1/watches/${encodeURIComponent(id)}`, undefined, "GET");
  },

  acp_recent_hires: async (args) => {
    const params = new URLSearchParams();
    params.set("days", String(typeof args?.days === "number" ? args.days : 7));
    params.set("limit", String(typeof args?.limit === "number" ? args.limit : 10));
    if (typeof args?.priceMaxUsdc === "number") params.set("priceMaxUsdc", String(args.priceMaxUsdc));
    if (args?.category) params.set("category", String(args.category));
    if (Array.isArray(args?.chain)) {
      for (const c of args.chain) if (typeof c === "string" && c.trim()) params.append("chain", c.trim());
    }
    const mp = normalizeMarketplace(args?.marketplace);
    if (mp) params.set("marketplace", mp);
    const result = await callGateway(`/v1/recentHires?${params.toString()}`, undefined, "GET");
    decorateMarketplaceUrls(result);
    return result;
  },

  acp_agent_recent_jobs: async (args) => {
    if (!args?.agentAddress) throw new Error("agentAddress is required");
    if (!isHexAddress(args.agentAddress)) throw new Error("agentAddress must be 0x followed by 40 hex chars");
    const addr = String(args.agentAddress).trim().toLowerCase();
    const params = new URLSearchParams();
    params.set("agent", addr);
    params.set("days", String(typeof args.days === "number" ? args.days : 30));
    params.set("limit", String(typeof args.limit === "number" ? args.limit : 25));
    const result = await callGateway(`/v1/agentRecentJobs?${params.toString()}`, undefined, "GET");
    if (result && typeof result === "object") result.marketplaceUrl = agentUrl(addr);
    return result;
  },

  acp_search_agents: async (args) => {
    if (!args?.query) throw new Error("query is required");
    const result = await callGateway("/v1/searchAgents", {
      query: args.query,
      limit: args.limit ?? 5,
      marketplace: normalizeMarketplace(args.marketplace)
    });
    decorateMarketplaceUrls(result);
    return result;
  },

  acp_categories: async () => {
    const cached = cacheGet("categories");
    if (cached) {
      logVerbose("cache hit: categories");
      return cached;
    }
    const result = await callGateway("/v1/categories", undefined, "GET");
    cachePut("categories", result);
    return result;
  },

  acp_health: async () => {
    const cached = cacheGet("health");
    if (cached) {
      logVerbose("cache hit: health");
      return { ...cached, plugin: { ...cached.plugin, fromCache: true } };
    }
    const startedAt = Date.now();
    const body = await callGateway("/v1/health", undefined, "GET");
    const decorated = {
      ...body,
      plugin: {
        version: SERVER_VERSION,
        gatewayUrl: API_URL,
        protocolVersion: PROTOCOL_VERSION,
        verbose: VERBOSE,
        pingMs: Date.now() - startedAt
      }
    };
    cachePut("health", decorated);
    return decorated;
  }
};

async function dispatchTool(name, args) {
  const handler = HANDLERS[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(args ?? {});
}

// --- MCP request loop ------------------------------------------------------

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
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
            content: [{ type: "text", text: formatError(err) }]
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
    logErr("parse error:", formatError(err));
    return;
  }
  const p = Promise.resolve(handleRequest(req))
    .catch((err) => logErr("handler error:", formatError(err)))
    .finally(() => inflight.delete(p));
  inflight.add(p);
});

rl.on("close", async () => {
  // Drain in-flight requests before exiting so async tool calls can finish.
  if (inflight.size > 0) await Promise.allSettled([...inflight]);
  process.exit(0);
});

logErr(`MCP server ready — gateway=${API_URL} version=${SERVER_VERSION} verbose=${VERBOSE ? "on" : "off"}`);
