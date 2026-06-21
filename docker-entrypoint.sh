#!/bin/sh
set -e

# Ensure the data directory exists and is writable
export DATABASE_PATH="${DATABASE_PATH:-/data/stock_booking.db}"
DATA_DIR=$(dirname "$DATABASE_PATH")
mkdir -p "$DATA_DIR" 2>/dev/null || true
chown -R node:node "$DATA_DIR" 2>/dev/null || true

exec tini -- gosu node node server.js
