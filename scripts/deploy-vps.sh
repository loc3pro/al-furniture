#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${VPS_APP_DIR:-/root/furniture-ecm/current}"
REPO_URL="${GIT_REPO_URL:-https://github.com/loc3pro/al-furniture.git}"

if [ -n "${GIT_CLONE_TOKEN:-}" ]; then
  REPO_URL="https://x-access-token:${GIT_CLONE_TOKEN}@github.com/loc3pro/al-furniture.git"
fi

if [ ! -d "$APP_DIR/.git" ]; then
  if [ -e "$APP_DIR" ] && [ -n "$(ls -A "$APP_DIR" 2>/dev/null || true)" ]; then
    echo "APP_DIR exists but is not a git checkout: $APP_DIR" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch main "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

git fetch origin main
git reset --hard origin/main
bash scripts/render-deploy-env.sh .env
docker compose up -d --build
docker image prune -f
