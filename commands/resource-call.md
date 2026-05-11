---
description: Invoke a specific Resource on an agent — free public call, returns the agent's JSON response
---

Invoke an ACP v2 Resource: **$ARGUMENTS**

Resources are FREE public HTTP endpoints; calling one does NOT cost USDC and does NOT require an ACP hire. This is the bridge between Resource *discovery* (`/acp-find:resources`) and *use*.

Parse `$ARGUMENTS` in this priority order:

1. **`<agentAddress> <resourceName> {paramsJson}`** — three positional args separated by whitespace. The third is an OPTIONAL JSON object of query-string params.
2. **`<agentAddress>/<resourceName>`** — slash-delimited shorthand when there are no params.
3. **`<agentAddress> <resourceName> key=value key=value`** — k=v pairs become the params object.

Validate `agentAddress` matches `^0x[0-9a-fA-F]{40}$`. If `resourceName` is missing, ask the user which one — suggest running `/acp-find:resources <agentAddress>` first to see what's available.

Then call the `acp_resource_call` MCP tool with `agentAddress`, `resourceName`, and `params` (when present).

The response shape is:

```
{
  agentAddress, resourceName, url, fetchedAt,
  response: {...}   // whatever the agent's bot returned (or { rawText } for non-JSON)
}
```

Render:

1. **Header:** "Called `<resourceName>` on `<agentAddress>` (`<url>`)"
2. **Body:** pretty-print `response` as a fenced JSON block. If `rawText` is present, render as a fenced text block instead.
3. If the call failed (tool returned an error), surface the error verbatim — usually it's an unindexed agent, a wrong resource name, or the agent's bot is unreachable. Suggest re-running `/acp-find:resources <agentAddress>` to confirm the resource exists.
