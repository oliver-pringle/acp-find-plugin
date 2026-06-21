# acp-find-edge container.
# Build context = acp-find-plugin/mcp-server  (so it can COPY the zero-dep
# server.js core alongside the edge wrapper).
#   docker build -f edge/Dockerfile -t acp-find-edge .
FROM node:22-slim

WORKDIR /app
# Zero-dep core (the same file the npm package ships) + its manifest: server.js
# reads SERVER_VERSION from the package.json sitting next to it.
COPY server.js ./server.js
COPY package.json ./package.json
# Edge wrapper + its only dependency manifest.
COPY edge/package.json ./edge/package.json
WORKDIR /app/edge
RUN npm install --omit=dev --no-audit --no-fund
COPY edge/edge.js ./edge.js

ENV EDGE_PORT=8080
ENV NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "edge.js"]
