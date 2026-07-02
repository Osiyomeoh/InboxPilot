FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci --workspace=apps/web --include-workspace-root

FROM base AS builder
COPY apps/web ./apps/web
COPY tsconfig.base.json ./
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_WS_URL=ws://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
RUN npm run build --workspace=apps/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.* ./apps/web/
EXPOSE 3000
CMD ["node", "apps/web/node_modules/.bin/next", "start", "-p", "3000", "--prefix", "apps/web"]
