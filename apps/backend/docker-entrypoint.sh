#!/bin/sh

# Docker entrypoint script
# Runs database migrations before starting the app

set -e

echo "🚀 Starting SALLY Backend..."
echo "================================"

# Debug: Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  echo "Please configure DATABASE_URL in CapRover App Configs"
  exit 1
fi

echo "✅ DATABASE_URL is configured"

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

echo "✅ Migrations complete!"
echo ""

# Start the application
echo "🎯 Starting application..."
exec node dist/main
