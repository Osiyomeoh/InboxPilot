FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY packages/mcp/package*.json ./packages/mcp/
COPY packages/db/package*.json ./packages/db/
RUN npm ci --workspace=packages/mcp --workspace=packages/db --include-workspace-root

FROM base AS builder
COPY packages/db ./packages/db
COPY packages/mcp ./packages/mcp
COPY tsconfig.base.json ./
RUN npm run build --workspace=packages/db 2>/dev/null || true
RUN npm run build --workspace=packages/mcp

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/mcp/dist ./packages/mcp/dist
COPY --from=builder /app/packages/mcp/package.json ./packages/mcp/package.json
EXPOSE 4001
CMD ["node", "packages/mcp/dist/index.js"]
