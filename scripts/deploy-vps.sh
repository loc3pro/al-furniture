#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${VPS_APP_DIR:-/root/furniture-ecm/current}"
REPO_URL="${GIT_REPO_URL:-https://github.com/loc3pro/al-furniture.git}"

if [ -n "${GIT_CLONE_TOKEN:-}" ]; then
  REPO_URL="https://x-access-token:${GIT_CLONE_TOKEN}@github.com/loc3pro/al-furniture.git"
fi

bash "$(dirname "$0")/ensure-git-checkout.sh" "$APP_DIR" "$REPO_URL"

cd "$APP_DIR"

git fetch origin main
git reset --hard origin/main
bash scripts/render-deploy-env.sh .env
docker compose up -d --build
docker image prune -f
