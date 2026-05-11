#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:?app directory is required}"
REPO_URL="${2:?repository URL is required}"

if [ -d "$APP_DIR/.git" ]; then
  exit 0
fi

if [ -e "$APP_DIR" ] && [ -n "$(ls -A "$APP_DIR" 2>/dev/null || true)" ]; then
  backup="${APP_DIR}.backup-$(date -u +%Y%m%d%H%M%S)"
  echo "Backing up non-git app directory to ${backup}"
  mv "$APP_DIR" "$backup"
fi

mkdir -p "$(dirname "$APP_DIR")"
git clone --branch main "$REPO_URL" "$APP_DIR"
