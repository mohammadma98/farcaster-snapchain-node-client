#!/usr/bin/env bash
# ==============================================================================
# Command (1): Set up a Snapchain Read Node
# Part of Farcaster Client & Node Suite (MIT License)
# Repository: https://github.com/mohammadma98/farcaster-snapchain-node-client
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
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}        (1) Set up a Standalone Snapchain Read Node            ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

# ------------------------------------------------------------------------------
# 1. Verify Step (0) Provisioning State
# ------------------------------------------------------------------------------
CONFIG_FILE="/etc/snapchain/snapchain.conf"
if [ ! -f "$CONFIG_FILE" ] && [ -f "${HOME}/.snapchain.conf" ]; then
    CONFIG_FILE="${HOME}/.snapchain.conf"
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "\n${RED}${BOLD}================================================================${NC}"
    echo -e "${RED}${BOLD}[FATAL ERROR] Step (0) Provisioning Not Detected!${NC}"
    echo -e "${RED}${BOLD}================================================================${NC}"
    echo -e "${RED}This server has not completed compute provisioning and storage selection.${NC}"
    echo -e "You MUST run Command (0) before setting up the Snapchain Read Node.\n"
    echo -e "Please execute Command (0) now:"
    echo -e "${CYAN}${BOLD}curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash${NC}\n"
    exit 1
fi

# Load provisioned configuration
# shellcheck source=/dev/null
source "$CONFIG_FILE"

if [ "${PROVISIONED:-false}" != "true" ]; then
    echo -e "\n${RED}${BOLD}[ERROR] Compute provisioning in Step (0) was incomplete or failed.${NC}"
    echo -e "Please re-run Command (0) to properly prepare hardware and storage."
    exit 1
fi

if [ "${HARDWARE_SUPPORTED:-true}" != "true" ]; then
    echo -e "\n${RED}${BOLD}[FATAL ERROR] Server hardware does not meet minimum operational requirements.${NC}"
    echo -e "${RED}Snapchain Read Node cannot run on this machine.${NC}"
    exit 1
fi

# Secondary Hardware Sanity Check
CPUS=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 1)
if [ -f /proc/meminfo ]; then
    RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    RAM_GB=$(( RAM_KB / 1024 / 1024 ))
else
    RAM_GB=16
fi

if [ "$CPUS" -lt 2 ] || [ "$RAM_GB" -lt 4 ]; then
    echo -e "\n${RED}${BOLD}[FATAL ERROR] Hardware resources are insufficient to run Snapchain Read Node.${NC}"
    echo -e "  - Minimum Required: 2 CPU Cores, 4 GB RAM"
    echo -e "  - Detected System:  ${CPUS} CPU Cores, ${RAM_GB} GB RAM"
    echo -e "${RED}Execution blocked. Please upgrade server resources.${NC}"
    exit 1
fi

# ------------------------------------------------------------------------------
# 2. Configure Node Directory from Provisioned Storage
# ------------------------------------------------------------------------------
SNAPCHAIN_DIR="${SNAPCHAIN_DATA_DIR:-${HOME}/snapchain}"
NODE_OPERATOR_FID="${1:-2}" # Default operator FID or user-specified FID

echo -e "Provisioned Storage Information:"
echo -e "  - Target Data Directory: ${BOLD}${SNAPCHAIN_DIR}${NC}"
if [ -n "${SELECTED_MOUNT:-}" ]; then
    echo -e "  - Mounted Volume:        ${BOLD}${SELECTED_MOUNT}${NC} (Device: ${STORAGE_DEVICE:-unknown}, Available: ${STORAGE_AVAIL_GB:-unknown} GB)"
fi
echo -e "  - Node Operator FID:     ${BOLD}${NODE_OPERATOR_FID}${NC}"

mkdir -p "$SNAPCHAIN_DIR"
cd "$SNAPCHAIN_DIR"

# ------------------------------------------------------------------------------
# 3. Pull Official Snapchain Management Scripts & Configurations
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[1/4] Fetching official snapchain.sh management script...${NC}"
curl -sSL -o snapchain.sh https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/scripts/snapchain.sh
chmod +x snapchain.sh

echo -e "${YELLOW}[2/4] Configuring node environment (.env - Zero API Keys)...${NC}"
cat <<EOF > .env
## Snapchain Read Node Configuration (Zero API Keys)
AGREE_NO_REWARDS_FOR_ME=true
HUB_OPERATOR_FID=${NODE_OPERATOR_FID}
SKIP_CRONTAB=false
GRAFANA_CREDS=admin:admin
EOF

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

# ------------------------------------------------------------------------------
# 4. Launch Snapchain Read Node Container
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/4] Starting Snapchain Docker containers...${NC}"
if command -v docker &> /dev/null; then
    docker compose down || true
    docker compose up -d
else
    echo -e "${RED}[ERROR] Docker is not installed. Please run Command (0) first: bash scripts/0-provision-compute.sh${NC}"
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
    echo -e "  - HTTP API (Reads & submitMessage writes): ${BOLD}http://localhost:3381${NC}"
    echo -e "  - gRPC API:                               ${BOLD}localhost:3383${NC}"
    echo -e "  - P2P Gossip Mesh:                        ${BOLD}0.0.0.0:3382 (UDP/QUIC & TCP)${NC}"
    echo -e "  - Metrics / Grafana Dashboard:            ${BOLD}http://localhost:3005${NC} (admin/admin)"
    echo -e "\nTo inspect live snapshot download and sync logs:"
    echo -e "  ${BOLD}docker logs -f snapchain${NC} or ${BOLD}cd ${SNAPCHAIN_DIR} && ./snapchain.sh logs${NC}"
else
    echo -e "${YELLOW}[!] The node container started, but HTTP API is still warming up (snapshot download in progress).${NC}"
    echo -e "Check sync progress anytime with: ${BOLD}docker logs -f snapchain${NC}"
fi

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✓ Step (1) Complete: Snapchain Read Node is operational!      ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "Next step: Run Command (2) to launch your Sovereign Client & Web UI:"
echo -e "${CYAN}${BOLD}curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash${NC}\n"
