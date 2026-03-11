#!/bin/sh
# Start the Shura decision analysis backend.
# Usage: ./run.sh

set -e
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

echo "Starting demo API server with ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:+***set***}"
echo "Endpoint: http://127.0.0.1:${DEMO_SERVER_PORT:-3001}/api/demo-analysis"

exec node demo-server.mjs
