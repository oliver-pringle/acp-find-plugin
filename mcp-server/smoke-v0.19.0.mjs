// Live smoke for acp-find v0.19.0 wash gen-3 detectors.
// Hits the REAL gateway (api.acp-metabot.dev) + official Virtuals indexer.
// Run: node smoke-v0.19.0.mjs
//
// Verifies against live RoFlo R27 census data:
//  - isReciprocalBuyer(VEGETA<-iCLONE) = reciprocal true (structural, no seed needed)
//  - isReciprocalBuyer(TheMetaBot<-Gitlawb) = reciprocal false (honest buyer preserved)
//  - clone_screen(VEGETA): organic stripped to 0
//  - clone_screen(TheMetaBot): the honest Gitlawb organic completion(s) preserved
//  - clone_screen(Taste): Tasty/taster stripped by name-affinity
//  - acp_v2_demand: rows carry washLikely + washReasons + washSummary

process.env.ACP_API_URL ??= "https://api.acp-metabot.dev";

const { dispatchTool, isReciprocalBuyer, SERVER_VERSION, namesAreAffine } =
  await import("./server.js");

const VEGETA = "0xe09f40114af6c78788a8003da127c49c56158584";
const ICLONE = "0x44cc25d55a4291b92f52062ba023ca1f14206664";
const METABOT = "0xecf9773b50f01f3a97b087a6ecdf12a71afc558c";
const GITLAWB = "0xc1b92a5c6de2aee7ad7388b49f276a71802a3ed6";
const TASTE = "0xbb29da90dd21c13fbfee68952290341b7f060dbd";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const line = (s) => console.log(s);
const safe = async (fn) => { try { return await fn(); } catch { return null; } };

line(`SERVER_VERSION = ${SERVER_VERSION}  (expect 0.19.0)`);

// Pure name-affinity sanity (no network).
line(`namesAreAffine(Taste,Tasty)=${namesAreAffine("Taste", "Tasty")}  ` +
  `(TheMetaBot,Gitlawb_Mercenary)=${namesAreAffine("TheMetaBot", "Gitlawb_Mercenary")}`);

async function clone(label, addr) {
  const r = await safe(() => dispatchTool("acp_clone_screen", { agentAddress: addr }));
  if (!r || r.error) { line(`\n[${label}] ERROR ${r?.error ?? "no result"}`); return; }
  const j = r.jobs || {};
  line(`\n[${label}] ${addr}`);
  line(`  verdict=${r.verdict} score=${r.score}`);
  line(`  organicExternalCompleted=${j.organicExternalCompleted} organicDistinctBuyers=${j.organicDistinctBuyers} ` +
    `boostExcludedCount=${j.boostExcludedCount} externalCompleted=${j.externalCompleted}`);
  line(`  signals=${(r.signals || []).map((s) => s.signal).join(", ") || "(none)"}`);
}

// --- Direct reciprocal-helper checks against the live indexer ---
const recVeg = await isReciprocalBuyer(VEGETA, ICLONE, safe);
line(`\nisReciprocalBuyer(VEGETA<-iCLONE) = ${JSON.stringify(recVeg)}  (expect reciprocal:true, share~1)`);
await sleep(1500);
const recMeta = await isReciprocalBuyer(METABOT, GITLAWB, safe);
line(`isReciprocalBuyer(TheMetaBot<-Gitlawb) = ${JSON.stringify(recMeta)}  (expect reciprocal:false)`);

await sleep(4000);
await clone("VEGETA - expect organic->0 (seed+reciprocal)", VEGETA);
await sleep(6000);
await clone("TheMetaBot - expect honest Gitlawb organic preserved", METABOT);
await sleep(6000);
await clone("Taste - expect Tasty/taster name-family stripped", TASTE);
await sleep(6000);

// --- Demand leaderboard washLikely ---
const d = await safe(() => dispatchTool("acp_v2_demand", { pages: 2, limit: 10 }));
if (d && !d.error) {
  line(`\n[acp_v2_demand] providersSeen=${d.providersSeen} washSummary=${JSON.stringify(d.washSummary)}`);
  for (const p of (d.providers || []).slice(0, 8)) {
    line(`  ${p.providerName || p.providerAddress}  completed=${p.completed} distinctClients=${p.distinctClients} ` +
      `washLikely=${p.washLikely} reasons=${(p.washReasons || []).join("|")}` +
      `${p.reciprocalPartner ? ` partner=${p.reciprocalPartner}` : ""}`);
  }
} else {
  line(`\n[acp_v2_demand] ERROR ${d?.error ?? "no result"}`);
}

line("\nsmoke done");
