# Development stage
FROM node:20-alpine AS development
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /workspace

# Copy root workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY turbo.json* ./

# Copy workspace apps/web
COPY apps/web ./apps/web

# Install all workspace dependencies from root
RUN pnpm install --frozen-lockfile

# Set working directory to web app
WORKDIR /workspace/apps/web

# Expose port
EXPOSE 3000

# Run development server
CMD ["pnpm", "run", "dev"]

# Build stage
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /workspace

# Copy root workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY turbo.json* ./

# Copy workspace apps/web package.json
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies from root
RUN pnpm install --frozen-lockfile

# Copy workspace apps/web source
COPY apps/web ./apps/web

# Set working directory to web app and build
WORKDIR /workspace/apps/web
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy built files from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run application
CMD ["node", "server.js"]
