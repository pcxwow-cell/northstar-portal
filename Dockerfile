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

# Generate Prisma client
RUN npx prisma generate

# Back to app root
WORKDIR /app

EXPOSE 3003

CMD ["node", "server/index.js"]
