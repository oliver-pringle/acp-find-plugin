---
description: Read the status of a registered marketplace watch by id
---

Read the status of marketplace watch: **$ARGUMENTS**

Use the `acp_watch_status` MCP tool from the `acp-find` server. Pass the watch id as `watchId`.

Watches are registered by hiring TheMetaBot's `watch` offering and fire a webhook on new matches for a saved query. This tool is read-only — the gateway returns the watch's public state (whether it's alive, when it expires, how many alerts have fired, the saved query and filters). Sensitive fields (buyer address, webhook URL) are intentionally not returned.

Render the response as:

1. **Headline:** watch id + status (`active` / `expired` / `paused`) + expiresAt (UTC, human-readable).
2. **Saved query**: the original `query` plus any filters (chain, minReputation, freshness, etc.).
3. **Trigger budget**: `intervalHours` (poll cadence) + `maxAlerts` (lifetime cap) + `alertsFired` so far.
4. **Last fire**: `lastFiredAt` if any alerts have fired.

If the watch has no recent activity, suggest the user verify their webhook is healthy. If the watch is `expired`, suggest re-hiring the `watch` offering to renew.

If the watch isn't found, tell the user the id is unknown and confirm they have the right one (watch ids are returned at registration time).
