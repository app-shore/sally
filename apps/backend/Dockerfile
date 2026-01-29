FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files for workspace resolution
COPY package*.json ./

# Copy shared-types package
COPY packages/shared-types ./packages/shared-types

# Copy backend package files
COPY apps/backend/package*.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma/
COPY apps/backend/tsconfig*.json ./apps/backend/
COPY apps/backend/nest-cli.json ./apps/backend/

# Install dependencies from backend directory
WORKDIR /app/apps/backend
RUN npm install

# Copy source
COPY apps/backend/src ./src

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/package*.json ./
COPY --from=builder /app/packages/shared-types ./node_modules/@rest-os/shared-types

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["node", "dist/main"]
