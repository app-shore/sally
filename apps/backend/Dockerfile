# Dependencies stage - separate for better caching
FROM node:20-alpine AS deps
WORKDIR /workspace

# Copy only package files (better layer caching)
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared-types/package*.json ./packages/shared-types/

# Configure npm for better reliability and install dependencies
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 100000 && \
    npm config set fetch-retries 5 && \
    npm install --network-timeout=600000 --prefer-offline

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /workspace

# Accept DATABASE_URL as build argument (optional, uses placeholder if not provided)
ARG DATABASE_URL

# Copy node_modules from deps stage (includes all workspace dependencies)
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/backend/node_modules ./apps/backend/node_modules

# Copy source code
COPY package*.json ./
COPY turbo.json* ./
COPY packages ./packages
COPY apps/backend ./apps/backend

# Generate Prisma client and build backend
WORKDIR /workspace/apps/backend
RUN npx prisma generate
RUN npm run build

# Production stage - minimal image
FROM node:20-alpine AS production
WORKDIR /app

# Install wget for healthcheck and postgresql-client for migrations
RUN apk add --no-cache wget postgresql-client

# Copy package files
COPY --from=builder /workspace/apps/backend/package*.json ./

# Copy built application, Prisma schema, config, and migration script
COPY --from=builder /workspace/apps/backend/dist ./dist
COPY --from=builder /workspace/apps/backend/prisma ./prisma
COPY --from=builder /workspace/apps/backend/prisma.config.ts ./prisma.config.ts
COPY --from=builder /workspace/apps/backend/scripts/apply-migration.sh ./apply-migration.sh

# Make migration script executable
RUN chmod +x ./apply-migration.sh

# Copy ALL node_modules from BUILDER (includes generated Prisma Client)
COPY --from=builder /workspace/node_modules ./node_modules

# Copy backend-specific node_modules and merge (overwrite to ensure backend deps take precedence)
COPY --from=builder /workspace/apps/backend/node_modules ./node_modules_backend
RUN cp -rf /app/node_modules_backend/* /app/node_modules/ 2>/dev/null || true && \
    rm -rf /app/node_modules_backend

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/api/v1/health || exit 1

EXPOSE 8000

# Run migrations and start application
CMD sh -c "./apply-migration.sh && node dist/main"
