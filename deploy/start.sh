#!/bin/sh
set -e

echo "Starting SALLY Services..."

# Start backend in background
echo "Starting FastAPI Backend on port 8000..."
cd /app/backend
uv run fastapi run app/main.py --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting Next.js Frontend on port 3000..."
cd /app/web
pnpm start -- -p 3000 -H 0.0.0.0 &
FRONTEND_PID=$!

echo "SALLY Started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Dashboard: http://localhost:3000"
echo "API: http://localhost:8000"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
