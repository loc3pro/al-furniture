#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${VPS_APP_DIR:-/root/furniture-ecm/current}"
cd "$APP_DIR"

git fetch origin main
git reset --hard origin/main
docker compose up -d --build
docker image prune -f
