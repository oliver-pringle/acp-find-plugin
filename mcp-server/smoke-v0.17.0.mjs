// Live smoke for v0.17.0: prove remote MCP works AND the three trust surfaces agree
// (single source of truth). Run: node smoke-v0.17.0.mjs
const EDGE = process.env.EDGE_URL || "https://api.acp-metabot.dev";
const SITE = process.env.SITE_URL || "https://acp-metabot.dev";
const ADDR = process.env.ADDR || "0xecf9773b50f01f3a97b087a6ecdf12a71afc558c"; // Metabot

let ok = true;

const edge = await (await fetch(`${EDGE}/trust/${ADDR}`)).json();
const site = await (await fetch(`${SITE}/api/public/trust/${ADDR}`)).json();
console.log("edge.trustVerdict =", edge.trustVerdict, "| site.verdict =", site.verdict);
if (!edge.trustVerdict || edge.trustVerdict !== site.verdict) { console.error("FAIL: edge verdict != site verdict"); ok = false; }

const init = await fetch(`${EDGE}/mcp`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "0" } } }),
});
const initJson = await init.json();
console.log("mcp initialize serverInfo.name =", initJson.result?.serverInfo?.name);
if (initJson.result?.serverInfo?.name !== "acp-find") { console.error("FAIL: remote MCP initialize"); ok = false; }

const badge = await fetch(`${SITE}/api/public/badges/by-address/${ADDR}/trust.svg`);
console.log("by-address badge =", badge.status, badge.headers.get("content-type"));
if (badge.status !== 200) { console.error("FAIL: by-address badge"); ok = false; }

if (!ok) process.exit(1);
console.log("OK - remote MCP + single source of truth + by-address badge all live");
