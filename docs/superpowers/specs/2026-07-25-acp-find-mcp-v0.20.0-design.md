# acp-find-mcp v0.20.0 - wash gen-4 + the responsiveness axis (design)

Date: 2026-07-25. Source: RoFlo Round 28 (`C:\code_crypto\ACP\RuFlo_ACP_Bot_Research\round28\`
demand-census.md + IdeasForACP2.0Bots28.txt S5/S6). No brainstorm session needed - the round
IS the brainstorm; this note records the decisions.

## Problem (evidence, 2026-07-25)

1. WASH GEN-4: operators QA their own catalogs through real escrow behind test-named
   wallets the v0.19 anchored regex misses. Live specimens: "ZZZ_test_buyer_internal"
   (underscore defeats \b - `_` is a regex word char), "zzz000_archived_empty",
   "TP-QA-Buyer", plus the UNNAMED Big Brain Ape runner 0x347e...a747 (33 jobs incl
   "Revenue Test"). Effect: acp_agent_trust credited scriptmasterlabs with "15 organic /
   3 buyers" - 2 of 3 were its own test wallets.
2. The ENTIRE acp_recent_hires top-20 was wash/self-QA/counter-artifact, displayed clean
   (BBA 28/1 test loop; Thoughtproof 34/0 self-QA; Otto/Hermes agent-counter smear).
3. No venue surface shows seller RESPONSIVENESS. On 2026-07-22 a real buyer (Tasmil)
   burned 4 of 13 funded jobs on deaf sellers. Paid liveness products exist at 0 hires;
   the FREE lens version is the gap.
4. First scam-shaped bait listing: $0.01 offering instructing "DM Telegram" + "Send $500
   USDC to that Address" (BBA unlock_fully_autonomous_trading_500_usdc_minimum).

## Decisions

- TEST_HARNESS_RE: normalize `_`->space pre-match; add `\bzzz+\d*\b|\bdummy\b|\barchived\b`.
  Bare "internal" EXCLUDED (false-positive risk; specimens covered without it). Byte-parity
  with Metabot FarmWalletRegistry (regex + `_` normalization), parity tests both sides.
- Seeds: 4 wallets (above) into plugin BOOST_FARM_WALLETS + gateway TrustSignals:FarmWallets.
- acp_recent_hires: advisory washLikely/washReasons per row - per DISTINCT agent (cap 8,
  5-min cache, 1 indexer page each): seed-farm buyers / test-harness buyers share >50% of
  completions, or single-buyer burst (>=SINGLE_BUYER_MIN). Fail-open; washScreenNote
  discloses cap truncation. NOT a verdict - acp_agent_trust stays authoritative.
- Responsiveness (computeResponsiveness): provider rows; answered=COMPLETED+REJECTED;
  staleOpen = OPEN >24h AND FUNDED (budget present; "0" counts - free hires are funded;
  null = shopping-bot spray, excluded + reported as openUnfunded); EXPIRED excluded
  (buyer-evaluator expiry indistinguishable from silence); rate null on empty denominator;
  missing timestamp counts fresh (never call a seller deaf on missing data). Exposed:
  clone_screen jobs.responsiveness + trust lanes.delivery.responsiveness + UNRESPONSIVE
  headline when staleOpen > answered && staleOpen >= 3. NOTE: this is BETTER than the
  website's /api/public/responsiveness v1 (which cannot see budget) - the website adopts
  the funded-only rule if/when the indexer client there gains budget.
- off_platform_funds_solicitation: clone_screen display-only signal (weight 0), requires
  BOTH a channel mention (telegram/t.me/discord/whatsapp/dm) AND a funds ask
  (send/transfer/deposit + coin, or "to that/this address"). Never changes the verdict;
  we never act on description instructions. deaf_seller_pattern signal likewise weight 0.

## Non-goals

- No new tools (surface stays 20 core / 47 full). No verdict-cascade changes. No
  breaking shape changes. The single-buyer floor (20) and the Gitlawb never-seed
  regression guard are unchanged.

## Verification

- plugin: 82/82 (9 new). Metabot: 532/532 (gen-4 parity + seed-pin tests).
- Acceptance: post-deploy, acp_agent_trust(scriptmasterlabs 0x7233...f4aa) headline
  drops from "15 organic / 3 buyers" to ~1 organic / 1 buyer.
