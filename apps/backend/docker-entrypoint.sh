#!/bin/sh

# Docker entrypoint script
# Runs database migrations before starting the app

set -e

echo "🚀 Starting SALLY Backend..."
echo "================================"

# Debug: Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  WARNING: DATABASE_URL environment variable is not set!"
  echo "Database operations will fail"
else
  echo "✅ DATABASE_URL is configured"
fi

echo ""
echo "⚠️  AUTO-MIGRATIONS DISABLED"
echo "   Run migrations manually: docker exec -it <container-id> npx prisma migrate deploy"
echo ""

# Start the application (skip migrations)
echo "🎯 Starting application..."
exec node dist/main
