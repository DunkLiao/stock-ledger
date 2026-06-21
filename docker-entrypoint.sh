#!/bin/sh
set -e

export DATABASE_PATH="${DATABASE_PATH:-/data/stock_booking.db}"
DATA_DIR=$(dirname "$DATABASE_PATH")
mkdir -p "$DATA_DIR" 2>/dev/null || true

# Fix permissions for the data directory (ignore errors for NFS/EBS volumes that don't support chown)
chown -R node:node "$DATA_DIR" 2>/dev/null || true
chmod -R 755 "$DATA_DIR" 2>/dev/null || true

exec tini -- gosu node node server.js
