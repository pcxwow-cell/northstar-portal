# Deployment Guide

## Local Development (SQLite)

The default setup uses SQLite for zero-configuration development.

```bash
# Install dependencies
npm install
cd server && npm install

# Push schema to SQLite dev database
cd server && npx prisma db push

# Seed demo data
cd server && node seed.js

# Start dev server (frontend + API)
npm run dev          # Vite frontend on :3000
cd server && npm run dev  # API on :3001
```

The `.env` in `server/` should contain:
```
DATABASE_URL=file:../prisma/dev.db
JWT_SECRET=dev-secret
API_PORT=3001
```

## Docker Deployment (PostgreSQL)

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

### Environment Variables

Set these before running `docker-compose up`:

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

## Manual Production Deployment

For deployment without Docker:

1. **Provision PostgreSQL** (16+ recommended)
   ```sql
   CREATE DATABASE northstar_portal;
   CREATE USER northstar WITH PASSWORD 'your-password';
   GRANT ALL PRIVILEGES ON DATABASE northstar_portal TO northstar;
   ```

2. **Configure environment** — copy `server/.env.production.example` to `server/.env` and fill in values

3. **Switch Prisma to PostgreSQL**
   ```bash
   # In prisma/schema.prisma, change:
   #   provider = "sqlite"
   # to:
   #   provider = "postgresql"
   ```

4. **Build and deploy**
   ```bash
   npm ci
   npm run build                    # Build frontend
   cd server && npm ci --production
   npx prisma generate              # Generate client for PostgreSQL
   npx prisma migrate deploy        # Run migrations
   node index.js                    # Start server
   ```

5. **Reverse proxy** (nginx example)
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

## Database Migrations

```bash
# Create a new migration (development)
cd server && npx prisma migrate dev --name description_of_change

# Apply migrations (production)
cd server && npx prisma migrate deploy

# Reset database (development only — destroys all data)
npx prisma migrate reset --force
```

## Health Check

The API exposes a health endpoint:
```
GET /api/v1/health
→ { "status": "ok" }
```
