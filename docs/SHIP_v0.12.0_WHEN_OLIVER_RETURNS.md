# Ship v0.12.0 — when Oliver returns

`acp-find-mcp` and the `acp-find` Claude Code plugin v0.12.0 are **locally committed** on `main` but **NOT pushed** and **NOT published to npm**. Reason: WebAuthn for `npm publish` requires a real Windows PowerShell terminal (see `acp-find-mcp-bump` skill + `feedback_acp_docs_in_lockstep` memory), and Oliver is away from the computer.

## Local state at the time of writing

- Repo: `C:\code_crypto\ACP\acp-find-plugin\`, branch `main`.
- 6 commits ahead of `origin/main`:
  1. `feat(acp_find): add 9 v1.10 optional fields …` — T1 schema extension.
  2. `feat(acp_search_narrative): new tool wrapping Metabot's $0.05 paid offering` — T2.
  3. `feat(acp_agent_risk_check): new tool wrapping Metabot's $0.05 paid offering` — T3.
  4. `feat(slash-commands): add /acp-find:narrate + /acp-find:risk-check (v0.12.0)` — T4.
  5. `chore(release): v0.12.0 — surface Metabot v1.10 Phase 1+2+3` — T5 (version bumps + CHANGELOG + READMEs).
  6. `docs(ship-checklist): add v0.12.0 ship-when-returns runbook` — this file (T6).
- Workspace `C:\code_crypto\ACP\CLAUDE.md` paragraph bumped to v0.12.0 in a separate commit on that local repo (no remote — local-only).
- 40 tests pass (`cd mcp-server && node --test test.js`).
- Tool count: 39 (was 37 in v0.11.1).
- Slash command count: 30 (was 28 in v0.11.1).

## Steps to ship

### 1. Verify Metabot v1.10 Phase 3 has deployed

The two new tools (`acp_search_narrative` + `acp_agent_risk_check`) call `POST /v1/searchNarrative` and `POST /v1/agentRiskCheck` on the gateway. These endpoints **don't exist yet** — they're Metabot v1.10 Phase 3 work. Confirm before shipping:

```powershell
curl -s -X POST https://api.acp-metabot.dev/v1/searchNarrative `
  -H "Content-Type: application/json" `
  -d '{"search":{"query":"swap on base","limit":1}}' | jq .
```

Expect a `summary` field; if you get `404 Not Found` or `not_implemented`, Metabot v1.10 Phase 3 hasn't deployed yet and shipping v0.12.0 will give buyers broken tools.

You can still ship the npm package — the 9 new `acp_find` fields work today (old gateways silently ignore unknown fields). The two new tools will 404 until Metabot Phase 3 lands; the CHANGELOG and `What's new` blocks both document this caveat.

### 2. Push to GitHub

```powershell
cd C:\code_crypto\ACP\acp-find-plugin
git push origin main
```

Sanity-check the commit list before pushing:

```powershell
git log origin/main..HEAD --oneline
```

Expect 6 commits (T1-T6 above).

### 3. Tag the release

```powershell
git tag acp-find--v0.12.0
git push origin acp-find--v0.12.0
```

### 4. npm publish — REAL Windows PowerShell ONLY

Per the `acp-find-mcp-bump` skill: the npm account is WebAuthn-only. The Bash tool / Claude Code `!`-prefix subprocesses can't trigger the WebAuthn popup and will return `EOTP`. **Open PowerShell directly** (Start menu → "PowerShell" → not via Claude Code).

```powershell
cd C:\code_crypto\ACP\acp-find-plugin\mcp-server
npm publish
```

The WebAuthn popup fires automatically. Approve in your browser, the package uploads.

If `npm` somehow lost WebAuthn capability (rare):

```powershell
npm logout
npm login --auth-type=web
# Click the printed URL, approve in browser
npm publish
```

### 5. Verify

```powershell
npm view acp-find-mcp version
# expect: 0.12.0

npm view acp-find-mcp tags
# expect: { latest: '0.12.0' }
```

### 6. Smoke against a fresh install

In any terminal (`npx -y` will cache the new tarball):

```powershell
npx -y acp-find-mcp@0.12.0 --version
```

Then in an MCP-capable client (Claude Code, Cursor, Cline) reload the plugin and confirm `tools/list` shows 39 entries, with `acp_search_narrative` and `acp_agent_risk_check` present.

### 7. (Optional) live smoke against the deployed Metabot

If Metabot v1.10 Phase 3 IS deployed:

```powershell
# Via Claude Code with the plugin reloaded:
/acp-find:narrate find me a swap agent on base
/acp-find:risk-check 0x6f283e2c8a76e6a5d6b1f1c2e3f4d5e6f7a8b9c0
```

If 4xx/5xx, file a bug against Metabot — the MCP layer is verified by the 40 passing tests already.

## Files changed in v0.12.0 (sanity-check list)

```
.claude-plugin/plugin.json          — version 0.11.1 → 0.12.0
CHANGELOG.md                        — new v0.12.0 entry at TOP
README.md                           — "What's new in v0.12.0" lead block at TOP
commands/narrate.md                 — NEW
commands/risk-check.md              — NEW
mcp-server/README.md                — "What's new in v0.12.0" lead block at TOP
mcp-server/package.json             — version 0.11.1 → 0.12.0
mcp-server/server.js                — +9 acp_find fields, +2 TOOLS entries, +2 HANDLERS
mcp-server/test.js                  — +5 tests, +2 EXPECTED_TOOLS, tools/list count 37 → 39
```

Workspace-local (separate repo, no remote, no push needed):

```
C:\code_crypto\ACP\CLAUDE.md        — acp-find-plugin paragraph bumped to v0.12.0
```
