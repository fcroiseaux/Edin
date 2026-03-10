FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate
WORKDIR /app

# ── Build ─────────────────────────────────────────────────────────
FROM base AS builder

# NEXT_PUBLIC_* vars must be present at build time (Next.js inlines them)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @edin/shared build
RUN pnpm --filter @edin/ui build
RUN pnpm --filter web build

# ── Production ────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone output (monorepo structure preserved)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app/apps/web
CMD ["dumb-init", "node", "server.js"]
