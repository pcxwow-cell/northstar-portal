# Deployment Guide

> Last updated: 2026-03-18

## Current Production Setup

| Component | Service | URL |
|-----------|---------|-----|
| Frontend | Vercel (Hobby plan) | https://northstar-portal-roan.vercel.app/ |
| Backend API | Railway | Proxied via Vercel `/api/*` rewrites |
| Database | PostgreSQL (Supabase) | Connected via `DATABASE_URL` on Railway |
| Auto-deploy | GitHub → Vercel | Push to `master` triggers frontend deploy |

### How It Works
1. Vercel serves the static React build
2. API calls (`/api/v1/*`) are proxied from Vercel to the Railway backend via `vercel.json` rewrites
3. Railway runs the Express server on port `$PORT` (bound to `0.0.0.0`)
4. Express connects to Supabase PostgreSQL via `DATABASE_URL`
5. If the backend is unreachable, the frontend falls back to demo mode (static data from `data.js`)

---

## Local Development (SQLite)

The default setup uses SQLite for zero-configuration development.

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Generate Prisma client
npx prisma generate

# Push schema to SQLite dev database
npx prisma db push

# Seed demo data
cd server && node seed.js && cd ..

# Start API server (Terminal 1)
cd server && npm run dev    # Port 3003

# Start frontend (Terminal 2)
npm run dev                  # Port 3000, proxies /api to 3003
```

The `.env` in `server/` should contain:
```env
DATABASE_URL=file:../prisma/dev.db
JWT_SECRET=dev-secret
API_PORT=3003
```

---

## Railway Deployment

The backend runs on Railway with PostgreSQL provided by Supabase.

### Environment Variables (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (from Supabase) |
| `JWT_SECRET` | Yes | Random 64+ character string for JWT signing |
| `PORT` | Auto | Railway sets this automatically |
| `NODE_ENV` | Yes | Set to `production` |
| `CORS_ORIGINS` | Yes | `https://northstar-portal-roan.vercel.app` |
| `EMAIL_PROVIDER` | No | `resend` or `sendgrid` (default: `demo`) |
| `RESEND_API_KEY` | No | Resend API key (if using Resend) |
| `SENDGRID_API_KEY` | No | SendGrid API key (if using SendGrid) |
| `EMAIL_FROM_ADDRESS` | No | `noreply@northstardevelopment.ca` |
| `ESIGN_PROVIDER` | No | `docusign` or `hellosign` (default: `demo`) |
| `DOCUSIGN_INTEGRATION_KEY` | No | DocuSign integration key |
| `DOCUSIGN_USER_ID` | No | DocuSign user ID |
| `DOCUSIGN_ACCOUNT_ID` | No | DocuSign account ID |
| `DOCUSIGN_PRIVATE_KEY` | No | DocuSign private key (as env var, not file path) |
| `SEED_ON_START` | No | Set to `true` to auto-seed on first deploy |
| `SENTRY_DSN` | No | Sentry error tracking DSN |

### First Deploy on Railway

```bash
# Railway will auto-detect Node.js and run the start script
# To seed the database on first deploy, set SEED_ON_START=true
# Or use the one-time seed endpoint:
curl -X POST https://your-railway-url/api/v1/seed
```

### PostgreSQL Sequence Fix

After seeding on PostgreSQL, ID sequences may conflict. Use:
```bash
curl -X POST https://your-railway-url/api/v1/fix-sequences
```
Or set `FORCE_RESEED=true` to reset sequences automatically during seeding.

---

## Docker Deployment (Alternative)

Docker Compose runs PostgreSQL + the app in production mode.

```bash
# Start everything (builds frontend, starts PostgreSQL, runs migrations)
docker-compose up -d --build

# The portal is available at http://localhost:3003

# View logs
docker-compose logs -f app

# Seed initial data (first time only)
docker-compose exec app sh -c "cd server && node seed.js"

# Stop
docker-compose down
```

### Environment Variables (Docker)

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_PASSWORD` | Yes (production) | PostgreSQL password. Default: `northstar_dev` |
| `JWT_SECRET` | Yes (production) | Random 64+ character string for JWT signing |

Example:
```bash
export DB_PASSWORD=my-secure-db-password
export JWT_SECRET=$(openssl rand -hex 32)
docker-compose up -d --build
```

---

## Manual Production Deployment

For deployment without Docker or Railway:

1. **Provision PostgreSQL** (16+ recommended)
   ```sql
   CREATE DATABASE northstar_portal;
   CREATE USER northstar WITH PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE northstar_portal TO northstar;
   ```

2. **Configure environment** — set `DATABASE_URL` and other env vars

3. **Build and deploy**
   ```bash
   npm ci
   npm run build                    # Build frontend
   cd server && npm ci --production
   npx prisma generate              # Generate client for PostgreSQL
   npx prisma migrate deploy        # Run migrations
   node index.js                    # Start server on port 3003
   ```

4. **Reverse proxy** — Use Caddy (config included in `Caddyfile`) or nginx:
   ```nginx
   server {
       listen 443 ssl;
       server_name portal.northstardevelopment.ca;

       location / {
           proxy_pass http://127.0.0.1:3003;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

---

## Vercel Configuration

The `vercel.json` handles:
- SPA rewrites (all non-API routes → `index.html`)
- API proxy rewrites (`/api/*` → Railway backend)
- Cache headers for static assets

**Important**: Vercel Hobby plan blocks deploys with `Co-Authored-By` in commit messages. Never add co-author trailers.

---

## Database Migrations

```bash
# Create a new migration (development)
cd server && npx prisma migrate dev --name description_of_change

# Apply migrations (production)
cd server && npx prisma migrate deploy

# Reset database (development only — destroys all data)
npx prisma migrate reset --force
```

---

## Health Check

The API exposes a health endpoint (no auth required):
```
GET /api/v1/health
→ { "status": "ok" }
```
