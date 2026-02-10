#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="reusserstudioblog"
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"
TEMPLATE_PATH="$APP_DIR/deploy/${SERVICE_NAME}.service.template"

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "This installer must be run as root (use sudo)." >&2
  exit 1
fi

if [[ ! -f "$TEMPLATE_PATH" ]]; then
  echo "Missing template: $TEMPLATE_PATH" >&2
  exit 1
fi

DOCKER_BIN="$(command -v docker || true)"
if [[ -z "$DOCKER_BIN" ]]; then
  echo "docker not found in PATH. Install Docker Engine + compose plugin first." >&2
  exit 1
fi

if ! "$DOCKER_BIN" compose version >/dev/null 2>&1; then
  echo "docker compose plugin not available. Install docker compose v2 plugin." >&2
  exit 1
fi

if [[ ! -f "$APP_DIR/docker-compose.yml" ]]; then
  echo "docker-compose.yml not found in: $APP_DIR" >&2
  exit 1
fi

# Ensure docker daemon is available; service will also depend on docker.service.
if ! systemctl is-enabled docker >/dev/null 2>&1; then
  echo "Warning: docker.service is not enabled; enabling it." >&2
  systemctl enable docker >/dev/null 2>&1 || true
fi

TMP_UNIT="$(mktemp)"
trap 'rm -f "$TMP_UNIT"' EXIT

sed \
  -e "s|__APP_DIR__|$APP_DIR|g" \
  -e "s|__DOCKER_BIN__|$DOCKER_BIN|g" \
  "$TEMPLATE_PATH" > "$TMP_UNIT"

install -m 0644 "$TMP_UNIT" "$UNIT_PATH"

systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}.service"

echo "Installed and started: ${SERVICE_NAME}.service"
echo "Frontend should be on http://localhost:8088 (per docker-compose.yml)."
