FROM node:20-alpine AS builder
WORKDIR /workspace

# Copy root workspace configuration
COPY package*.json ./
COPY turbo.json* ./

# Copy all workspace packages
COPY packages ./packages
COPY apps/backend ./apps/backend

# Install all workspace dependencies from root
RUN npm install

# Generate Prisma client
WORKDIR /workspace/apps/backend
RUN npx prisma generate

# Build the backend
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install production dependencies only
COPY --from=builder /workspace/package*.json ./
COPY --from=builder /workspace/apps/backend/package*.json ./backend-package.json

# Copy packages and workspace config for production install
COPY --from=builder /workspace/packages ./packages
RUN npm install --workspace=apps/backend --omit=dev --ignore-scripts

# Copy built application
COPY --from=builder /workspace/apps/backend/dist ./dist
COPY --from=builder /workspace/apps/backend/prisma ./prisma

# Copy node_modules from builder (includes Prisma client and all deps)
COPY --from=builder /workspace/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["node", "dist/main"]
