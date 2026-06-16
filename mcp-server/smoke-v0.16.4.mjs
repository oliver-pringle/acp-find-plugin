// Live smoke for v0.16.4 — boots the EDITED server.js against the real gateway +
// official indexer and runs acp_agent_trust on Cybercentry (the known top-1.2%-by-
// volume / 1-distinct-buyer agent). Confirms the headline discloses buyers and the
// delivery lane carries organicDistinctBuyers. Run: node smoke-v0.16.4.mjs
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const child = spawn(process.execPath, [resolve(here, "server.js")], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, ACP_API_URL: "https://api.acp-metabot.dev" },
});

let buf = "";
const pending = new Map();
child.stdout.on("data", (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  }
});

let id = 0;
const rpc = (method, params) => new Promise((res) => {
  const myId = ++id;
  pending.set(myId, res);
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: myId, method, params }) + "\n");
});

const CYBERCENTRY = "0xfcf0b00f8352dd193a671e40940c9a32396adb49";

await rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "smoke-v0.16.4", version: "0.16.4" } });
const r = await rpc("tools/call", { name: "acp_agent_trust", arguments: { agentAddress: CYBERCENTRY } });
const text = r?.result?.content?.[0]?.text ?? JSON.stringify(r);
let obj; try { obj = JSON.parse(text); } catch { obj = text; }
console.log("VERDICT :", obj?.trustVerdict, "| SCORE:", obj?.trustScore);
console.log("HEADLINE:", obj?.headline);
console.log("DELIVERY:", JSON.stringify(obj?.lanes?.delivery));
child.kill();
process.exit(0);
