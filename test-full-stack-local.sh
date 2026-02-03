#!/bin/bash

# Full-stack local testing with Docker Compose

set -e

echo "🧪 Testing SALLY Backend Full Stack Locally"
echo "============================================"
echo ""

# Build the image first
echo "📦 Step 1: Building Docker image..."
docker build -t sally-api-test:local -f apps/backend/Dockerfile .
echo "✅ Build complete!"
echo ""

# Start services
echo "🚀 Step 2: Starting services (PostgreSQL, Redis, Backend)..."
docker-compose -f docker-compose.test.yml up -d

echo ""
echo "⏳ Step 3: Waiting for services to be healthy..."
echo "   This may take 20-30 seconds..."
sleep 5

# Wait for PostgreSQL
echo "   - Waiting for PostgreSQL..."
for i in {1..15}; do
  if docker exec sally-test-db pg_isready -U sally_user -d sally 2>/dev/null; then
    echo "   ✅ PostgreSQL ready"
    break
  fi
  if [ $i -eq 15 ]; then
    echo "❌ PostgreSQL failed to start"
    docker-compose -f docker-compose.test.yml logs postgres
    exit 1
  fi
  sleep 2
done

# Wait for Redis
echo "   - Waiting for Redis..."
for i in {1..15}; do
  if docker exec sally-test-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "   ✅ Redis ready"
    break
  fi
  if [ $i -eq 15 ]; then
    echo "❌ Redis failed to start"
    docker-compose -f docker-compose.test.yml logs redis
    exit 1
  fi
  sleep 2
done

# Check backend logs for startup
echo ""
echo "📋 Step 4: Checking backend startup logs..."
sleep 10
docker logs sally-test-api --tail 30

echo ""
echo "🔍 Step 5: Running health checks..."

# Test 1: Container is running
if docker ps | grep -q sally-test-api; then
  echo "   ✅ Backend container is running"
else
  echo "   ❌ Backend container is NOT running"
  docker logs sally-test-api
  exit 1
fi

# Test 2: Health endpoint
echo "   - Testing /health endpoint..."
if curl -f http://localhost:8000/health -s > /dev/null; then
  echo "   ✅ Health endpoint responding"
  curl -s http://localhost:8000/health | jq .
else
  echo "   ❌ Health endpoint failed"
  docker logs sally-test-api --tail 50
  exit 1
fi

echo ""
echo "🎯 Step 6: Running database migrations..."
docker exec sally-test-api npx prisma migrate deploy || {
  echo "❌ Migrations failed"
  docker logs sally-test-api --tail 50
  exit 1
}
echo "✅ Migrations complete!"

echo ""
echo "🧪 Step 7: Testing API endpoints..."

# Test API root
echo "   - Testing API root..."
curl -s http://localhost:8000/api/v1 | jq . || echo "   (Endpoint may not exist, continuing...)"

# Test Swagger docs
echo "   - Testing Swagger documentation..."
if curl -f http://localhost:8000/api -s > /dev/null; then
  echo "   ✅ Swagger docs available at http://localhost:8000/api"
else
  echo "   ⚠️  Swagger docs not responding"
fi

echo ""
echo "============================================"
echo "✅ Full stack test COMPLETE!"
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - Backend API: http://localhost:8000"
echo "  - Swagger Docs: http://localhost:8000/api"
echo "  - Health Check: http://localhost:8000/health"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.test.yml logs -f backend"
echo ""
echo "To stop services:"
echo "  docker-compose -f docker-compose.test.yml down"
echo ""
echo "To stop and remove volumes:"
echo "  docker-compose -f docker-compose.test.yml down -v"
echo ""
