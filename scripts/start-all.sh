#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN_DIR="$ROOT_DIR/admin-panel"
DEFAULT_PUBLIC_PORT=3004
DEFAULT_ADMIN_PORT=4444

if [ ! -d "$ADMIN_DIR" ]; then
  echo "Admin panel folder not found: $ADMIN_DIR"
  exit 1
fi

is_port_free() {
  local port="$1"
  ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

find_free_port() {
  local start="$1"
  local end="$2"
  local p
  for ((p=start; p<=end; p++)); do
    if is_port_free "$p"; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

cleanup() {
  if [ -n "${GATEWAY_PID:-}" ] && kill -0 "$GATEWAY_PID" 2>/dev/null; then
    kill "$GATEWAY_PID" 2>/dev/null || true
  fi
  if [ -n "${ADMIN_PID:-}" ] && kill -0 "$ADMIN_PID" 2>/dev/null; then
    kill "$ADMIN_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

PUBLIC_PORT="$(find_free_port "$DEFAULT_PUBLIC_PORT" 3099 || true)"
ADMIN_PORT="$(find_free_port "$DEFAULT_ADMIN_PORT" 4499 || true)"

if [ -z "${PUBLIC_PORT}" ] || [ -z "${ADMIN_PORT}" ]; then
  echo "Could not find free ports for gateway/admin."
  exit 1
fi

if [ "$PUBLIC_PORT" = "$ADMIN_PORT" ]; then
  ADMIN_PORT="$(find_free_port 4500 4599 || true)"
fi

# Stop stale Next.js dev process for this same admin directory.
if [ -f "$ADMIN_DIR/.next/dev/lock" ]; then
  OLD_NEXT_PID="$(
    sed -n 's/.*"pid":[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$ADMIN_DIR/.next/dev/lock" | head -n 1
  )"
  if [ -n "${OLD_NEXT_PID:-}" ] && kill -0 "$OLD_NEXT_PID" 2>/dev/null; then
    kill "$OLD_NEXT_PID" 2>/dev/null || true
    sleep 1
  fi
fi

echo "Starting admin on http://localhost:${ADMIN_PORT}"
(
  cd "$ADMIN_DIR"
  NEXT_PUBLIC_SITE_URL="http://localhost:${PUBLIC_PORT}" npx next dev -p "$ADMIN_PORT"
) &
ADMIN_PID=$!

echo "Starting unified gateway on http://localhost:${PUBLIC_PORT}"
node "$ROOT_DIR/scripts/unified-gateway.js" "$PUBLIC_PORT" "$ADMIN_PORT" "$ROOT_DIR" &
GATEWAY_PID=$!

echo ""
echo "Running:"
echo "- Site:  http://localhost:${PUBLIC_PORT}"
echo "- Admin: http://localhost:${PUBLIC_PORT}/admin"
echo ""
echo "Press Ctrl+C to stop both."

wait "$ADMIN_PID"
