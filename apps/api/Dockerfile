FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/agent/package*.json ./packages/agent/
COPY packages/db/package*.json ./packages/db/
RUN npm ci --workspace=apps/api --workspace=packages/agent --workspace=packages/db --include-workspace-root

FROM base AS builder
COPY packages/db ./packages/db
COPY packages/agent ./packages/agent
COPY apps/api ./apps/api
COPY tsconfig.base.json ./
RUN npm run build --workspace=packages/db 2>/dev/null || true
RUN npm run build --workspace=packages/agent
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/packages/agent/dist ./packages/agent/dist
COPY --from=builder /app/packages/agent/package.json ./packages/agent/package.json
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/agent/node_modules ./packages/agent/node_modules
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
