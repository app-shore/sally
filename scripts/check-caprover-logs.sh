#!/bin/bash

# Quick script to check sally-api logs on CapRover

echo "🔍 Checking sally-api container status and logs..."
echo ""

# Check if container is running
echo "Container status:"
docker ps | grep sally-api || echo "❌ No running sally-api container found"
echo ""

# Get container ID
CONTAINER_ID=$(docker ps | grep sally-api | awk '{print $1}')

if [ -z "$CONTAINER_ID" ]; then
  echo "❌ Container not running. Checking recent logs:"
  docker logs $(docker ps -a | grep sally-api | head -1 | awk '{print $1}') --tail 50
else
  echo "✅ Container running: $CONTAINER_ID"
  echo ""
  echo "Recent logs (last 50 lines):"
  docker logs $CONTAINER_ID --tail 50
fi
