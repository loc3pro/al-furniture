#!/usr/bin/env bash
# Ghi .env production từ biến môi trường (GitHub Actions Secrets / Variables).
set -euo pipefail

DEST="${1:-.env}"

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${AUTH_SECRET:?AUTH_SECRET is required}"

normalize_env_value() {
  local val="${1-}"
  val="${val//$'\r'/}"
  val="${val#"${val%%[![:space:]]*}"}"
  val="${val%"${val##*[![:space:]]}"}"
  if [[ "$val" == *$'\n'* ]]; then
    echo "refusing to write multiline value" >&2
    return 1
  fi
  printf '%s' "$val"
}

write_kv() {
  local key="$1"
  local val
  val="$(normalize_env_value "${2-}")" || {
    echo "refusing to write multiline value for ${key}" >&2
    exit 1
  }
  # Docker Compose env_file: không dùng %q (bash) — dấu nháy sẽ thành phần giá trị.
  printf '%s=%s\n' "$key" "$val"
}

{
  write_kv NODE_ENV "${NODE_ENV:-production}"
  write_kv DATABASE_URL "$DATABASE_URL"
  write_kv AUTH_SECRET "$AUTH_SECRET"
  redis_url="$(normalize_env_value "${REDIS_URL:-}")" || {
    echo "refusing to write multiline value for REDIS_URL" >&2
    exit 1
  }
  if [ -z "$redis_url" ]; then
    redis_url="redis://redis:6379"
  fi
  write_kv REDIS_URL "$redis_url"
  write_kv REDIS_CACHE_PREFIX "${REDIS_CACHE_PREFIX:-furniture_ecm}"
  write_kv NEXT_PUBLIC_SITE_URL "${NEXT_PUBLIC_SITE_URL:-}"
  write_kv NEXT_PUBLIC_GOOGLE_CLIENT_ID "${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-}"
  write_kv NEXT_PUBLIC_MESSENGER_URL "${NEXT_PUBLIC_MESSENGER_URL:-}"
  write_kv NEXT_PUBLIC_ZALO_URL "${NEXT_PUBLIC_ZALO_URL:-}"
  write_kv NEXT_PUBLIC_HOTLINE_TEL "${NEXT_PUBLIC_HOTLINE_TEL:-}"
  write_kv NEXT_PUBLIC_GA_ID "${NEXT_PUBLIC_GA_ID:-}"
  write_kv NEXT_PUBLIC_FB_PIXEL_ID "${NEXT_PUBLIC_FB_PIXEL_ID:-}"
  write_kv NEXT_PUBLIC_CONTACT_EMAIL "${NEXT_PUBLIC_CONTACT_EMAIL:-}"
  write_kv NEXT_PUBLIC_APP_MESSAGE "${NEXT_PUBLIC_APP_MESSAGE:-}"
  write_kv NEXT_PUBLIC_ADMIN_APP_MESSAGE "${NEXT_PUBLIC_ADMIN_APP_MESSAGE:-}"
  write_kv NEXT_PUBLIC_APP_MESSAGE_KIND "${NEXT_PUBLIC_APP_MESSAGE_KIND:-info}"
  write_kv CLOUDINARY_URL "${CLOUDINARY_URL:-}"
  write_kv CLOUDINARY_CLOUD_NAME "${CLOUDINARY_CLOUD_NAME:-}"
  write_kv CLOUDINARY_API_KEY "${CLOUDINARY_API_KEY:-}"
  write_kv CLOUDINARY_API_SECRET "${CLOUDINARY_API_SECRET:-}"
  write_kv OTP_DEBUG "${OTP_DEBUG:-0}"
  write_kv SESSION_COOKIE_SECURE "${SESSION_COOKIE_SECURE:-}"
  write_kv LIBRE_TRANSLATE_URL "${LIBRE_TRANSLATE_URL:-}"
  write_kv LIBRE_TRANSLATE_KEY "${LIBRE_TRANSLATE_KEY:-}"
  write_kv CHAT_UPLOAD_RETENTION_MS "${CHAT_UPLOAD_RETENTION_MS:-}"
  write_kv CHAT_UPLOAD_RETENTION_HOURS "${CHAT_UPLOAD_RETENTION_HOURS:-168}"
} >"$DEST"

chmod 600 "$DEST"
