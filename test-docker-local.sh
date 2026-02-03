#!/bin/bash

# Test Docker build locally before deploying to CapRover

set -e

echo "🧪 Testing Docker build locally..."
echo "=================================="
echo ""

# Build the image
echo "📦 Building Docker image..."
docker build -t sally-api-test:local -f apps/backend/Dockerfile .

echo ""
echo "✅ Build successful!"
echo ""

# Inspect the image
echo "📋 Image size:"
docker images sally-api-test:local --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
echo ""

# Test: Check if Prisma Client exists
echo "🔍 Checking if Prisma Client exists in image..."
docker run --rm sally-api-test:local sh -c "ls -la node_modules/.prisma/client 2>/dev/null && echo '✅ Prisma Client found' || echo '❌ Prisma Client NOT found'"
echo ""

# Test: Check if @nestjs/cache-manager exists
echo "🔍 Checking if @nestjs/cache-manager exists in image..."
docker run --rm sally-api-test:local sh -c "ls -la node_modules/@nestjs/cache-manager 2>/dev/null && echo '✅ @nestjs/cache-manager found' || echo '❌ @nestjs/cache-manager NOT found'"
echo ""

# Test: Check if app can start (with fake DATABASE_URL)
echo "🚀 Testing if app can start..."
echo "   (Will fail after startup due to missing DB, but should reach app initialization)"
docker run --rm \
  -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
  -e REDIS_URL="redis://localhost:6379" \
  -e SECRET_KEY="test-secret-key-minimum-32-chars" \
  -e NODE_ENV="production" \
  sally-api-test:local &

CONTAINER_PID=$!
sleep 5
kill $CONTAINER_PID 2>/dev/null || true

echo ""
echo "=================================="
echo "✅ Local Docker test complete!"
echo ""
echo "To run the container interactively:"
echo "  docker run -it --rm sally-api-test:local sh"
echo ""
echo "To deploy to CapRover:"
echo "  caprover deploy -a sally-api --default"
echo ""
