#!/bin/bash

# CapRover Execute Command Script
# Runs any command on the deployed CapRover app

set -e

APP_NAME="${1:-sally-api}"
COMMAND="${2}"
CAPROVER_MACHINE="${3:-captain-01}"

if [ -z "$COMMAND" ]; then
  echo "Usage: ./scripts/caprover-exec.sh <app-name> '<command>' [machine-name]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/caprover-exec.sh sally-api 'npx prisma migrate deploy'"
  echo "  ./scripts/caprover-exec.sh sally-api 'npx prisma migrate status'"
  echo "  ./scripts/caprover-exec.sh sally-api 'npm run bootstrap:super-admin'"
  echo "  ./scripts/caprover-exec.sh sally-api 'psql \$DATABASE_URL -c \"SELECT * FROM users\"'"
  exit 1
fi

echo "🚀 Executing command on CapRover app: $APP_NAME"
echo "Machine: $CAPROVER_MACHINE"
echo "Command: $COMMAND"
echo "================================================"
echo ""

# Execute command with automatic machine selection
echo "$CAPROVER_MACHINE" | caprover api \
  -p "/user/apps/appData/$APP_NAME" \
  -m POST \
  -d "{\"detachedCommand\":\"$COMMAND\"}"

echo ""
echo "✅ Command sent to CapRover!"
echo ""
