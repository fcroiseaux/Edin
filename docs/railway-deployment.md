# Edin — Railway Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Railway Project                    │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌─────┐  ┌─────────┐   │
│  │   Web    │  │   API    │  │ PG  │  │  Redis  │   │
│  │ Next.js  │→ │ NestJS   │→ │ 16  │  │    7    │   │
│  │ :3000    │  │ :3001    │→ │     │  │         │   │
│  └──────────┘  └──────────┘  └─────┘  └─────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

| Service    | Technology              | Docker                  | Port |
| ---------- | ----------------------- | ----------------------- | ---- |
| Web        | Next.js 16 (standalone) | `docker/web.Dockerfile` | 3000 |
| API        | NestJS + Prisma 7       | `docker/api.Dockerfile` | 3001 |
| PostgreSQL | PostgreSQL 16           | Railway add-on          | 5432 |
| Redis      | Redis 7                 | Railway add-on          | 6379 |

## Prerequisites

- A [Railway](https://railway.com) account
- The Edin repo pushed to GitHub
- A GitHub OAuth App ([create one](https://github.com/settings/developers))
- An Anthropic API key (optional, for AI evaluation features)

## Step-by-step Setup

### 1. Create the Railway project

Via the dashboard: **New Project** > **Empty Project**.

Or via CLI:

```bash
brew install railway
railway login
railway init
```

### 2. Add infrastructure services

In the project dashboard:

- **+ New** > **Database** > **PostgreSQL**
- **+ New** > **Database** > **Redis**

Railway provisions them instantly and exposes connection variables as reference variables (`${{Postgres.DATABASE_URL}}`, `${{Redis.REDIS_URL}}`).

### 3. Add the API service

**+ New** > **GitHub Repo** > select the Edin repository.

#### Build settings (Settings tab)

| Setting         | Value                   |
| --------------- | ----------------------- |
| Root Directory  | `/`                     |
| Dockerfile Path | `docker/api.Dockerfile` |

#### Networking (Settings tab)

- **Generate Domain** to get a public URL (e.g., `api-production-xxxx.up.railway.app`)
- Set the **Port** to `3001`

#### Environment variables (Variables tab)

```env
# ── Infrastructure (reference variables) ──
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# ── Application ──
NODE_ENV=production
API_PORT=3001
API_HOST=0.0.0.0
FRONTEND_URL=https://<web-service-domain>.up.railway.app
LOG_LEVEL=info

# ── GitHub OAuth ──
GITHUB_CLIENT_ID=<your_client_id>
GITHUB_CLIENT_SECRET=<your_client_secret>
GITHUB_CALLBACK_URL=https://<api-service-domain>.up.railway.app/api/v1/auth/github/callback

# ── JWT ──
JWT_SECRET=<min_32_chars>
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=30d

# ── Anthropic (optional) ──
ANTHROPIC_API_KEY=<your_key>
```

> **Generating JWT_SECRET**: `openssl rand -base64 48`

### 4. Add the Web service

**+ New** > **GitHub Repo** > select the **same** Edin repository.

#### Build settings (Settings tab)

| Setting         | Value                   |
| --------------- | ----------------------- |
| Root Directory  | `/`                     |
| Dockerfile Path | `docker/web.Dockerfile` |

#### Networking (Settings tab)

- **Generate Domain** (e.g., `web-production-xxxx.up.railway.app`)
- Set the **Port** to `3000`

#### Environment variables (Variables tab)

```env
NEXT_PUBLIC_API_URL=https://<api-service-domain>.up.railway.app
```

> `NEXT_PUBLIC_API_URL` is inlined at build time by Next.js. Any change to this variable requires a redeploy.

### 5. Configure GitHub OAuth callback

After both services have their Railway domains, update the GitHub OAuth App:

- **Homepage URL**: `https://<web-service-domain>.up.railway.app`
- **Authorization callback URL**: `https://<api-service-domain>.up.railway.app/api/v1/auth/github/callback`

### 6. Deploy

Push to `main`. Railway auto-deploys both services.

Deployment order:

1. PostgreSQL and Redis start instantly
2. API builds, runs `prisma migrate deploy`, then starts
3. Web builds (with `NEXT_PUBLIC_API_URL` injected) and starts

## Custom Domains

In each service's **Settings** > **Networking** > **Custom Domain**:

1. Add your domain (e.g., `app.edin.io`, `api.edin.io`)
2. Configure DNS: add the CNAME record Railway provides
3. Railway provisions TLS automatically

After adding custom domains, update:

- `FRONTEND_URL` on the API service
- `NEXT_PUBLIC_API_URL` on the Web service (triggers rebuild)
- `GITHUB_CALLBACK_URL` on the API service
- The GitHub OAuth App callback URL

## Database Management

### Run migrations manually

```bash
railway run --service api -- npx prisma migrate deploy
```

### Open Prisma Studio

```bash
railway run --service api -- npx prisma studio
```

### Connect to PostgreSQL directly

```bash
railway connect Postgres
```

### Seed the database

```bash
railway run --service api -- npx tsx prisma/seed.ts
```

## Monitoring

### View logs

```bash
railway logs --service api
railway logs --service web
```

Or use the **Logs** tab in the Railway dashboard for each service.

### Health check

The API exposes a health endpoint:

```
GET https://<api-domain>/api/v1/health
```

Configure it in Railway: **Settings** > **Deploy** > **Healthcheck Path** = `/api/v1/health`.

## Environment-specific Configuration

| Variable              | Development                                       | Production                                      |
| --------------------- | ------------------------------------------------- | ----------------------------------------------- |
| `NODE_ENV`            | development                                       | production                                      |
| `LOG_LEVEL`           | debug                                             | info                                            |
| `FRONTEND_URL`        | http://localhost:3000                             | https://app.edin.io                             |
| `GITHUB_CALLBACK_URL` | http://localhost:3001/api/v1/auth/github/callback | https://api.edin.io/api/v1/auth/github/callback |

## Estimated Costs

| Resource           | Estimated monthly cost |
| ------------------ | ---------------------- |
| API service        | ~$3-5 (usage-based)    |
| Web service        | ~$3-5 (usage-based)    |
| PostgreSQL         | ~$5-7                  |
| Redis              | ~$5-7                  |
| Railway Hobby plan | $5                     |
| **Total**          | **~$20-25/month**      |

## Troubleshooting

### Build fails with "frozen lockfile" error

Ensure `pnpm-lock.yaml` is committed and up to date. Run `pnpm install` locally and commit the lock file.

### Prisma migrate fails on first deploy

The PostgreSQL schemas (`core`, `evaluation`, `publication`, `audit`) are created by the initial migration. If the database is fresh, the first deploy handles everything. If it fails, check that `DATABASE_URL` is correct and the PostgreSQL service is running.

### CORS errors in the browser

The API allows requests from `FRONTEND_URL` in production. Verify that `FRONTEND_URL` matches the exact web service domain (including `https://`).

### NEXT_PUBLIC_API_URL not working after change

`NEXT_PUBLIC_*` variables are inlined at build time. After changing the value, trigger a redeploy of the Web service.

### Redis connection refused

Ensure `REDIS_URL` uses the Railway reference variable: `${{Redis.REDIS_URL}}`. Railway manages the internal networking automatically.
