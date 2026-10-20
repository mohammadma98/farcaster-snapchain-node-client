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

# Helper function to read user input interactively even when piped via curl | bash
prompt_user() {
    local prompt_msg="$1"
    local default_val="$2"
    local response=""

    # Support automated non-interactive overrides
    if [ "${FORCE:-false}" == "true" ] || [ "${ASSUME_YES:-false}" == "true" ] || [ "${FORCE_INSTALL:-false}" == "true" ]; then
        echo "y"
        return 0
    fi

    printf "%b" "$prompt_msg" >&2

    if [ -t 0 ]; then
        read -r response || true
    elif [ -e /dev/tty ] && [ -r /dev/tty ]; then
        read -r response < /dev/tty || true
    else
        response="$default_val"
    fi

    if [ -z "$response" ]; then
        echo "$default_val"
    else
        echo "$response"
    fi
}

format_bytes() {
    local b=${1:-0}
    if ! [[ "$b" =~ ^[0-9]+$ ]]; then
        b=0
    fi
    if [ "$b" -ge 1073741824 ]; then
        awk -v b="$b" 'BEGIN {printf "%.2f GB", b / 1073741824}'
    elif [ "$b" -ge 1048576 ]; then
        awk -v b="$b" 'BEGIN {printf "%.1f MB", b / 1048576}'
    elif [ "$b" -ge 1024 ]; then
        awk -v b="$b" 'BEGIN {printf "%.1f KB", b / 1024}'
    else
        echo "${b} B"
    fi
}

format_speed() {
    local bps=${1:-0}
    if ! [[ "$bps" =~ ^[0-9]+$ ]]; then
        bps=0
    fi
    if [ "$bps" -ge 1048576 ]; then
        awk -v b="$bps" 'BEGIN {printf "%.2f MB/s", b / 1048576}'
    elif [ "$bps" -ge 1024 ]; then
        awk -v b="$bps" 'BEGIN {printf "%.1f KB/s", b / 1024}'
    else
        echo "${bps} B/s"
    fi
}

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

if [ "${HARDWARE_SUPPORTED:-true}" != "true" ] && [ "${LOW_SPEC_MODE:-false}" != "true" ]; then
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
    if [ "${LOW_SPEC_MODE:-false}" == "true" ]; then
        echo -e "\n  ${YELLOW}${BOLD}⚠ Running in Low-Resource Compatibility Mode (${CPUS} CPU, ${RAM_GB} GB RAM).${NC}"
        echo -e "  ${YELLOW}Notice: Snapshot extraction and block synchronization will be significantly slower.${NC}"
    else
        echo -e "\n${YELLOW}${BOLD}================================================================${NC}"
        echo -e "${YELLOW}${BOLD}  ⚠ Low Hardware Resources Detected (${CPUS} CPU, ${RAM_GB} GB RAM)      ${NC}"
        echo -e "${YELLOW}${BOLD}================================================================${NC}"
        echo -e "  - Minimum Standard: 2 CPU Cores, 4 GB RAM"
        echo -e "  - Detected System:  ${BOLD}${CPUS} CPU Cores, ${RAM_GB} GB RAM${NC}"
        echo -e "  ${YELLOW}Warning: Running below minimum specifications will make block sync and RocksDB operations very slow.${NC}\n"
        CONFIRM_PROCEED=$(prompt_user "Do you want to continue anyway? [y/N]: " "n")
        case "$CONFIRM_PROCEED" in
            [yY]|[yY][eE][sS])
                echo -e "  ${GREEN}✓ Proceeding in low-resource mode.${NC}"
                ;;
            *)
                echo -e "${RED}[ABORTED] Node setup stopped by operator. Please upgrade server resources.${NC}"
                exit 1
                ;;
        esac
    fi
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

# Locate the active Snapchain node container
CONTAINER_NAME=$(docker ps --filter "name=snapchain" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -E "snapchain.*snapchain|snapchain" | head -n 1 || echo "")
if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME=$(docker ps --filter "name=snapchain" --format "{{.Names}}" 2>/dev/null | head -n 1 || echo "snapchain")
fi

