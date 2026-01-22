# Optimized multi-stage build for REST-OS
# This Dockerfile uses layer caching to speed up builds

# Stage 1: Frontend Builder
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package files for better caching (only reinstall if dependencies change)
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy frontend source and build
COPY apps/web ./apps/web
RUN cd apps/web && npm run build

# Stage 1.5: Production dependencies only
FROM node:20-alpine AS frontend-prod-deps
WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install ONLY production dependencies (no dev deps)
RUN npm ci --omit=dev

# Stage 2: Python Backend Setup
FROM python:3.11-slim AS backend-builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install --no-cache-dir uv

# Copy backend files and install dependencies
COPY apps/backend ./backend
RUN cd backend && uv sync --no-dev

# Stage 3: Final Production Image
FROM python:3.11-slim
WORKDIR /app

# Install runtime dependencies (Node.js for Next.js, supervisor for process management)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    nodejs \
    npm \
    supervisor && \
    rm -rf /var/lib/apt/lists/*

# Install uv in final image
RUN pip install --no-cache-dir uv supervisor

# Copy backend from builder
COPY --from=backend-builder /app/backend ./backend

# Copy frontend build artifacts
COPY --from=frontend-builder /app/apps/web/.next ./web/.next
COPY --from=frontend-builder /app/apps/web/public ./web/public
COPY --from=frontend-builder /app/apps/web/package*.json ./web/
COPY --from=frontend-builder /app/apps/web/next.config.ts ./web/

# Copy ONLY production node_modules (much smaller!)
COPY --from=frontend-prod-deps /app/node_modules ./node_modules
COPY --from=frontend-prod-deps /app/package*.json ./

# Copy supervisor configuration
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 3000 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start supervisor to manage both services
CMD ["/usr/local/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
