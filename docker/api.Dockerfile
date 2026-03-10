FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate
WORKDIR /app

# ── Build ─────────────────────────────────────────────────────────
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @edin/shared build
RUN cd apps/api && npx prisma generate
RUN pnpm --filter api build
# Create standalone deployment with flat node_modules (no symlinks)
RUN pnpm --filter api deploy /app/deployed

# ── Production ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/deployed ./

EXPOSE 3001
CMD ["dumb-init", "sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
