#!/bin/bash

# CapRover Migration Script
# Runs Prisma migrations on the deployed CapRover app

set -e

APP_NAME="${1:-sally-api}"

echo "🔄 Running Prisma migrations on CapRover app: $APP_NAME"
echo "================================================"
echo ""

# Execute prisma migrate deploy
caprover api \
  -p "/user/apps/appData/$APP_NAME" \
  -m POST \
  -d '{"detachedCommand":"pnpm exec prisma migrate deploy"}'

echo ""
echo "✅ Migration command sent to CapRover!"
echo ""
echo "To check migration status, run:"
echo "  ./scripts/caprover-exec.sh $APP_NAME 'pnpm exec prisma migrate status'"
echo ""
