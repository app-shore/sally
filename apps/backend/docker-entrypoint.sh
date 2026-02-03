#!/bin/sh

# Docker entrypoint script
# Runs database migrations before starting the app

set -e

echo "🚀 Starting SALLY Backend..."
echo "================================"

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

echo "✅ Migrations complete!"
echo ""

# Start the application
echo "🎯 Starting application..."
exec node dist/main
