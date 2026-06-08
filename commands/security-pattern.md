---
description: Query the 74-pattern ACP security catalogue (P1-P64 + B1-B9) maintained by TheSecurityBot
---

Query the 74-pattern ACP security catalogue.

Call `acp_security_pattern` with optional filters.

**Syntax:** `/acp-find:security-pattern [<id>] [severity:<level>] [search:<term>]`

**Routing:**
- Positional first arg that looks like a pattern ID (`P5`, `B3`, `p17`) → `patternId`
- Named `severity:` flag → `severity` (Critical/High/Medium/Low/Operational)
- Named `search:` flag → `query` (free-text search across pattern titles)
- Bare args that don't look like pattern IDs → treated as `query`
- No args → full 74-pattern catalogue

**Render:**
- **Single-pattern mode:** Full card with severity badge, title, detection rule, canonical fix, reference bot.
- **Filtered mode:** Table with id, severity badge, title, reference bot. Expand to full card on user tap/click.
- **Full catalogue mode:** Compact table, grouped by severity, with a summary count line.

**Examples:**
- `/acp-find:security-pattern` — full 74-pattern catalogue
- `/acp-find:security-pattern P5` — single pattern: webhook secret encryption
- `/acp-find:security-pattern severity:Critical` — only Critical-severity patterns
- `/acp-find:security-pattern search:webhook` — all patterns with "webhook" in the title
- `/acp-find:security-pattern p17` — single pattern: silent-401 fail-fast

The catalogue is cached 5 min. Free SecurityBot Resource — no API key required.
