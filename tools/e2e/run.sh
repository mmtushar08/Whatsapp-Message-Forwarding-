#!/usr/bin/env bash
# Builds the backend and dashboard, starts them against the mock Meta Graph
# API with a fresh database, and drives every user flow in Chromium.
# Usage: tools/e2e/run.sh   (CHROME_PATH=/path/to/chrome to pick a browser)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
TMP="$HERE/.tmp"
PIDS=()
cleanup() { for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT

for port in 3000 4010 5173; do
  if curl -s -o /dev/null "localhost:$port"; then
    echo "Port $port is already in use — stop whatever is running there first." >&2
    exit 1
  fi
done

rm -rf "$TMP" && mkdir -p "$TMP"
[ -d "$HERE/node_modules" ] || (cd "$HERE" && npm install --no-audit --no-fund)

echo "Building backend and dashboard…"
(cd "$REPO/apps/forwarder" && npm run build >/dev/null)
(cd "$REPO/apps/dashboard" && VITE_API_BASE_URL=http://localhost:3000 VITE_META_APP_ID=test-app-id \
  VITE_META_CONFIG_ID=cfg-123 npx vite build --outDir "$TMP/dashboard-dist" --emptyOutDir >/dev/null)

node "$HERE/mock-meta.js" > "$TMP/meta.log" 2>&1 & PIDS+=($!)

(cd "$REPO/apps/forwarder" && exec env NODE_ENV=production PORT=3000 TRUST_PROXY=0 DB_PATH="$TMP/e2e.db" \
  WEBHOOK_VERIFY_TOKEN=platform-verify-token APP_ENCRYPTION_KEY=e2e-encryption-key-0123456789abcdef \
  META_APP_ID=test-app-id META_APP_SECRET=test-app-secret META_GRAPH_API_BASE_URL=http://localhost:4010 \
  CORS_ORIGIN=http://localhost:5173 PUBLIC_APP_URL=http://localhost:3000 \
  MAX_RETRY_ATTEMPTS=2 RETRY_BASE_DELAY_MS=200 \
  node dist/index.js > "$TMP/forwarder.log" 2>&1) & PIDS+=($!)

(cd "$HERE" && exec node -e "
const express = require('express'); const path = require('path'); const app = express();
const dist = path.join('$TMP', 'dashboard-dist');
app.use(express.static(dist)); app.get('*', (_q, r) => r.sendFile(path.join(dist, 'index.html')));
app.listen(5173);" > "$TMP/dashboard.log" 2>&1) & PIDS+=($!)

for _ in $(seq 1 30); do
  curl -sf localhost:3000/health >/dev/null && curl -sf localhost:5173 >/dev/null \
    && curl -sf localhost:4010/__sent >/dev/null && break
  sleep 1
done

node "$HERE/e2e.js"
