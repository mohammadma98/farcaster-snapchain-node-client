#!/usr/bin/env bash
# ==============================================================================
# Command (1): Set up a Snapchain Read Node
# Part of Farcaster Client & Node Suite (MIT License)
#
# Properties:
# - ZERO 3rd-party API keys required (no Alchemy, Infura, or Neynar keys needed)
# - Fully standalone, downloads initial snapshot and syncs decided blocks
# - Accepts client writes via POST /v1/submitMessage & relays to validators via mempool gossip
# ==============================================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}        (1) Set up a Standalone Snapchain Read Node            ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

SNAPCHAIN_DIR="${HOME}/snapchain"
NODE_OPERATOR_FID="${1:-2}" # Default operator FID or user specified FID

echo -e "Target installation directory: ${BOLD}${SNAPCHAIN_DIR}${NC}"
echo -e "Operator FID for upgrade schedule: ${BOLD}${NODE_OPERATOR_FID}${NC}"

mkdir -p "$SNAPCHAIN_DIR"
cd "$SNAPCHAIN_DIR"

# 1. Download official management script
echo -e "\n${YELLOW}[1/4] Fetching official snapchain.sh management script...${NC}"
curl -sSL -o snapchain.sh https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/scripts/snapchain.sh
chmod +x snapchain.sh

# 2. Write configuration .env (Zero API Keys Required!)
echo -e "${YELLOW}[2/4] Configuring node environment (.env)...${NC}"
cat <<EOF > .env
## Snapchain Read Node Configuration (Zero API Keys)
AGREE_NO_REWARDS_FOR_ME=true
HUB_OPERATOR_FID=${NODE_OPERATOR_FID}
SKIP_CRONTAB=false
GRAFANA_CREDS=admin:admin
EOF

# 3. Pull required Compose & Validator configs
echo -e "${YELLOW}[3/4] Pulling docker-compose & validator configs...${NC}"
curl -sSL -o docker-compose.yml https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/docker-compose.mainnet.yml
curl -sSL -o validators.toml https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/validators.toml

# Avoid port conflict: Map Grafana to 3005 so port 3000 remains dedicated to the Farcaster Web Client
if grep -q "3000:3000" docker-compose.yml; then
    sed -i.bak 's/3000:3000/3005:3000/g' docker-compose.yml 2>/dev/null || sed -i '' 's/3000:3000/3005:3000/g' docker-compose.yml 2>/dev/null || true
    rm -f docker-compose.yml.bak 2>/dev/null || true
fi

mkdir -p grafana
curl -sSL -o grafana/grafana-dashboard.json https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/grafana/grafana-dashboard.json || true
curl -sSL -o grafana/grafana.ini https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/grafana/grafana.ini || true

# 4. Start Snapchain Read Node
echo -e "${YELLOW}[4/4] Starting Snapchain Docker containers...${NC}"
if command -v docker &> /dev/null; then
    docker compose down || true
    docker compose up -d
else
    echo -e "${RED}[ERROR] Docker is not installed. Please run command (0) first: bash scripts/0-provision-compute.sh${NC}"
    exit 1
fi

echo -e "\n${GREEN}${BOLD}Waiting for Snapchain HTTP API to initialize on port 3381...${NC}"
ATTEMPTS=0
MAX_ATTEMPTS=30
SYNCED=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:3381/v1/info > /dev/null 2>&1; then
        SYNCED=true
        break
    fi
    echo -n "."
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))
done
echo ""

if [ "$SYNCED" = true ]; then
    echo -e "${GREEN}${BOLD}[✓] Snapchain Read Node is UP and RUNNING!${NC}"
    echo -e "\n${BLUE}Node Health Summary:${NC}"
    curl -s http://localhost:3381/v1/info | jq '.' 2>/dev/null || curl -s http://localhost:3381/v1/info
    echo -e "\n${GREEN}Endpoints available:${NC}"
    echo -e "  - HTTP API: ${BOLD}http://localhost:3381${NC}"
    echo -e "  - gRPC API: ${BOLD}localhost:3383${NC}"
    echo -e "  - Metrics / Grafana: ${BOLD}http://localhost:3005${NC} (admin/admin)"
    echo -e "\nTo inspect live snapshot download and sync logs:"
    echo -e "  ${BOLD}docker logs -f snapchain${NC} or ${BOLD}./snapchain.sh logs${NC}"
else
    echo -e "${YELLOW}[!] The node container started, but HTTP API is still warming up (snapshot download in progress).${NC}"
    echo -e "Check sync progress anytime with: ${BOLD}docker logs -f snapchain${NC}"
fi

echo -e "\n${GREEN}${BOLD}Step (1) Complete!${NC} Now run Step (2) to launch your client: ${BOLD}bash scripts/2-create-client.sh${NC}"
