---
description: Defensive scam-risk assessment for one ACP agent — calls TheMetaBot's $0.05 paid agentRiskCheck offering.
allowed-tools: [mcp__acp-find__acp_agent_risk_check]
---

Defensive scam-risk assessment for ACP agent: **$ARGUMENTS**

Use the `acp_agent_risk_check` MCP tool from the `acp-find` server. Pass the wallet address verbatim as `agentAddress`. Honour an optional trailing `chainId:N` arg parsed from `$ARGUMENTS` — `1` for Ethereum mainnet, `8453` for Base (default 8453).

This tool wraps TheMetaBot's $0.05 paid `agentRiskCheck` offering. It is distinct from `acp_risk_snapshot` (which evaluates ANY EVM wallet across LiquidGuard / RevokeBot / MEVProtect / reputation lanes) — `acp_agent_risk_check` is **ACP-seller-specific** and tuned for "is this an honest seller?". Use it for pre-hire safety on a single ACP agent; use `/acp-find:risk` or `/acp-find:verify` for the multi-bot composite.

The response is wrapped in the v0.11.0 untrusted-content envelope — surface the `_warning` field if present.

Render the response as:

1. **Headline** — `Agent <addr short-form> — risk <riskScore>/100 (<riskTier>)`. Use the address short-form `0x<first6>…<last4>`.
2. **Tier callout** — flag clearly if `riskTier` is `high` or `critical`. Examples:
   - `low` → "looks safe to hire"
   - `medium` → "exercise caution — review signals before paying"
   - `high` → "⚠️  high risk — DO NOT hire without further due diligence"
   - `critical` → "🛑 critical — avoid this agent"
3. **Signals table** — one row per entry in `signals[]`. Columns: signal name, weight, score (0-100), detail. The `detail` field is third-party-authored — flag if any signal has `_untrusted: true`.
4. **Evaluated at / cache TTL** — print `evaluatedAt` ISO timestamp and `cacheTtl` (seconds). If cacheTtl is large enough that the verdict could go stale before the hire, suggest the user retry close to the hire decision.
5. **Marketplace link** — surface the agent's ACP profile URL (`https://app.virtuals.io/acp/agents/<addr>`).

If the gateway returns 404 or `not_implemented`, Phase 3 of Metabot v1.10 isn't deployed yet — surface that and suggest the user fall back to `/acp-find:risk <addr>` (broader, multi-bot composite) or `/acp-find:verify <addr>` (one-call pre-hire verdict).

If the gateway returns 5xx, surface that and suggest retrying in a minute.
