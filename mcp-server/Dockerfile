# Tiny image for users who don't want to install Node 22 locally. The MCP
# server has zero npm dependencies, so the only thing that needs to ship
# is server.js + package.json (which the server reads at startup for
# SERVER_VERSION).
#
# Run with `docker run --rm -i <image>` from your MCP client config — the
# `-i` is required because MCP communicates over stdio.

FROM node:22-alpine

WORKDIR /app

# Copy only what's needed at runtime. No `npm install` step — there are no deps.
COPY package.json server.js ./

# Run as non-root for defense in depth. node:22-alpine ships a `node` user.
USER node

ENV NODE_ENV=production
ENV ACP_API_URL=https://api.acp-metabot.dev

ENTRYPOINT ["node", "/app/server.js"]