# ------------------------------------------------------------------------------
# 5. Live Snapshot Download & Sync Monitor
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}• Monitoring Snapchain snapshot download & network sync...${NC}"
echo -e "  ${YELLOW}Notice: Snapshot download and RocksDB extraction will take several minutes.${NC}"
echo -e "  (Press ${BOLD}Ctrl+C${NC} anytime to detach; the node will continue syncing in Docker in background)\n"

START_TIME=$(date +%s)
PREV_TIME=$START_TIME
PREV_BYTES=0
SPEED=0
SYNCED=false

# Clean detach on Ctrl+C without breaking the background Docker containers
trap 'echo -e "\n\n${YELLOW}[!] Detached from live monitor. Node is actively syncing in Docker.${NC}\nCheck sync logs anytime: ${BOLD}docker logs -f ${CONTAINER_NAME}${NC}\n"; exit 0' INT

while true; do
    # Check if the HTTP API has initialized and is responding
    if curl -s -m 2 http://localhost:3381/v1/info > /dev/null 2>&1; then
        SYNCED=true
        break
    fi

    # Ensure container is still running
    if ! docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" -q 2>/dev/null | grep -q .; then
        echo -e "\n${RED}${BOLD}[ERROR] Container ${CONTAINER_NAME} stopped unexpectedly.${NC}"
        echo -e "${YELLOW}Latest container logs:${NC}"
        docker logs --tail 25 "${CONTAINER_NAME}" 2>&1 || true
        exit 1
    fi

    # Sample Network RX bytes from inside container /proc/net/dev
    CURRENT_NET=0
    CURRENT_NET=$(docker exec "${CONTAINER_NAME}" awk '/eth0:/ {print $2}' /proc/net/dev 2>/dev/null || echo 0)
    if ! [[ "$CURRENT_NET" =~ ^[0-9]+$ ]]; then
        CURRENT_NET=0
    fi

    # Sample Host Disk Size inside target Snapchain directory
    CURRENT_DISK=$(du -sk "${SNAPCHAIN_DIR}/.rocks.snapshot" "${SNAPCHAIN_DIR}/.rocks" 2>/dev/null | awk '{sum+=$1} END {print sum*1024}' || echo 0)
    if ! [[ "$CURRENT_DISK" =~ ^[0-9]+$ ]] || [ "$CURRENT_DISK" -eq 0 ]; then
        CURRENT_DISK=$(du -sk "${SNAPCHAIN_DIR}" 2>/dev/null | awk '{sum+=$1} END {print sum*1024}' || echo 0)
    fi
    if ! [[ "$CURRENT_DISK" =~ ^[0-9]+$ ]]; then
        CURRENT_DISK=0
    fi

    # Reference bytes for speed calculation
    TRACKED_BYTES="$CURRENT_NET"
    if [ "$TRACKED_BYTES" -eq 0 ]; then
        TRACKED_BYTES="$CURRENT_DISK"
    fi

    NOW=$(date +%s)
    DELTA_TIME=$(( NOW - PREV_TIME ))
    if [ "$DELTA_TIME" -ge 2 ]; then
        if [ "$PREV_BYTES" -gt 0 ] && [ "$TRACKED_BYTES" -ge "$PREV_BYTES" ]; then
            SPEED=$(( (TRACKED_BYTES - PREV_BYTES) / DELTA_TIME ))
        else
            SPEED=0
        fi
        PREV_BYTES="$TRACKED_BYTES"
        PREV_TIME="$NOW"
    fi

    TOTAL_ELAPSED=$(( NOW - START_TIME ))
    MINS=$(( TOTAL_ELAPSED / 60 ))
    SECS=$(( TOTAL_ELAPSED % 60 ))

    NET_STR=$(format_bytes "$CURRENT_NET")
    DISK_STR=$(format_bytes "$CURRENT_DISK")
    SPEED_STR=$(format_speed "$SPEED")

    # Check if chunk progress is reported in snapshot metadata
    PROGRESS_DETAIL=""
    META_FILE="${SNAPCHAIN_DIR}/.rocks.snapshot/metadata.json"
    if [ -f "$META_FILE" ]; then
        TOTAL_CHUNKS=$(grep -o '"chunk"' "$META_FILE" 2>/dev/null | wc -l || echo 0)
        DONE_CHUNKS=$(ls -1 "${SNAPCHAIN_DIR}/.rocks.snapshot" 2>/dev/null | grep -c -E "\.chunk|\.tar|\.zst" || echo 0)
        if [ "$TOTAL_CHUNKS" -gt 0 ] 2>/dev/null && [ "$DONE_CHUNKS" -gt 0 ] 2>/dev/null; then
            PCT=$(( DONE_CHUNKS * 100 / TOTAL_CHUNKS ))
            PROGRESS_DETAIL="[Chunks: ${DONE_CHUNKS}/${TOTAL_CHUNKS} - ${PCT}%]"
        fi
    fi

    # Print live progress line with in-place carriage return
    printf "\r  ${CYAN}➤ Net DL:${NC} %-9s | ${GREEN}Disk:${NC} %-9s | ${YELLOW}Speed:${NC} %-10s | ${BLUE}Time:${NC} %02d:%02d %-24s" \
        "$NET_STR" "$DISK_STR" "$SPEED_STR" "$MINS" "$SECS" "$PROGRESS_DETAIL"

    sleep 2
