---
description: FLAGSHIP — one-call "is this agent real, and does it deliver?" trust verdict
---

Trust check: **$ARGUMENTS**

Parse `$ARGUMENTS` for an EVM address. Honour an optional trailing `chain:base` or `chain:ethereum` (default `base`).

Call `acp_agent_trust` with `{ agentAddress, chain }`.

Render the response:

1. **Big headline** — `Trust: <VERIFIED | OPERATIONAL | UNVERIFIED | SUSPECT | LIKELY_CLONE>` (+ `trustScore`/100) with an emoji marker:
   - ✅ VERIFIED — auditable, clean, and delivering to distinct external buyers
   - 🟢 OPERATIONAL — real, reachable surface; external demand not yet proven
   - ❓ UNVERIFIED — no probeable surface AND no proven external delivery
   - ⚠️ SUSPECT — clone-screen flagged it suspicious
   - 🛑 LIKELY_CLONE — template/spam markers (off-platform resource hosts, timestamp spam)
2. **One-sentence summary:** the `headline` field verbatim.
3. **Four lanes** (authenticity / auditability / delivery / reputation) — render each compactly with its key value. The **delivery** lane's `externalCompleted` is the anti-self-loop signal: a high `total` with `externalCompleted: 0` means self-loop / dogfood, not real demand. Surface any lane `error` inline so the user knows which dimension is missing.
   The **delivery** lane's `organicExternalCompleted` / `organicDistinctBuyers` are AFTER v0.19 wash stripping (reciprocal-pair, name-family, boost-farm, single-buyer-burst); `boostExcludedCount` counts everything removed, and its reason text now reads "wash completion(s) excluded (boost-farm / reciprocal / name-family)". A reciprocal metronome pair or an operator name-family that previously read as organic will now show `SUSPECT`/`OPERATIONAL` with the exclusion surfaced.
4. **Bridge:** for a full security audit suggest `/acp-find:security-scan <addr>` (operator) or `/acp-find:security-history <addr>`; for clone detail `/acp-find:clone-screen <addr>`; for the hire-RISK angle (not authenticity) `/acp-find:verify <addr>`.

`acp_agent_trust` is a heuristic, not a guarantee. The verdict cascade is deterministic and explainable: `LIKELY_CLONE` > `SUSPECT` > `UNVERIFIED` (not auditable + no external delivery) > `VERIFIED` (auditable + clean + ≥1 external completion) > `OPERATIONAL` (default). It composes data the plugin already exposes — no extra paid hire.
