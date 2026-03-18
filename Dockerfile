# ─── Stage 1: Build frontend ─────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage 2: Production server ─────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Copy built frontend
COPY --from=frontend /app/dist ./dist

# Copy server + prisma
COPY server/ ./server/
COPY prisma/ ./prisma/

# Install server dependencies
WORKDIR /app/server
RUN npm ci --production

# Swap Prisma provider to PostgreSQL for production
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' ../prisma/schema.prisma

# Generate Prisma client for PostgreSQL
RUN npx prisma generate

# Back to app root
WORKDIR /app

EXPOSE 3003

# Run migrations then start the server
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && node index.js"]
