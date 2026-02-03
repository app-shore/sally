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

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy package files
COPY --from=builder /workspace/apps/backend/package*.json ./

# Copy built application and Prisma schema
COPY --from=builder /workspace/apps/backend/dist ./dist
COPY --from=builder /workspace/apps/backend/prisma ./prisma

# Copy ALL node_modules from deps stage (includes all workspace dependencies)
COPY --from=deps /workspace/node_modules ./node_modules

# Copy and set up entrypoint script
COPY --from=builder /workspace/apps/backend/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["./docker-entrypoint.sh"]
