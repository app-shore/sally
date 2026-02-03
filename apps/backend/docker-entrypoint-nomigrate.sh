#!/bin/sh

# Docker entrypoint script WITHOUT auto-migrations
# Use this to get the app running first, then run migrations manually

set -e

echo "🚀 Starting SALLY Backend (NO AUTO-MIGRATION MODE)..."
echo "================================"

# Debug: Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  WARNING: DATABASE_URL environment variable is not set!"
  echo "App will start but database operations will fail"
else
  echo "✅ DATABASE_URL is configured"
fi

echo ""
echo "⚠️  MIGRATIONS SKIPPED - Run manually with:"
echo "   docker exec -it <container-id> npx prisma migrate deploy"
echo ""

# Start the application
echo "🎯 Starting application..."
exec node dist/main
