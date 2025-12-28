#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEVCONTAINER_DIR="$SCRIPT_DIR/.devcontainer"
PORTS_FILE="$DEVCONTAINER_DIR/.current-ports"

# Default ports
DEFAULT_VITE_PORT=5173
DEFAULT_PREVIEW_PORT=4173

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --vite-port=*) VITE_PORT="${1#*=}"; shift ;;
    --preview-port=*) PREVIEW_PORT="${1#*=}"; shift ;;
    *) shift ;;
  esac
done

# Function to check if port is available
port_available() {
  ! lsof -i ":$1" >/dev/null 2>&1
}

# Function to find next available port starting from given port
find_available_port() {
  local port=$1
  while ! port_available $port; do
    ((port++))
  done
  echo $port
}

# Auto-detect available ports if not specified
VITE_PORT=${VITE_PORT:-$(find_available_port $DEFAULT_VITE_PORT)}
PREVIEW_PORT=${PREVIEW_PORT:-$(find_available_port $DEFAULT_PREVIEW_PORT)}

# Export for docker-compose
export VITE_PORT PREVIEW_PORT

# Write current ports to file for LLM/tooling discovery
cat > "$PORTS_FILE" << EOF
# Current devcontainer port configuration
# Generated: $(date -Iseconds)
VITE_PORT=$VITE_PORT
PREVIEW_PORT=$PREVIEW_PORT
EOF

# Display port information
echo "╔════════════════════════════════════════════╗"
echo "║  Devcontainer Port Configuration           ║"
echo "╠════════════════════════════════════════════╣"
printf "║  Vite Dev:    http://localhost:%-5s      ║\n" "$VITE_PORT"
printf "║  Vite Preview: http://localhost:%-5s     ║\n" "$PREVIEW_PORT"
echo "╚════════════════════════════════════════════╝"
echo ""

cd "$DEVCONTAINER_DIR"
docker compose up -d --build
docker exec -it "$(docker compose ps -q dev)" bash
