FROM node:20-alpine AS builder
WORKDIR /workspace

# Copy root workspace configuration
COPY package*.json ./
COPY turbo.json* ./

# Copy all workspace packages and backend
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install all workspace dependencies from root
RUN npm install

# Generate Prisma client and build backend
WORKDIR /workspace/apps/backend
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY --from=builder /workspace/apps/backend/package*.json ./

# Copy built application and Prisma schema
COPY --from=builder /workspace/apps/backend/dist ./dist
COPY --from=builder /workspace/apps/backend/prisma ./prisma

# Copy ALL node_modules from builder (includes all workspace dependencies)
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/apps/backend/node_modules ./node_modules_backend

# Copy and set up entrypoint script
COPY --from=builder /workspace/apps/backend/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["./docker-entrypoint.sh"]
