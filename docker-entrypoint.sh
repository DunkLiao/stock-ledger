#!/bin/sh
set -e

# Ensure the data directory exists and is writable
DATA_DIR=$(dirname "${DATABASE_PATH:-/data/stock_booking.db}")
mkdir -p "$DATA_DIR" 2>/dev/null || true
chown -R node:node "$DATA_DIR" 2>/dev/null || true

exec node server.js