done

# Clear the progress line
printf "\r%100s\r" " "

TOTAL_TIME=$(( $(date +%s) - START_TIME ))
TOTAL_MINS=$(( TOTAL_TIME / 60 ))
TOTAL_SECS=$(( TOTAL_TIME % 60 ))

echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✓ Snapchain Read Node is UP and SYNCHRONIZED! (${TOTAL_MINS}m ${TOTAL_SECS}s)       ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"

echo -e "\n${BLUE}Node Health Summary (http://localhost:3381/v1/info):${NC}"
curl -s http://localhost:3381/v1/info | jq '.' 2>/dev/null || curl -s http://localhost:3381/v1/info
echo -e "\n${GREEN}Endpoints available:${NC}"
echo -e "  - HTTP API (Reads & submitMessage writes): ${BOLD}http://localhost:3381${NC}"
echo -e "  - gRPC API:                               ${BOLD}localhost:3383${NC}"
echo -e "  - P2P Gossip Mesh:                        ${BOLD}0.0.0.0:3382 (UDP/QUIC & TCP)${NC}"
echo -e "  - Metrics / Grafana Dashboard:            ${BOLD}http://localhost:3005${NC} (admin/admin)"
echo -e "\nTo inspect live peer connections and logs:"
echo -e "  ${BOLD}docker logs -f ${CONTAINER_NAME}${NC} or ${BOLD}cd ${SNAPCHAIN_DIR} && ./snapchain.sh logs${NC}"

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✓ Step (1) Complete: Standalone Read Node is fully operational!${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}\n"

# ------------------------------------------------------------------------------
# 6. Interactive Prompt to Execute Step (2) Automatically
# ------------------------------------------------------------------------------
AUTO_STEP2=$(prompt_user "Would you like to automatically launch Step (2) [Sovereign Client & Web UI] now? [Y/n]: " "y")

case "$AUTO_STEP2" in
    [yY]|[yY][eE][sS])
        echo -e "\n${CYAN}${BOLD}Launching Step (2): Setting up Sovereign Web Client & CLI...${NC}\n"
        if [ -f "./scripts/2-create-client.sh" ]; then
            exec bash "./scripts/2-create-client.sh"
        elif [ -f "./2-create-client.sh" ]; then
            exec bash "./2-create-client.sh"
        else
            exec bash -c "$(curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh)"
        fi
        ;;
    *)
        echo -e "\nNext step: Run Command (2) whenever you are ready to launch your Client & Web UI:"
        echo -e "${CYAN}${BOLD}curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash${NC}\n"
        ;;
esac
