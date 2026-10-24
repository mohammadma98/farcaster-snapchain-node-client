#!/usr/bin/env bash
# ==============================================================================
# Command (1): Set up a Snapchain Read Node
# Part of Farcaster Client & Node Suite (MIT License)
# Repository: https://github.com/mohammadma98/farcaster-snapchain-node-client
#
# Properties:
# - ZERO 3rd-party API keys required (no Alchemy, Infura, or Neynar keys needed)
# - Adaptive Matrix Architecture (Integrated with Step 0 hardware profiling)
# - RAM-Assisted Concurrent Chunk Streaming Pipeline (Reduces peak disk usage from 1.4 TB to ~500 GB)
# - Observability & Metrics Stack (Configured in Step 0)
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
echo -e "${BLUE}${BOLD}        [Step 2/3] Set up Standalone Snapchain Read Node        ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

# Helper function to read user input interactively even when piped via curl | bash
prompt_user() {
    local prompt_msg="$1"
    local default_val="$2"
    local response=""

    # Support automated non-interactive overrides
    if [ "${FORCE:-false}" == "true" ] || [ "${ASSUME_YES:-false}" == "true" ] || [ "${FORCE_INSTALL:-false}" == "true" ]; then
        echo "$default_val"
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
# Intelligent Docker Runtime Resolver (Sudo Detection & Compose V1/V2 Support)
# ------------------------------------------------------------------------------
DOCKER_BIN="docker"
COMPOSE_CMD="docker compose"

resolve_docker_runtime() {
    # 1. Determine if docker commands require sudo or daemon activation
    if docker info > /dev/null 2>&1; then
        DOCKER_BIN="docker"
    elif command -v sudo &> /dev/null && sudo docker info > /dev/null 2>&1; then
        DOCKER_BIN="sudo docker"
    else
        # Attempt to activate Docker daemon service if dormant
        if command -v systemctl &> /dev/null; then
            if command -v sudo &> /dev/null; then
                sudo systemctl enable --now docker > /dev/null 2>&1 || true
            else
                systemctl enable --now docker > /dev/null 2>&1 || true
            fi
        elif command -v service &> /dev/null; then
            if command -v sudo &> /dev/null; then
                sudo service docker start > /dev/null 2>&1 || true
            else
                service docker start > /dev/null 2>&1 || true
            fi
        fi
        sleep 2
        if docker info > /dev/null 2>&1; then
            DOCKER_BIN="docker"
        elif command -v sudo &> /dev/null && sudo docker info > /dev/null 2>&1; then
            DOCKER_BIN="sudo docker"
        else
            echo -e "${RED}[ERROR] Docker daemon is not active or accessible. Please verify Docker installation.${NC}"
            exit 1
        fi
    fi

    # 2. Determine Compose syntax: 'docker compose' (V2 plugin) vs 'docker-compose' (V1 standalone)
    if $DOCKER_BIN compose version > /dev/null 2>&1; then
        COMPOSE_CMD="$DOCKER_BIN compose"
    elif command -v docker-compose &> /dev/null && docker-compose version > /dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    elif command -v sudo &> /dev/null && sudo docker-compose version > /dev/null 2>&1; then
        COMPOSE_CMD="sudo docker-compose"
    else
        # Auto-fallback: attempt to install docker-compose-plugin
        if command -v apt-get &> /dev/null; then
            if command -v sudo &> /dev/null; then
                sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq > /dev/null 2>&1 || true
                sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1 || true
            else
                DEBIAN_FRONTEND=noninteractive apt-get update -qq > /dev/null 2>&1 || true
                DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1 || true
            fi
        fi
        if $DOCKER_BIN compose version > /dev/null 2>&1; then
            COMPOSE_CMD="$DOCKER_BIN compose"
        else
            COMPOSE_CMD="$DOCKER_BIN compose"
        fi
    fi
}

# ------------------------------------------------------------------------------
# 1. Verify Step (0) Provisioning State & Load Matrix Profiles
# ------------------------------------------------------------------------------
CONFIG_FILE="/etc/snapchain/snapchain.conf"
if [ ! -f "$CONFIG_FILE" ] && [ -f "${HOME}/.snapchain.conf" ]; then
    CONFIG_FILE="${HOME}/.snapchain.conf"
fi

PROVISIONED=false
if [ -f "$CONFIG_FILE" ]; then
    # shellcheck source=/dev/null
    source "$CONFIG_FILE" 2>/dev/null || true
fi

if [ "${PROVISIONED:-false}" != "true" ]; then
    echo -e "\n${YELLOW}${BOLD}================================================================${NC}"
    echo -e "${YELLOW}${BOLD}  ⚠ Notice: Step (0) [Compute Provisioning] Required First      ${NC}"
    echo -e "${YELLOW}${BOLD}================================================================${NC}"
    echo -e "${YELLOW}Step (0) has not been executed yet on this server.${NC}"
    echo -e "You must run Command (0) first to prepare hardware profiles, allocate storage,"
    echo -e "tune Linux kernel socket buffers, and install container runtimes.\n"

    RUN_STEP0=$(prompt_user "Would you like to automatically run Step (0) [Provision Compute] now? [Y/n]: " "y")
    case "$RUN_STEP0" in
        [yY]|[yY][eE][sS])
            echo -e "\n${CYAN}${BOLD}Launching Step (0): Provisioning Compute & Storage Matrix...${NC}\n"
            if [ -f "./scripts/0-provision-compute.sh" ]; then
                exec bash "./scripts/0-provision-compute.sh"
            elif [ -f "./0-provision-compute.sh" ]; then
                exec bash "./0-provision-compute.sh"
            elif [ -f "${HOME}/farcaster-snapchain-node-client/scripts/0-provision-compute.sh" ]; then
                exec bash "${HOME}/farcaster-snapchain-node-client/scripts/0-provision-compute.sh"
            else
                TMP_STEP0=$(mktemp /tmp/snapchain_step0.XXXXXX.sh)
                curl -fsSL "https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh?v=$(date +%s)" -o "$TMP_STEP0"
                chmod +x "$TMP_STEP0"
                exec bash "$TMP_STEP0"
            fi
            ;;
        *)
            echo -e "\n${RED}[ABORTED] Please run Command (0) first to prepare this server:${NC}"
            echo -e "${CYAN}${BOLD}curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash${NC}\n"
            exit 1
            ;;
    esac
fi

PROFILE_CPU="${PROFILE_CPU:-C2}"
PROFILE_RAM="${PROFILE_RAM:-R2}"
PROFILE_DISK="${PROFILE_DISK:-D2}"
DISK_TYPE="${DISK_TYPE:-SSD}"

echo -e "System Matrix Classification:"
echo -e "  - CPU Profile:     ${BOLD}[${PROFILE_CPU}]${NC} (${CPU_CORES:-1} Cores)"
echo -e "  - RAM Profile:     ${BOLD}[${PROFILE_RAM}]${NC} (${RAM_GB:-4} GB RAM, ZRAM: ${ZRAM_ACTIVE:-false})"
echo -e "  - Storage Profile: ${BOLD}[${PROFILE_DISK}]${NC} (${DISK_TYPE} on ${STORAGE_DEVICE:-unknown})"
echo -e "  - Target Data Dir: ${BOLD}${SNAPCHAIN_DATA_DIR:-${HOME}/snapchain}${NC}\n"

# ------------------------------------------------------------------------------
# 2. Observability & Metrics Stack Configuration (Configured in Step 0)
# ------------------------------------------------------------------------------
METRICS_ACTIVE="${METRICS_ACTIVE:-${ENABLE_METRICS:-false}}"
if [ "$METRICS_ACTIVE" != "true" ] && [ "$METRICS_ACTIVE" != "false" ]; then
    case "$METRICS_ACTIVE" in
        [yY]|[yY][eE][sS]) METRICS_ACTIVE=true ;;
        *) METRICS_ACTIVE=false ;;
    esac
fi

echo -e "${CYAN}${BOLD}[Component Configuration] Monitoring & Observability Stack${NC}"
if [ "$METRICS_ACTIVE" == "true" ]; then
    echo -e "  ${GREEN}✓ Metrics stack enabled (Grafana on port 3005).${NC}\n"
else
    echo -e "  ${GREEN}✓ Running in Lean Mode: Metrics disabled to preserve host resources.${NC}\n"
fi

# ------------------------------------------------------------------------------
# 3. Setup Target Directory & Pull Official Manifests
# ------------------------------------------------------------------------------
SNAPCHAIN_DIR="${SNAPCHAIN_DATA_DIR:-${HOME}/snapchain}"
NODE_OPERATOR_FID="${1:-2}"

if ! mkdir -p "$SNAPCHAIN_DIR" 2>/dev/null; then
    echo -e "\n${RED}[ERROR] Failed to create directory: ${SNAPCHAIN_DIR}${NC}"
    echo -e "${YELLOW}The underlying mount or storage volume appears to be Read-Only (ro) or inaccessible.${NC}"
    exit 1
fi

if ! cd "$SNAPCHAIN_DIR" 2>/dev/null; then
    echo -e "\n${RED}[ERROR] Cannot enter target directory: ${SNAPCHAIN_DIR}${NC}"
    exit 1
fi

# Pre-flight write check to catch read-only mounts, permission issues, or full disks before curl
if ! touch .write_test 2>/dev/null; then
    MOUNT_PT=$(df -P "$SNAPCHAIN_DIR" 2>/dev/null | awk 'NR==2 {print $6}')
    echo -e "\n${RED}[ERROR] Target directory is NOT writable: ${SNAPCHAIN_DIR}${NC}"
    echo -e "${YELLOW}Common causes on this host:${NC}"
    echo -e "  1. Storage volume (${MOUNT_PT}) is mounted Read-Only (ro)."
    echo -e "     Fix: mount -o remount,rw ${MOUNT_PT}"
    echo -e "  2. Disk is 100% full or out of inodes (check: df -h '${SNAPCHAIN_DIR}' / df -i '${SNAPCHAIN_DIR}')."
    echo -e "  3. Filesystem corruption forced kernel into safety read-only mode (check: dmesg | grep -iE 'ext4|error|sdb')."
    exit 1
fi
rm -f .write_test 2>/dev/null || true

# ------------------------------------------------------------------------------
# Pre-Flight State & Database Inspection
# ------------------------------------------------------------------------------
resolve_docker_runtime

WORKER_PID_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.pid"
WORKER_STATUS_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.status"
WORKER_DONE_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.done"
WORKER_LOG_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.log"

WORKER_PID=$(cat "$WORKER_PID_FILE" 2>/dev/null || echo "")
IS_WORKER_ACTIVE=false
if [ -n "$WORKER_PID" ] && kill -0 "$WORKER_PID" 2>/dev/null; then
    IS_WORKER_ACTIVE=true
fi

# Check if node container is already running or database is already fully materialized
CONTAINER_NAME=$($DOCKER_BIN ps --filter "name=snapchain" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -E "snapchain.*snapchain|snapchain" | head -n 1 || echo "")
CONTAINER_RUNNING=false
if [ -n "$CONTAINER_NAME" ]; then
    CONTAINER_RUNNING=true
fi

HTTP_API_ACTIVE=false
if curl -fs -m 2 http://localhost:3381/v1/info >/dev/null 2>&1; then
    HTTP_API_ACTIVE=true
fi

ALL_SHARDS_DONE=true
for s in 0 1 2; do
    s_dir="${SNAPCHAIN_DIR}/.rocks/shard-${s}"
    s_done="${SNAPCHAIN_DIR}/.rocks/.shard_${s}.complete"
    if [ ! -f "$s_done" ] || [ ! -d "$s_dir" ]; then
        ALL_SHARDS_DONE=false
    fi
done

# Priority 1: If database is already complete or container is running, PROTECT existing database & skip sync
if [ "$ALL_SHARDS_DONE" == "true" ] || { [ "$CONTAINER_RUNNING" == "true" ] && [ "$HTTP_API_ACTIVE" == "true" ]; }; then
    DB_SIZE="Unknown"
    if [ -d "${SNAPCHAIN_DIR}/.rocks" ]; then
        DB_SIZE=$(du -sh "${SNAPCHAIN_DIR}/.rocks" 2>/dev/null | awk '{print $1}')
    fi
    echo -e "\n${GREEN}${BOLD}================================================================${NC}"
    echo -e "${GREEN}${BOLD}  ✓ Existing Snapchain node and RocksDB database detected!      ${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}"
    echo -e "  • Database Path:   ${BOLD}${SNAPCHAIN_DIR}/.rocks${NC} (Shards 0, 1, 2 verified)"
    echo -e "  • Database Size:   ${BOLD}${DB_SIZE}${NC} on disk"
    echo -e "  • Container State: $( [ "$CONTAINER_RUNNING" == "true" ] && echo -e "${GREEN}Running (snapchain)${NC}" || echo -e "${YELLOW}Stopped${NC}" )"
    echo -e "  • HTTP Endpoint:   $( [ "$HTTP_API_ACTIVE" == "true" ] && echo -e "${GREEN}http://localhost:3381 (HTTP 200 OK)${NC}" || echo -e "${YELLOW}Starting up${NC}" )"
    echo -e "\n  Notice: Skipping snapshot download to protect existing database."

    # Ensure container is started if stopped
    if [ "$CONTAINER_RUNNING" != "true" ] && [ -f "${SNAPCHAIN_DIR}/docker-compose.yml" ]; then
        echo -e "  • Starting Snapchain Docker container..."
        $COMPOSE_CMD up -d >/dev/null 2>&1 || true
    fi

    echo -e "\n${GREEN}${BOLD}================================================================${NC}"
    echo -e "${GREEN}${BOLD}  ✓ Step (2/3) Complete: Existing Read Node verified and active. ${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}\n"

    echo -e "${CYAN}${BOLD}• Automatically proceeding to Step (3/3) [Launch Web Client & Dashboard]...${NC}\n"

    if [ -f "./scripts/2-create-client.sh" ]; then
        exec bash "./scripts/2-create-client.sh"
    elif [ -f "./2-create-client.sh" ]; then
        exec bash "./2-create-client.sh"
    elif [ -f "${HOME}/farcaster-snapchain-node-client/scripts/2-create-client.sh" ]; then
        exec bash "${HOME}/farcaster-snapchain-node-client/scripts/2-create-client.sh"
    else
        TMP_SCRIPT=$(mktemp /tmp/snapchain_step2.XXXXXX.sh)
        curl -fsSL "https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh?v=$(date +%s)" -o "$TMP_SCRIPT"
        chmod +x "$TMP_SCRIPT"
        exec bash "$TMP_SCRIPT"
    fi
fi

# Priority 2: Storage capacity validation (only if worker is NOT actively running)
if [ "$IS_WORKER_ACTIVE" != "true" ]; then
    COMPLETED_SHARDS_COUNT=0
    for s in 0 1 2; do
        if [ -f "${SNAPCHAIN_DIR}/.rocks/.shard_${s}.complete" ] && [ -d "${SNAPCHAIN_DIR}/.rocks/shard-${s}" ]; then
            COMPLETED_SHARDS_COUNT=$(( COMPLETED_SHARDS_COUNT + 1 ))
        fi
    done
    REMAINING_SHARDS=$(( 3 - COMPLETED_SHARDS_COUNT ))
    REQUIRED_GB=$(( REMAINING_SHARDS * 200 ))
    if [ "$COMPLETED_SHARDS_COUNT" -eq 0 ]; then
        REQUIRED_GB=600
    elif [ "$REQUIRED_GB" -lt 150 ]; then
        REQUIRED_GB=150
    fi

    FREE_GB=$(df -P -BG "$SNAPCHAIN_DIR" 2>/dev/null | awk 'NR==2 {gsub(/[^0-9]/,"",$4); print $4+0}')
    if [ "$FREE_GB" -lt "$REQUIRED_GB" ]; then
        echo -e "\n${RED}${BOLD}================================================================${NC}"
        echo -e "${RED}${BOLD}  [ERROR] INSUFFICIENT STORAGE SPACE (${FREE_GB} GB < ${REQUIRED_GB} GB)   ${NC}"
        echo -e "${RED}${BOLD}================================================================${NC}"
        echo -e "${RED}Available storage on target: ${FREE_GB} GB${NC}"
        echo -e "${RED}Minimum required storage:    ${REQUIRED_GB} GB${NC}"
        echo -e "${RED}A minimum of 600 GB free disk space is strictly required for fresh installation.${NC}"
        echo -e "${RED}Setup aborted to protect host storage from exhaustion.${NC}"
        echo -e "${RED}${BOLD}================================================================${NC}\n"
        exit 1
    fi
fi

# Clean up broken directory artifacts if created by Docker volume mounts
[ -d "snapchain.sh" ] && rm -rf "snapchain.sh" 2>/dev/null || true
[ -d "docker-compose.yml" ] && rm -rf "docker-compose.yml" 2>/dev/null || true
[ -d "validators.toml" ] && rm -rf "validators.toml" 2>/dev/null || true

echo -e "${YELLOW}[1/4] Pulling node manifests & management scripts...${NC}"
curl -fsSL -o snapchain.sh https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/scripts/snapchain.sh
chmod +x snapchain.sh

cat <<EOF > .env
## Snapchain Read Node Configuration (Zero API Keys)
AGREE_NO_REWARDS_FOR_ME=true
HUB_OPERATOR_FID=${NODE_OPERATOR_FID}
SKIP_CRONTAB=false
GRAFANA_CREDS=admin:admin
EOF

curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/docker-compose.mainnet.yml
curl -fsSL -o validators.toml https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/validators.toml

# ------------------------------------------------------------------------------
# 4. Tailor Docker Compose Configuration & Resource Ceilings
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/4] Tailoring container definitions to system profile...${NC}"

# If metrics are disabled, strip statsd and grafana services from compose
if [ "$METRICS_ACTIVE" != "true" ]; then
    # Strip statsd and grafana service blocks cleanly
    python3 -c "
with open('docker-compose.yml', 'r') as f:
    lines = f.readlines()
out = []
skip = False
for line in lines:
    stripped = line.strip()
    is_top_level = bool(stripped) and not stripped.startswith('#') and not line.startswith((' ', '\t'))
    is_service = line.startswith('  ') and not line.startswith('   ') and stripped.endswith(':') and not stripped.startswith('#')

    if is_top_level:
        skip = False
    elif is_service:
        if line.startswith('  statsd:') or line.startswith('  grafana:'):
            skip = True
            continue
        else:
            skip = False
    elif stripped.startswith('#') and ('statsd' in stripped.lower() or 'grafana' in stripped.lower()):
        continue

    if not skip:
        out.append(line)

with open('docker-compose.yml', 'w') as f:
    f.writelines(out)
" 2>/dev/null || true

    # Point statsd to local loopback UDP sink so Rust prefix validation passes without running external metrics containers
    sed -i 's/addr="statsd:8125"/addr="127.0.0.1:8125"/g' docker-compose.yml 2>/dev/null || true
else
    # Remap Grafana port to 3005 to reserve 3000 for Farcaster Web Client
    sed -i 's/3000:3000/3005:3000/g' docker-compose.yml 2>/dev/null || true
    mkdir -p grafana
    curl -sSL -o grafana/grafana-dashboard.json https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/grafana/grafana-dashboard.json 2>/dev/null || true
    curl -sSL -o grafana/grafana.ini https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/grafana/grafana.ini 2>/dev/null || true
fi

# Inject Adaptive Docker Resource Constraints based on CPU/RAM Matrix
DOCKER_CPU_LIMIT=""
DOCKER_MEM_LIMIT=""

if [ "$PROFILE_CPU" == "C1" ]; then
    DOCKER_CPU_LIMIT="cpus: '0.90'"
fi

if [ "$PROFILE_RAM" == "R1" ]; then
    DOCKER_MEM_LIMIT="mem_limit: 3000m"
elif [ "$PROFILE_RAM" == "R2" ]; then
    DOCKER_MEM_LIMIT="mem_limit: 6500m"
fi

if [ -n "$DOCKER_CPU_LIMIT" ] || [ -n "$DOCKER_MEM_LIMIT" ]; then
    python3 -c "
import sys
with open('docker-compose.yml', 'r') as f:
    content = f.read()

limits = []
if '$DOCKER_CPU_LIMIT':
    limits.append('    $DOCKER_CPU_LIMIT')
if '$DOCKER_MEM_LIMIT':
    limits.append('    $DOCKER_MEM_LIMIT')

if limits and 'ulimits:' in content:
    limit_block = '\n'.join(limits) + '\n'
    content = content.replace('    ulimits:', limit_block + '    ulimits:')
    with open('docker-compose.yml', 'w') as f:
        f.write(content)
" 2>/dev/null || true
    echo -e "  ${GREEN}✓ Injected Docker resource safety guard: ${DOCKER_CPU_LIMIT:-} ${DOCKER_MEM_LIMIT:-}${NC}"
fi

# ------------------------------------------------------------------------------
# 5. Detached RAM-Assisted Concurrent Chunk Streaming Pipeline (SSH-Independent)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[3/4] Evaluating Database State & Initializing Snapshot Pipeline...${NC}"

mkdir -p "${SNAPCHAIN_DIR}/.rocks"

# Check if all shards (0, 1, 2) are already fully materialized and verified on disk
ALL_SHARDS_DONE=true
for s in 0 1 2; do
    s_dir="${SNAPCHAIN_DIR}/.rocks/shard-${s}"
    s_done="${SNAPCHAIN_DIR}/.rocks/.shard_${s}.complete"
    if [ ! -f "$s_done" ] || [ ! -d "$s_dir" ]; then
        ALL_SHARDS_DONE=false
    fi
done

if [ "$ALL_SHARDS_DONE" == "true" ]; then
    echo -e "  ${GREEN}✓ All Snapshot Shards (0, 1, 2) already materialized on disk. Skipping initial sync.${NC}"
    sed -i 's/load_db_from_snapshot=true/load_db_from_snapshot=false/g' docker-compose.yml 2>/dev/null || true
    echo -e "  ${GREEN}✓ Database state synchronized. Ready for container launch.${NC}"
else
    # Check if a detached background worker is already running
    WORKER_PID_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.pid"
    WORKER_STATUS_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.status"
    WORKER_DONE_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.done"
    WORKER_LOG_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.log"

    WORKER_PID=$(cat "$WORKER_PID_FILE" 2>/dev/null || echo "")
    IS_RUNNING=false
    if [ -n "$WORKER_PID" ] && kill -0 "$WORKER_PID" 2>/dev/null; then
        IS_RUNNING=true
    fi

    if [ "$IS_RUNNING" == "true" ]; then
        echo -e "  ${GREEN}✓ Active background snapshot pipeline detected (PID: ${WORKER_PID}). Attaching to live progress monitor...${NC}"
        echo -e "    ${CYAN}Tip: Press Ctrl+C at any time to detach or stop the sync.${NC}\n"
    else
        # Accelerate multi-core decompression with pigz if available
        if ! command -v pigz &>/dev/null && command -v apt-get &>/dev/null; then
            apt-get update -qq && apt-get install -y -qq pigz &>/dev/null || true
        fi

        # Generate the self-contained detached worker daemon script
        cat <<'WORKER_SCRIPT_EOF' > "${SNAPCHAIN_DIR}/.snapshot_worker.sh"
#!/usr/bin/env bash
set -uo pipefail

# Ignore SIGHUP and SIGINT so closing the terminal or pressing Ctrl+C in monitor never interrupts the daemon
trap '' HUP INT

SNAPCHAIN_DIR="${1:-${HOME}/snapchain}"
STATUS_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.status"
DONE_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.done"
PID_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.pid"
LOG_FILE="${SNAPCHAIN_DIR}/.snapshot_worker.log"

# ANSI Colors
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

format_bytes() {
    local b=${1:-0}
    if ! [[ "$b" =~ ^[0-9]+$ ]]; then b=0; fi
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
    if ! [[ "$bps" =~ ^[0-9]+$ ]]; then bps=0; fi
    if [ "$bps" -ge 1048576 ]; then
        awk -v b="$bps" 'BEGIN {printf "%.2f MB/s", b / 1048576}'
    elif [ "$bps" -ge 1024 ]; then
        awk -v b="$bps" 'BEGIN {printf "%.1f KB/s", b / 1024}'
    else
        echo "${bps} B/s"
    fi
}

update_status() {
    local msg="$1"
    echo -e "$msg" > "${STATUS_FILE}.tmp" && mv -f "${STATUS_FILE}.tmp" "$STATUS_FILE"
}

get_rx_bytes() {
    local sum=0
    for f in /sys/class/net/*/statistics/rx_bytes; do
        if [ -f "$f" ] && [[ "$f" != *"/lo/"* && "$f" != *"/docker"* && "$f" != *"/veth"* && "$f" != *"/br-"* ]]; then
            local val
            val=$(cat "$f" 2>/dev/null || echo 0)
            if [[ "$val" =~ ^[0-9]+$ ]]; then
                sum=$(( sum + val ))
            fi
        fi
    done
    if [ "$sum" -eq 0 ] && [ -f /proc/net/dev ]; then
        sum=$(awk -F'[: ]+' 'NR>2 && $2 !~ /^(lo|docker|veth|br-)/ {for(i=3;i<=NF;i++) if($i ~ /^[0-9]+$/){s+=$i; break}} END {print s+0}' /proc/net/dev 2>/dev/null || echo 0)
    fi
    echo "$sum"
}

get_cpu_stat() {
    local u=0 n=0 s=0 id=0 io=0 irq=0 sirq=0 st=0
    read -r _ u n s id io irq sirq st _ < /proc/stat 2>/dev/null || true
    u=${u:-0}; n=${n:-0}; s=${s:-0}; id=${id:-0}; io=${io:-0}; irq=${irq:-0}; sirq=${sirq:-0}; st=${st:-0}
    local tot=$(( u + n + s + id + io + irq + sirq + st ))
    local act=$(( tot - id - io ))
    echo "$tot $act $io"
}

get_mem_stat() {
    local tot
    local avail
    tot=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)
    avail=$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)
    tot=${tot:-0}
    avail=${avail:-0}
    local used=$(( tot - avail ))
    echo "$used $tot"
}

get_tar_write_bytes() {
    local pid="$1"
    local bytes=0
    if [ -n "$pid" ] && [ -f "/proc/${pid}/io" ]; then
        bytes=$(awk '/^write_bytes:/ {print $2; exit}' "/proc/${pid}/io" 2>/dev/null || echo 0)
    fi
    bytes=${bytes:-0}
    if ! [[ "$bytes" =~ ^[0-9]+$ ]] || [ "$bytes" -eq 0 ]; then
        bytes=$(df -B1 "${SNAPCHAIN_DIR}/.rocks" 2>/dev/null | awk 'NR==2 {print $3}' || echo 0)
    fi
    bytes=${bytes:-0}
    if ! [[ "$bytes" =~ ^[0-9]+$ ]]; then bytes=0; fi
    echo "$bytes"
}

R2_PUBLIC_BASE="https://pub-d352dd8819104a778e20d08888c5a661.r2.dev"
NETWORK_NAME="FARCASTER_NETWORK_MAINNET"
SHARDS=(0 1 2)
NUM_SHARDS=${#SHARDS[@]}

mkdir -p "${SNAPCHAIN_DIR}/.rocks"

PIPE_FIFO=""
TAR_PID=""
METRICS_PID=""
BUFFER_DIR=""
declare -A DL_PIDS=()
declare -A EXT_PIDS=()

cleanup_resources() {
    exec 3>&- 2>/dev/null || true
    [ -n "$METRICS_PID" ] && kill -9 "$METRICS_PID" 2>/dev/null || true
    [ -n "$PIPE_FIFO" ] && rm -f "$PIPE_FIFO" 2>/dev/null || true
    for p in "${DL_PIDS[@]}"; do
        [ -n "$p" ] && kill -9 "$p" 2>/dev/null || true
    done
    for p in "${EXT_PIDS[@]}"; do
        [ -n "$p" ] && kill -9 "$p" 2>/dev/null || true
    done
    [ -n "$TAR_PID" ] && kill -9 "$TAR_PID" 2>/dev/null || true
    [ -n "$BUFFER_DIR" ] && rm -rf "$BUFFER_DIR" 2>/dev/null || true
}
# Only clean up on SIGTERM (explicit termination request from monitor or system shutdown)
trap cleanup_resources TERM

for SHARD_ID in "${SHARDS[@]}"; do
    SHARD_DIR="${SNAPCHAIN_DIR}/.rocks/shard-${SHARD_ID}"
    SHARD_COMPLETE_FILE="${SNAPCHAIN_DIR}/.rocks/.shard_${SHARD_ID}.complete"
    SHARD_BYTES=0
    if [ -d "$SHARD_DIR" ]; then
        SHARD_BYTES=$(du -sb "$SHARD_DIR" 2>/dev/null | awk '{print $1}' || echo 0)
    fi

    # Deterministic Shard Verification: only skip if full extraction completed and verified
    if [ -f "$SHARD_COMPLETE_FILE" ] && [ -d "$SHARD_DIR" ] && [ "$SHARD_BYTES" -gt 1000000 ]; then
        update_status "  ${GREEN}✓ Shard ${SHARD_ID} already verified and materialized ($(format_bytes "$SHARD_BYTES")). Skipping.${NC}"
        continue
    elif [ "$SHARD_BYTES" -gt 0 ] || [ -d "$SHARD_DIR" ]; then
        update_status "  ${YELLOW}Notice: Cleaning up unverified/incomplete Shard ${SHARD_ID} state ($(format_bytes "$SHARD_BYTES"))...${NC}"
        rm -rf "$SHARD_DIR" "$SHARD_COMPLETE_FILE" 2>/dev/null || true
    fi

    SHARD_META_URL="${R2_PUBLIC_BASE}/${NETWORK_NAME}/${SHARD_ID}/latest.json"
    META_DATA=$(curl -fsSL --retry 5 --retry-connrefused --retry-delay 2 "$SHARD_META_URL" 2>/dev/null || echo "")
    if [ -z "$META_DATA" ]; then
        echo "[ERROR] Failed to fetch snapshot manifest for Shard ${SHARD_ID}" >> "$LOG_FILE"
        echo "ERROR" > "$DONE_FILE"
        exit 1
    fi

    KEY_BASE=$(python3 -c "import json; print(json.loads('''$META_DATA''')['key_base'])" 2>/dev/null || echo "")
    TOTAL_CHUNKS=$(python3 -c "import json; print(len(json.loads('''$META_DATA''')['chunks']))" 2>/dev/null || echo 0)

    if [ "$TOTAL_CHUNKS" -eq 0 ] || [ -z "$KEY_BASE" ]; then
        continue
    fi

    # Purge any leftover RAM/disk buffers from earlier aborted shards
    rm -rf /dev/shm/snapchain_shard_* /run/shm/snapchain_shard_* /tmp/snapchain_pipe_* /tmp/snapchain_shard_* 2>/dev/null || true

    BUFFER_DIR="/dev/shm/snapchain_shard_${SHARD_ID}_$$"
    SHM_AVAIL_MB=$(df -BM /dev/shm 2>/dev/null | awk 'NR==2 {print $4}' | tr -d 'M' || echo 0)
    if [ ! -d /dev/shm ] || [ "${SHM_AVAIL_MB:-0}" -lt 200 ]; then
        if [ -d /run/shm ]; then
            BUFFER_DIR="/run/shm/snapchain_shard_${SHARD_ID}_$$"
        else
            BUFFER_DIR="/tmp/snapchain_shard_${SHARD_ID}_$$"
        fi
    fi
    mkdir -p "$BUFFER_DIR"

    # Multi-Core Adaptive Extraction Worker Pool (Adaptive 1-4 workers tuned to host CPU cores)
    CPU_CORES=$(nproc 2>/dev/null || echo 1)
    if [ "$CPU_CORES" -lt 1 ]; then CPU_CORES=1; fi
    MAX_EXT_WORKERS=$(( CPU_CORES > 4 ? 4 : CPU_CORES ))

    # Network Ingestion Concurrency
    CONCURRENT_DOWNLOADS=4

    # High-efficiency 1-thread decompressor per pool worker to prevent thread thrashing
    DECOMPRESS_BIN="gzip -dc"
    if command -v pigz &>/dev/null; then
        DECOMPRESS_BIN="pigz -dc -p 1"
    fi

    # Dynamic Bounded Sliding Window Horizons (Keeps in-RAM memory strictly under ~900 MB)
    SHM_TOTAL_MB=$(df -BM "$BUFFER_DIR" 2>/dev/null | awk 'NR==2 {print $2}' | tr -d 'M' || echo 1024)
    if [ "${SHM_TOTAL_MB:-1024}" -lt 1500 ]; then
        MIN_FREE_RAM_MB=200
        RESUME_FREE_RAM_MB=350
        MAX_DL_LOOKAHEAD=3
        MAX_RAW_LOOKAHEAD=2
    else
        MIN_FREE_RAM_MB=500
        RESUME_FREE_RAM_MB=800
        MAX_DL_LOOKAHEAD=6
        MAX_RAW_LOOKAHEAD=3
    fi

    get_free_shm_mb() {
        local shm_free
        shm_free=$(df -BM "$BUFFER_DIR" 2>/dev/null | awk 'NR==2 {print $4}' | tr -d 'M' || echo 0)
        local host_avail
        host_avail=$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 99999)
        if [ "${shm_free:-0}" -lt "${host_avail:-0}" ]; then
            echo "${shm_free:-0}"
        else
            echo "${host_avail:-0}"
        fi
    }

    PIPE_FIFO="/tmp/snapchain_pipe_${SHARD_ID}_$$.fifo"
    rm -f "$PIPE_FIFO"
    mkfifo "$PIPE_FIFO"

    tar -b 2048 --no-same-owner -xf "$PIPE_FIFO" -C "${SNAPCHAIN_DIR}/.rocks" &
    TAR_PID=$!
    TAR_COMPLETED=false

    exec 3> "$PIPE_FIFO"
    python3 -c "import fcntl; fcntl.fcntl(3, 1031, 1048576)" 2>/dev/null || true

    CHUNK_LIST=$(python3 -c "import json; print(' '.join(json.loads('''$META_DATA''')['chunks']))")
    CHUNK_ARRAY=($CHUNK_LIST)

    START_TIME=$(date +%s)
    BYTES_PROCESSED=0

    declare -A DL_PIDS=()
    declare -A EXT_PIDS=()
    NEXT_DOWNLOAD_IDX=0
    NEXT_EXT_DISPATCH_IDX=0

    # Detect curl HTTP/2 multiplexed parallel transfer capability
    CURL_SUPPORTS_PARALLEL=false
    if curl --help all 2>/dev/null | grep -q -- '--parallel'; then
        CURL_SUPPORTS_PARALLEL=true
    fi

    # Initialize state sync files in buffer directory
    echo "0 0" > "${BUFFER_DIR}/.progress_sync"
    : > "${BUFFER_DIR}/.ext_stats"
    : > "${BUFFER_DIR}/.pipe_stats"

    # Stage 1: Resilient Network Ingestion Worker into RAM
    download_chunk() {
        local idx="$1"
        local chunk_name="$2"
        local chunk_url="$3"
        local comp_file="${BUFFER_DIR}/${chunk_name}"
        local size_file="${BUFFER_DIR}/.size_${idx}"

        touch "${BUFFER_DIR}/.dl_active_${idx}"

        local attempt=0
        while [ "$attempt" -lt 3 ]; do
            attempt=$(( attempt + 1 ))
            rm -f "${comp_file}.tmp" 2>/dev/null || true
            if curl -fsSL --retry 3 --retry-connrefused --retry-delay 2 -m 90 "$chunk_url" -o "${comp_file}.tmp" && [ -s "${comp_file}.tmp" ]; then
                mv -f "${comp_file}.tmp" "$comp_file"
                stat -c%s "$comp_file" > "$size_file" 2>/dev/null || echo 70209256 > "$size_file"
                rm -f "${BUFFER_DIR}/.dl_active_${idx}" 2>/dev/null || true
                touch "${BUFFER_DIR}/.dl_done_${idx}"
                return 0
            fi
            sleep 2
        done

        rm -f "${comp_file}.tmp" "${BUFFER_DIR}/.dl_active_${idx}" 2>/dev/null || true
        echo "[ERROR] Download failed for chunk ${chunk_name} after 3 attempts" >> "$LOG_FILE"
        touch "${BUFFER_DIR}/.err_${idx}"
        return 1
    }

    # Parallel HTTP/2 Connection-Pooling Batch Ingestor (reusing TLS sessions across chunks)
    download_batch() {
        local batch_indices=("$@")
        local curl_args=()
        local idx

        for idx in "${batch_indices[@]}"; do
            local chunk_name="${CHUNK_ARRAY[idx]}"
            local chunk_url="${R2_PUBLIC_BASE}/${KEY_BASE}/${chunk_name}"
            local comp_file="${BUFFER_DIR}/${chunk_name}"
            touch "${BUFFER_DIR}/.dl_active_${idx}"
            rm -f "${comp_file}.tmp" 2>/dev/null || true
            curl_args+=( -o "${comp_file}.tmp" "$chunk_url" )
        done

        # Multiplexed parallel transfer reusing underlying TLS connections over HTTP/2
        if curl -Z -fsSL --retry 3 --retry-connrefused --retry-delay 2 -m 180 "${curl_args[@]}" 2>/dev/null; then
            for idx in "${batch_indices[@]}"; do
                local chunk_name="${CHUNK_ARRAY[idx]}"
                local comp_file="${BUFFER_DIR}/${chunk_name}"
                local size_file="${BUFFER_DIR}/.size_${idx}"
                if [ -s "${comp_file}.tmp" ]; then
                    mv -f "${comp_file}.tmp" "$comp_file"
                    stat -c%s "$comp_file" > "$size_file" 2>/dev/null || echo 70209256 > "$size_file"
                    rm -f "${BUFFER_DIR}/.dl_active_${idx}" 2>/dev/null || true
                    touch "${BUFFER_DIR}/.dl_done_${idx}"
                else
                    # Fallback to single chunk download if incomplete
                    rm -f "${comp_file}.tmp" "${BUFFER_DIR}/.dl_active_${idx}" 2>/dev/null || true
                    local chunk_url="${R2_PUBLIC_BASE}/${KEY_BASE}/${chunk_name}"
                    download_chunk "$idx" "$chunk_name" "$chunk_url"
                fi
            done
        else
            # Resilient fallback: download any missing chunk individually
            for idx in "${batch_indices[@]}"; do
                local chunk_name="${CHUNK_ARRAY[idx]}"
                local comp_file="${BUFFER_DIR}/${chunk_name}"
                rm -f "${comp_file}.tmp" "${BUFFER_DIR}/.dl_active_${idx}" 2>/dev/null || true
                if [ ! -f "${BUFFER_DIR}/.dl_done_${idx}" ]; then
                    local chunk_url="${R2_PUBLIC_BASE}/${KEY_BASE}/${chunk_name}"
                    download_chunk "$idx" "$chunk_name" "$chunk_url"
                fi
            done
        fi
    }

    refill_download_queue() {
        local curr_consume_idx="${1:-0}"
        local max_dl_horizon=$(( curr_consume_idx + MAX_DL_LOOKAHEAD ))
        if [ "$max_dl_horizon" -gt "$TOTAL_CHUNKS" ]; then max_dl_horizon="$TOTAL_CHUNKS"; fi

        while [ "$NEXT_DOWNLOAD_IDX" -lt "$max_dl_horizon" ]; do
            # Dynamic RAM Backpressure Check: Never spill over to disk; pause if RAM headroom is low
            local free_mb
            free_mb=$(get_free_shm_mb)
            if [ "${free_mb:-0}" -lt "$MIN_FREE_RAM_MB" ]; then
                touch "${BUFFER_DIR}/.backpressure_paused"
                break
            else
                if [ -f "${BUFFER_DIR}/.backpressure_paused" ]; then
                    if [ "${free_mb:-0}" -ge "$RESUME_FREE_RAM_MB" ]; then
                        rm -f "${BUFFER_DIR}/.backpressure_paused" 2>/dev/null || true
                    else
                        break
                    fi
                fi
            fi

            # Count active downloads
            local active_downloads=0
            for d_idx in "${!DL_PIDS[@]}"; do
                local p="${DL_PIDS[$d_idx]}"
                if kill -0 "$p" 2>/dev/null; then
                    active_downloads=$(( active_downloads + 1 ))
                else
                    unset DL_PIDS["$d_idx"]
                fi
            done

            local available_slots=$(( CONCURRENT_DOWNLOADS - active_downloads ))
            if [ "$available_slots" -le 0 ]; then
                break
            fi

            local remaining_horizon=$(( max_dl_horizon - NEXT_DOWNLOAD_IDX ))
            if [ "$remaining_horizon" -le 0 ]; then
                break
            fi

            if [ "$CURL_SUPPORTS_PARALLEL" = "true" ] && [ "$available_slots" -ge 2 ] && [ "$remaining_horizon" -ge 2 ]; then
                # Determine batch size bounded by concurrency, horizon, and safe RAM lookahead (max 4 per batch)
                local batch_size="$available_slots"
                if [ "$batch_size" -gt "$remaining_horizon" ]; then batch_size="$remaining_horizon"; fi
                if [ "$batch_size" -gt 4 ]; then batch_size=4; fi

                local batch_indices=()
                local b
                for (( b=0; b<batch_size; b++ )); do
                    batch_indices+=( "$(( NEXT_DOWNLOAD_IDX + b ))" )
                done

                download_batch "${batch_indices[@]}" &
                local batch_pid=$!
                local b_idx
                for b_idx in "${batch_indices[@]}"; do
                    DL_PIDS["$b_idx"]=$batch_pid
                done
                NEXT_DOWNLOAD_IDX=$(( NEXT_DOWNLOAD_IDX + batch_size ))
            else
                # Single chunk download (or fallback if 1 slot / older curl)
                local chunk_name="${CHUNK_ARRAY[NEXT_DOWNLOAD_IDX]}"
                local chunk_url="${R2_PUBLIC_BASE}/${KEY_BASE}/${chunk_name}"
                download_chunk "$NEXT_DOWNLOAD_IDX" "$chunk_name" "$chunk_url" &
                DL_PIDS["$NEXT_DOWNLOAD_IDX"]=$!
                NEXT_DOWNLOAD_IDX=$(( NEXT_DOWNLOAD_IDX + 1 ))
            fi
        done
    }

    # Stage 2: Independent Extraction Worker Pool in RAM
    extract_chunk() {
        local idx="$1"
        local chunk_name="${CHUNK_ARRAY[idx]}"
        local comp_file="${BUFFER_DIR}/${chunk_name}"
        local raw_file="${BUFFER_DIR}/${chunk_name}.raw"
        local err_log="${BUFFER_DIR}/.ext_err_${idx}.log"

        # Idempotency guard: If raw file already materialized, exit cleanly
        if [ -f "$raw_file" ] && [ -s "$raw_file" ]; then
            touch "${BUFFER_DIR}/.ext_done_${idx}"
            rm -f "${BUFFER_DIR}/.ext_active_${idx}" "${BUFFER_DIR}/.ext_err_${idx}" "$err_log" 2>/dev/null || true
            return 0
        fi

        # Pre-flight check: If compressed file missing, check if already extracted or trigger recovery
        if [ ! -f "$comp_file" ] || [ ! -s "$comp_file" ]; then
            rm -f "${BUFFER_DIR}/.ext_active_${idx}" "${BUFFER_DIR}/.dl_done_${idx}" 2>/dev/null || true
            return 0
        fi

        local t_start
        t_start=$(date +%s%3N 2>/dev/null || date +%s)

        rm -f "${raw_file}.tmp" "$err_log" 2>/dev/null || true
        if $DECOMPRESS_BIN "$comp_file" > "${raw_file}.tmp" 2>"$err_log" && [ -s "${raw_file}.tmp" ]; then
            local t_end
            t_end=$(date +%s%3N 2>/dev/null || date +%s)
            mv -f "${raw_file}.tmp" "$raw_file"
            rm -f "$comp_file" "$err_log" 2>/dev/null || true           # INSTANT DELETION OF COMPRESSED CHUNK FROM RAM
            rm -f "${BUFFER_DIR}/.dl_done_${idx}" 2>/dev/null || true
            rm -f "${BUFFER_DIR}/.ext_active_${idx}" 2>/dev/null || true
            touch "${BUFFER_DIR}/.ext_done_${idx}"
            local raw_sz
            raw_sz=$(stat -c%s "$raw_file" 2>/dev/null || echo 0)
            echo "$idx $raw_sz $t_start $t_end" >> "${BUFFER_DIR}/.ext_stats"
        else
            rm -f "${raw_file}.tmp" 2>/dev/null || true
            rm -f "${BUFFER_DIR}/.ext_active_${idx}" 2>/dev/null || true

            # Defensive verification: If another worker completed the raw chunk, accept it
            if [ -f "$raw_file" ] && [ -s "$raw_file" ]; then
                touch "${BUFFER_DIR}/.ext_done_${idx}"
                rm -f "$err_log" 2>/dev/null || true
                return 0
            fi

            # Self-healing retry check: Retry download if chunk was partially received / corrupted
            local retry_count
            retry_count=$(cat "${BUFFER_DIR}/.ext_retry_${idx}" 2>/dev/null || echo 0)
            if [ "$retry_count" -lt 2 ]; then
                retry_count=$(( retry_count + 1 ))
                echo "$retry_count" > "${BUFFER_DIR}/.ext_retry_${idx}"
                rm -f "$comp_file" "$err_log" "${BUFFER_DIR}/.dl_done_${idx}" 2>/dev/null || true
                local chunk_url="${R2_PUBLIC_BASE}/${KEY_BASE}/${chunk_name}"
                download_chunk "$idx" "$chunk_name" "$chunk_url" &
                return 0
            fi

            local err_detail
            err_detail=$(cat "$err_log" 2>/dev/null | tr '\n' ' ' || echo "Decompression error")
            rm -f "$err_log" 2>/dev/null || true
            echo "[ERROR] Decompression failed for chunk ${chunk_name}: ${err_detail}" >> "$LOG_FILE"
            touch "${BUFFER_DIR}/.ext_err_${idx}"
        fi
        return 0
    }

    dispatch_extraction_workers() {
        local curr_consume_idx="${1:-0}"

        # Purge completed extraction workers from table
        local active_ext=0
        for e_idx in "${!EXT_PIDS[@]}"; do
            local p="${EXT_PIDS[$e_idx]}"
            if kill -0 "$p" 2>/dev/null; then
                active_ext=$(( active_ext + 1 ))
            else
                unset EXT_PIDS["$e_idx"]
            fi
        done

        # Bound extraction lookahead: do not exceed curr_consume_idx + MAX_RAW_LOOKAHEAD
        local max_ext_horizon=$(( curr_consume_idx + MAX_RAW_LOOKAHEAD ))
        if [ "$max_ext_horizon" -gt "$TOTAL_CHUNKS" ]; then max_ext_horizon="$TOTAL_CHUNKS"; fi

        # Keep dispatch pointer synchronized with consumption horizon
        if [ "$NEXT_EXT_DISPATCH_IDX" -lt "$curr_consume_idx" ]; then
            NEXT_EXT_DISPATCH_IDX="$curr_consume_idx"
        fi

        # Dispatch ready chunks between dispatch pointer and extraction horizon
        local scan_idx="$NEXT_EXT_DISPATCH_IDX"
        while [ "$active_ext" -lt "$MAX_EXT_WORKERS" ] && [ "$scan_idx" -lt "$max_ext_horizon" ] && [ "$scan_idx" -lt "$NEXT_DOWNLOAD_IDX" ]; do
            if [ -f "${BUFFER_DIR}/.dl_done_${scan_idx}" ] && [ ! -f "${BUFFER_DIR}/.ext_active_${scan_idx}" ] && [ ! -f "${BUFFER_DIR}/.ext_done_${scan_idx}" ] && [ ! -f "${BUFFER_DIR}/.injected_${scan_idx}" ]; then
                # Pre-fork atomic state reservation (eliminates race window)
                touch "${BUFFER_DIR}/.ext_active_${scan_idx}"
                extract_chunk "$scan_idx" &
                EXT_PIDS["$scan_idx"]=$!
                active_ext=$(( active_ext + 1 ))
            fi
            scan_idx=$(( scan_idx + 1 ))
        done

        # Advance NEXT_EXT_DISPATCH_IDX past already processed chunks
        while [ "$NEXT_EXT_DISPATCH_IDX" -lt "$TOTAL_CHUNKS" ] && { [ -f "${BUFFER_DIR}/.ext_done_${NEXT_EXT_DISPATCH_IDX}" ] || [ -f "${BUFFER_DIR}/.injected_${NEXT_EXT_DISPATCH_IDX}" ]; }; do
            NEXT_EXT_DISPATCH_IDX=$(( NEXT_EXT_DISPATCH_IDX + 1 ))
        done
    }

    # --------------------------------------------------------------------------
    # Real-Time Observability & Bottleneck Sampling Engine
    # --------------------------------------------------------------------------
    collect_live_metrics() {
        local shard_id="$1"
        local total_chunks="$2"
        local buf_dir="$3"
        local tar_pid="$4"
        local start_t="$5"
        local total_shards="${#SHARDS[@]}"

        local prev_time
        prev_time=$(date +%s)
        local prev_rx
        prev_rx=$(get_rx_bytes)

        local cpu_prev
        cpu_prev=$(get_cpu_stat)
        local prev_cpu_tot
        prev_cpu_tot=$(echo "$cpu_prev" | awk '{print $1}')
        local prev_cpu_act
        prev_cpu_act=$(echo "$cpu_prev" | awk '{print $2}')
        local prev_cpu_io
        prev_cpu_io=$(echo "$cpu_prev" | awk '{print $3}')

        local prev_tar_io
        prev_tar_io=$(get_tar_write_bytes "$tar_pid")
        local prev_ext_bytes=0
        local prev_inj_bytes=0

        local avg_chunk_comp=70362152
        local total_comp_est=$(( total_chunks * avg_chunk_comp ))

        # Send immediate initial status file so foreground monitor renders at second 0
        update_status "${BLUE}┌────────────────────────────────────────────────────────────────────────────┐${NC}\n$(printf "${BLUE}│${NC} %-74s ${BLUE}│${NC}\n" "SNAPCHAIN STREAMING PIPELINE - INITIALIZING OBSERVABILITY ENGINE...")\n${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"

        while kill -0 "$tar_pid" 2>/dev/null; do
            sleep 1
            local curr_time
            curr_time=$(date +%s)
            local delta_t=$(( curr_time - prev_time ))
            if [ "$delta_t" -le 0 ]; then delta_t=1; fi

            # 1. Network Rate & Active Downloads
            local curr_rx
            curr_rx=$(get_rx_bytes)
            local delta_rx=$(( curr_rx - prev_rx ))
            if [ "$delta_rx" -lt 0 ]; then delta_rx=0; fi
            local net_speed=$(( delta_rx / delta_t ))
            prev_rx="$curr_rx"

            local dl_active_cnt
            dl_active_cnt=$(find "$buf_dir" -maxdepth 1 -name '.dl_active_*' 2>/dev/null | wc -l || echo 0)

            # 2. Host CPU & Storage I/O Wait
            local cpu_curr
            cpu_curr=$(get_cpu_stat)
            local curr_cpu_tot
            curr_cpu_tot=$(echo "$cpu_curr" | awk '{print $1}')
            local curr_cpu_act
            curr_cpu_act=$(echo "$cpu_curr" | awk '{print $2}')
            local curr_cpu_io
            curr_cpu_io=$(echo "$cpu_curr" | awk '{print $3}')
            local delta_tot=$(( curr_cpu_tot - prev_cpu_tot ))
            local delta_act=$(( curr_cpu_act - prev_cpu_act ))
            local delta_io=$(( curr_cpu_io - prev_cpu_io ))
            local cpu_pct=0
            local iowait_pct=0
            if [ "$delta_tot" -gt 0 ]; then
                cpu_pct=$(( delta_act * 100 / delta_tot ))
                iowait_pct=$(( delta_io * 100 / delta_tot ))
            fi
            prev_cpu_tot="$curr_cpu_tot"
            prev_cpu_act="$curr_cpu_act"
            prev_cpu_io="$curr_cpu_io"

            # 3. Host System Memory & /dev/shm Buffer
            local mem_info
            mem_info=$(get_mem_stat)
            local mem_used_kb
            mem_used_kb=$(echo "$mem_info" | awk '{print $1}')
            local mem_tot_kb
            mem_tot_kb=$(echo "$mem_info" | awk '{print $2}')
            local mem_pct=0
            if [ "$mem_tot_kb" -gt 0 ]; then
                mem_pct=$(( mem_used_kb * 100 / mem_tot_kb ))
            fi
            local shm_tot
            shm_tot=$(df -B1 "$buf_dir" 2>/dev/null | awk 'NR==2 {print $2}' || echo 1)
            local shm_avail
            shm_avail=$(df -B1 "$buf_dir" 2>/dev/null | awk 'NR==2 {print $4}' || echo 1)
            local shm_used=$(( shm_tot - shm_avail ))
            local shm_pct=0
            if [ "$shm_tot" -gt 0 ]; then
                shm_pct=$(( shm_used * 100 / shm_tot ))
            fi

            # 4. RAM Chunk State Queues
            local wait_ext_cnt
            wait_ext_cnt=$(find "$buf_dir" -maxdepth 1 -name '.dl_done_*' 2>/dev/null | wc -l || echo 0)
            local wait_ext_bytes
            wait_ext_bytes=$(find "$buf_dir" -maxdepth 1 -name '*.bin' ! -name '*.tmp' -exec stat -c%s {} + 2>/dev/null | awk '{s+=$1} END {print s+0}')
            local ext_active_cnt
            ext_active_cnt=$(find "$buf_dir" -maxdepth 1 -name '.ext_active_*' 2>/dev/null | wc -l || echo 0)
            local ext_done_cnt
            ext_done_cnt=$(find "$buf_dir" -maxdepth 1 -name '*.raw' ! -name '*.tmp' 2>/dev/null | wc -l || echo 0)
            local ext_done_bytes
            ext_done_bytes=$(find "$buf_dir" -maxdepth 1 -name '*.raw' ! -name '*.tmp' -exec stat -c%s {} + 2>/dev/null | awk '{s+=$1} END {print s+0}')
            local is_ram_paused=false
            if [ -f "${buf_dir}/.backpressure_paused" ]; then
                is_ram_paused=true
            fi

            # 5. Extraction Throughput in RAM
            local curr_ext_bytes
            curr_ext_bytes=$(awk '{s+=$2} END {print s+0}' "${buf_dir}/.ext_stats" 2>/dev/null || echo 0)
            local delta_ext=$(( curr_ext_bytes - prev_ext_bytes ))
            local ext_speed=$(( delta_ext / delta_t ))
            prev_ext_bytes="$curr_ext_bytes"
            if [ "$ext_speed" -eq 0 ] && [ -f "${buf_dir}/.ext_stats" ]; then
                ext_speed=$(tail -n 1 "${buf_dir}/.ext_stats" 2>/dev/null | awk '{if($4>$3 && ($4-$3)>0) printf "%d", ($2*1000)/($4-$3); else print 0}')
            fi

            # 6. Pipeline FIFO Injection Throughput
            local curr_inj_bytes
            curr_inj_bytes=$(awk '{s+=$2} END {print s+0}' "${buf_dir}/.pipe_stats" 2>/dev/null || echo 0)
            local delta_inj=$(( curr_inj_bytes - prev_inj_bytes ))
            local inj_speed=$(( delta_inj / delta_t ))
            prev_inj_bytes="$curr_inj_bytes"
            if [ "$inj_speed" -eq 0 ] && [ -f "${buf_dir}/.pipe_stats" ]; then
                inj_speed=$(tail -n 1 "${buf_dir}/.pipe_stats" 2>/dev/null | awk '{if($4>$3 && ($4-$3)>0) printf "%d", ($2*1000)/($4-$3); else print 0}')
            fi

            # 7. Disk Write Speed
            local curr_tar_io
            curr_tar_io=$(get_tar_write_bytes "$tar_pid")
            local delta_tar=$(( curr_tar_io - prev_tar_io ))
            if [ "$delta_tar" -lt 0 ]; then delta_tar=0; fi
            local disk_write_speed=$(( delta_tar / delta_t ))
            prev_tar_io="$curr_tar_io"

            # 8. Overall Shard Progress & Time Remaining
            local prog_data
            prog_data=$(cat "${buf_dir}/.progress_sync" 2>/dev/null || echo "0 0")
            local done_cnt
            done_cnt=$(echo "$prog_data" | awk '{print $1}')
            local bytes_proc
            bytes_proc=$(echo "$prog_data" | awk '{print $2}')
            if [ -z "$done_cnt" ]; then done_cnt=0; fi
            if [ -z "$bytes_proc" ]; then bytes_proc=0; fi
            local pct=0
            if [ "$total_chunks" -gt 0 ]; then
                pct=$(( done_cnt * 100 / total_chunks ))
            fi
            local elapsed=$(( curr_time - start_t ))
            if [ "$elapsed" -le 0 ]; then elapsed=1; fi
            local avg_spd=$(( bytes_proc / elapsed ))
            local eta_str="--:--"
            if [ "$avg_spd" -gt 0 ] && [ "$bytes_proc" -lt "$total_comp_est" ]; then
                local rem_b=$(( total_comp_est - bytes_proc ))
                local rem_s=$(( rem_b / avg_spd ))
                eta_str=$(printf "%02dm:%02ds" $(( rem_s / 60 )) $(( rem_s % 60 )))
            fi

            local rocks_dir="${SNAPCHAIN_DIR}/.rocks/shard-${shard_id}"
            local rocks_sz=0
            if [ -d "$rocks_dir" ]; then
                rocks_sz=$(df -B1 "$rocks_dir" 2>/dev/null | awk 'NR==2 {print $3}' || echo 0)
            fi

            # 9. Intelligent Bottleneck Identification
            local bottleneck_title
            local bottleneck_desc

            if [ "$is_ram_paused" == "true" ]; then
                bottleneck_title="RAM BACKPRESSURE (DOWNLOAD PAUSED)"
                bottleneck_desc="RAM buffer reached safety headroom limit. Pausing download to preserve host memory."
            elif [ "$ext_done_cnt" -gt 0 ] && { [ "$iowait_pct" -ge 15 ] || [ "$disk_write_speed" -lt 25000000 ]; }; then
                bottleneck_title="DISK I/O BOUND"
                bottleneck_desc="Storage write is saturated (I/O Wait: ${iowait_pct}%, Disk: $(format_speed "$disk_write_speed"))."
            elif [ "$ext_active_cnt" -gt 0 ] && [ "$cpu_pct" -ge 85 ] && [ "$ext_done_cnt" -eq 0 ]; then
                bottleneck_title="CPU DECOMPRESSION BOUND"
                bottleneck_desc="Decompression pool (${ext_active_cnt}/${MAX_EXT_WORKERS} workers) utilizing CPU (${cpu_pct}% CPU)."
            elif [ "$dl_active_cnt" -gt 0 ] && [ "$wait_ext_cnt" -eq 0 ] && [ "$ext_done_cnt" -eq 0 ] && [ "$ext_active_cnt" -eq 0 ]; then
                bottleneck_title="NETWORK BANDWIDTH BOUND"
                bottleneck_desc="Pipeline waiting on chunk downloads (Net: $(format_speed "$net_speed") | Active DL: ${dl_active_cnt})."
            elif [ "$shm_pct" -ge 85 ]; then
                bottleneck_title="RAM BUFFER CAPACITY BOUND"
                bottleneck_desc="RAM buffer (/dev/shm) near capacity (${shm_pct}%). Throttling downloads."
            else
                bottleneck_title="OPTIMAL STREAMING"
                bottleneck_desc="Balanced throughput across Network, CPU Decompress (${ext_active_cnt}/${MAX_EXT_WORKERS} wrk), and Storage."
            fi

            # Build ASCII Progress Bar (18 chars)
            local bar_width=18
            local filled=$(( pct * bar_width / 100 ))
            local unfilled=$(( bar_width - filled ))
            local bar=""
            for (( b=0; b<filled; b++ )); do bar="${bar}="; done
            if [ "$filled" -lt "$bar_width" ]; then bar="${bar}>"; unfilled=$(( unfilled - 1 )); fi
            for (( b=0; b<unfilled; b++ )); do bar="${bar} "; done

            # Format 12-line Compact High-Precision Observability Dashboard
            local dash_out=""
            dash_out+="${BLUE}┌────────────────────────────────────────────────────────────────────────────┐${NC}\n"
            dash_out+=$(printf "${BLUE}│${NC} %-74s ${BLUE}│${NC}\n" "SNAPCHAIN STREAMING PIPELINE - REAL-TIME OBSERVABILITY ENGINE")
            dash_out+="\n"
            dash_out+=$(printf "${BLUE}│${NC} %-36s | %-35s ${BLUE}│${NC}\n" \
                "Shard ${shard_id}/2 [${bar}] ${pct}%" "ETA: ${eta_str} (${done_cnt}/${total_chunks} Chunks)")
            dash_out+="\n"
            dash_out+="${BLUE}├────────────────────────────────────────────────────────────────────────────┤${NC}\n"
            dash_out+=$(printf "${BLUE}│${NC} %-36s | %-35s ${BLUE}│${NC}\n" \
                "  [NET] Speed:   $(format_speed "$net_speed") (${dl_active_cnt} DL)" "Total Ingested: $(format_bytes "$bytes_proc")/$(format_bytes "$total_comp_est")")
            dash_out+="\n"
            dash_out+=$(printf "${BLUE}│${NC} %-36s | %-35s ${BLUE}│${NC}\n" \
                "  [RAM] Extract: $(format_speed "$ext_speed") (${ext_active_cnt}/${MAX_EXT_WORKERS} wrk)" "In-RAM: ${ext_done_cnt} raw ($(format_bytes "$ext_done_bytes")) | ${wait_ext_cnt} queue")
            dash_out+="\n"
            dash_out+=$(printf "${BLUE}│${NC} %-36s | %-35s ${BLUE}│${NC}\n" \
                "  [PIPE] Inject: $(format_speed "$inj_speed")" "Disk Write:     $(format_speed "$disk_write_speed")")
            dash_out+="\n"
            dash_out+=$(printf "${BLUE}│${NC} %-36s | %-35s ${BLUE}│${NC}\n" \
                "  [DB]  RocksDB: $(format_bytes "$rocks_sz") written" "Elapsed Time:   $(printf "%02dm:%02ds" $(( elapsed / 60 )) $(( elapsed % 60 )))")
            dash_out+="\n"
            dash_out+=$(printf "${BLUE}│${NC} %-36s | %-35s ${BLUE}│${NC}\n" \
                "  [SYS] CPU: ${cpu_pct}% | Storage Wait: ${iowait_pct}%" "RAM: $(format_bytes $(( mem_used_kb * 1024 )))/$(format_bytes $(( mem_tot_kb * 1024 ))) | Shm: $(format_bytes "$shm_used") (${shm_pct}%)")
            dash_out+="\n"
            dash_out+="${BLUE}└────────────────────────────────────────────────────────────────────────────┘${NC}"

            update_status "$dash_out"
            prev_time="$curr_time"
        done
    }

    # Start live observability background collector
    collect_live_metrics "$SHARD_ID" "$TOTAL_CHUNKS" "$BUFFER_DIR" "$TAR_PID" "$START_TIME" &
    METRICS_PID=$!

    refill_download_queue 0
    dispatch_extraction_workers 0

    for (( i=0; i<TOTAL_CHUNKS; i++ )); do
        CURRENT_CHUNK="${CHUNK_ARRAY[i]}"
        CURRENT_FILE="${BUFFER_DIR}/${CURRENT_CHUNK}"
        CURRENT_RAW="${BUFFER_DIR}/${CURRENT_CHUNK}.raw"

        # Coordinate downloads and extractions until chunk i is extracted in RAM
        while [ ! -f "${BUFFER_DIR}/.ext_done_${i}" ]; do
            refill_download_queue "$i"
            dispatch_extraction_workers "$i"

            if [ -f "${BUFFER_DIR}/.err_${i}" ]; then
                echo "[ERROR] Download failed for chunk ${CURRENT_CHUNK}" >> "$LOG_FILE"
                echo "ERROR" > "$DONE_FILE"
                cleanup_resources
                exit 1
            fi
            if [ -f "${BUFFER_DIR}/.ext_err_${i}" ]; then
                echo "[ERROR] Decompression failed for chunk ${CURRENT_CHUNK}" >> "$LOG_FILE"
                echo "ERROR" > "$DONE_FILE"
                cleanup_resources
                exit 1
            fi

            if [ -f "${BUFFER_DIR}/.ext_done_${i}" ]; then
                break
            fi
            sleep 0.05
        done

        refill_download_queue "$i"
        dispatch_extraction_workers "$i"

        CHUNK_SIZE=$(cat "${BUFFER_DIR}/.size_${i}" 2>/dev/null || echo 70209256)
        rm -f "${BUFFER_DIR}/.size_${i}" 2>/dev/null || true

        T_INJ_START=$(date +%s%3N 2>/dev/null || date +%s)
        RAW_BYTES_INJECTED=0

        # Feed to tar pipe: use pre-extracted raw chunk from RAM and immediately reclaim memory
        if [ -f "$CURRENT_RAW" ] && [ -s "$CURRENT_RAW" ]; then
            RAW_BYTES_INJECTED=$(stat -c%s "$CURRENT_RAW" 2>/dev/null || echo 0)
            cat "$CURRENT_RAW" >&3
            rm -f "$CURRENT_RAW" "${BUFFER_DIR}/.ext_done_${i}" 2>/dev/null || true   # INSTANT RAM RECLAMATION
            touch "${BUFFER_DIR}/.injected_${i}"
            BYTES_PROCESSED=$(( BYTES_PROCESSED + CHUNK_SIZE ))
            T_INJ_END=$(date +%s%3N 2>/dev/null || date +%s)
            echo "$i $RAW_BYTES_INJECTED $T_INJ_START $T_INJ_END" >> "${BUFFER_DIR}/.pipe_stats"
        elif [ -f "$CURRENT_FILE" ] && [ -s "$CURRENT_FILE" ]; then
            # Emergency on-the-fly decompression directly into pipe
            $DECOMPRESS_BIN "$CURRENT_FILE" >&3
            rm -f "$CURRENT_FILE" "${BUFFER_DIR}/.dl_done_${i}" 2>/dev/null || true
            touch "${BUFFER_DIR}/.injected_${i}"
            BYTES_PROCESSED=$(( BYTES_PROCESSED + CHUNK_SIZE ))
            T_INJ_END=$(date +%s%3N 2>/dev/null || date +%s)
            RAW_BYTES_INJECTED=$(( CHUNK_SIZE * 5 ))
            echo "$i $RAW_BYTES_INJECTED $T_INJ_START $T_INJ_END" >> "${BUFFER_DIR}/.pipe_stats"
            echo "$i $RAW_BYTES_INJECTED $T_INJ_START $T_INJ_END" >> "${BUFFER_DIR}/.ext_stats"
        else
            echo "[ERROR] Chunk file missing or empty: ${CURRENT_CHUNK}" >> "$LOG_FILE"
            echo "ERROR" > "$DONE_FILE"
            cleanup_resources
            exit 1
        fi

        # Sync progress to background metrics collector
        echo "$(( i + 1 )) $BYTES_PROCESSED" > "${BUFFER_DIR}/.progress_sync"

        if ! kill -0 "$TAR_PID" 2>/dev/null; then
            wait "$TAR_PID" 2>/dev/null
            TAR_STATUS=$?
            if [ "$TAR_STATUS" -eq 0 ]; then
                TAR_COMPLETED=true
            else
                echo "[ERROR] tar extractor failed with exit code ${TAR_STATUS} for Shard ${SHARD_ID}" >> "$LOG_FILE"
                echo "ERROR" > "$DONE_FILE"
                cleanup_resources
                exit 1
            fi
        fi

        if [ "$TAR_COMPLETED" == "true" ]; then
            break
        fi
    done

    for p in "${DL_PIDS[@]}"; do
        [ -n "$p" ] && kill -9 "$p" 2>/dev/null || true
    done
    for p in "${EXT_PIDS[@]}"; do
        [ -n "$p" ] && kill -9 "$p" 2>/dev/null || true
    done

    exec 3>&- 2>/dev/null || true
    if [ "$TAR_COMPLETED" != "true" ]; then
        wait "$TAR_PID" 2>/dev/null
        TAR_STATUS=$?
        if [ "$TAR_STATUS" -ne 0 ]; then
            echo "[ERROR] tar extractor completed with non-zero exit code: ${TAR_STATUS}" >> "$LOG_FILE"
            echo "ERROR" > "$DONE_FILE"
            cleanup_resources
            exit 1
        fi
    fi

    # Terminate background metrics collector cleanly for this shard
    if [ -n "$METRICS_PID" ]; then
        kill -9 "$METRICS_PID" 2>/dev/null || true
        wait "$METRICS_PID" 2>/dev/null || true
        METRICS_PID=""
    fi

    rm -f "$PIPE_FIFO" 2>/dev/null || true
    rm -rf "$BUFFER_DIR" 2>/dev/null || true

    touch "${SNAPCHAIN_DIR}/.rocks/.shard_${SHARD_ID}.complete"
    update_status "  ${GREEN}✓ Shard [${SHARD_ID}/2] materialized and verified successfully!${NC}"
done

echo "SUCCESS" > "$DONE_FILE"
rm -f "$PID_FILE" 2>/dev/null || true
WORKER_SCRIPT_EOF

        chmod +x "${SNAPCHAIN_DIR}/.snapshot_worker.sh"
        rm -f "$WORKER_DONE_FILE" "$WORKER_LOG_FILE"

        nohup bash "${SNAPCHAIN_DIR}/.snapshot_worker.sh" "$SNAPCHAIN_DIR" > "$WORKER_LOG_FILE" 2>&1 &
        WORKER_PID=$!
        disown $WORKER_PID 2>/dev/null || true
        echo "$WORKER_PID" > "$WORKER_PID_FILE"

        echo -e "  ${GREEN}✓ Background worker started (PID: ${WORKER_PID}). Attaching to live progress monitor...${NC}"
        echo -e "    ${CYAN}Tip: Press Ctrl+C at any time to detach or stop the sync.${NC}\n"
    fi

    # Interactive trap: prompt user on Ctrl+C to terminate or keep running in background
    handle_sigint() {
        # Temporarily ignore signals during prompt
        trap '' INT TERM
        echo -e "\n"
        echo -e "${YELLOW}================================================================${NC}"
        echo -e "${YELLOW}[INTERRUPT] Received Ctrl+C signal.${NC}"
        echo -e "Snapshot sync worker is currently running in the background (PID: ${WORKER_PID})."
        echo -e "${YELLOW}================================================================${NC}"

        local user_choice=""
        if [ -e /dev/tty ] && [ -r /dev/tty ]; then
            printf "%b" "${BOLD}Do you want to completely stop and terminate the entire sync process? [y/N]: ${NC}" > /dev/tty
            read -r user_choice < /dev/tty || true
        else
            printf "%b" "${BOLD}Do you want to completely stop and terminate the entire sync process? [y/N]: ${NC}"
            read -r user_choice || true
        fi

        case "$user_choice" in
            [yY]|[yY][eE][sS])
                echo -e "\n${RED}${BOLD}Stopping snapshot sync worker (PID: ${WORKER_PID})...${NC}"
                if [ -n "$WORKER_PID" ] && kill -0 "$WORKER_PID" 2>/dev/null; then
                    kill -TERM "$WORKER_PID" 2>/dev/null || true
                    sleep 1
                    kill -9 "$WORKER_PID" 2>/dev/null || true
                fi
                rm -f "$WORKER_PID_FILE" 2>/dev/null || true
                echo -e "${RED}✓ Snapshot sync process terminated.${NC}\n"
                exit 130
                ;;
            *)
                echo -e "\n${GREEN}✓ Process will CONTINUE RUNNING in the background (PID: ${WORKER_PID}).${NC}"
                echo -e "${CYAN}You can re-attach to the live progress anytime by running Step (1) again.${NC}"
                echo -e "${CYAN}Or view live worker logs with: tail -f ${WORKER_LOG_FILE}${NC}\n"
                exit 0
                ;;
        esac
    }

    trap handle_sigint INT TERM

    LAST_STATUS=""
    FIRST_RENDER=true
    PREV_LINE_COUNT=0

    echo -e "  ${CYAN}• Connecting to real-time observability engine...${NC}\n"

    while kill -0 "$WORKER_PID" 2>/dev/null; do
        if [ -f "$WORKER_STATUS_FILE" ]; then
            STATUS_BLOCK=$(cat "$WORKER_STATUS_FILE" 2>/dev/null || echo "")
            if [ -n "$STATUS_BLOCK" ] && [ "$STATUS_BLOCK" != "$LAST_STATUS" ]; then
                if [ -t 1 ]; then
                    CURR_LINES=$(echo -e "$STATUS_BLOCK" | wc -l)
                    if [ "$FIRST_RENDER" == "true" ]; then
                        printf "%b\n" "$STATUS_BLOCK"
                        FIRST_RENDER=false
                        PREV_LINE_COUNT=$CURR_LINES
                    else
                        printf "\033[%dA\r%b\n" "$PREV_LINE_COUNT" "$STATUS_BLOCK"
                        PREV_LINE_COUNT=$CURR_LINES
                    fi
                else
                    # Non-interactive / log pipe mode: print clean progress line on each update
                    SUMMARY=$(echo -e "$STATUS_BLOCK" | grep -E "Shard|Speed:|Extract:|FIFO|CPU" | tr -d '\n' | sed -e 's/[│┌├└─]//g' -e 's/  */ /g')
                    if [ -n "$SUMMARY" ]; then
                        echo "[SYNC] $SUMMARY"
                    fi
                fi
                LAST_STATUS="$STATUS_BLOCK"
            fi
        fi
        sleep 0.8
    done

    # Reset trap
    trap - INT TERM
    echo ""

    if [ -f "$WORKER_DONE_FILE" ] && grep -q "SUCCESS" "$WORKER_DONE_FILE"; then
        echo -e "\n  ${GREEN}✓ State Snapshot Sync completed successfully!${NC}"
        sed -i 's/load_db_from_snapshot=true/load_db_from_snapshot=false/g' docker-compose.yml 2>/dev/null || true
        echo -e "  ${GREEN}✓ Database state synchronized. Ready for container launch.${NC}"
    else
        echo -e "\n  ${RED}[ERROR] Snapshot worker exited unexpectedly or failed.${NC}"
        if [ -f "$WORKER_LOG_FILE" ]; then
            echo -e "${YELLOW}Latest worker log output:${NC}"
            tail -n 25 "$WORKER_LOG_FILE"
        fi
        exit 1
    fi
fi

# ------------------------------------------------------------------------------
# 6. Launch Standalone Snapchain Read Node
# ------------------------------------------------------------------------------
resolve_docker_runtime

echo -e "\n${YELLOW}[4/4] Starting Snapchain Docker container with ${COMPOSE_CMD}...${NC}"
$COMPOSE_CMD down || true
$COMPOSE_CMD up -d

CONTAINER_NAME=$($DOCKER_BIN ps --filter "name=snapchain" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -E "snapchain.*snapchain|snapchain" | head -n 1 || echo "")
if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME=$($DOCKER_BIN ps --filter "name=snapchain" --format "{{.Names}}" 2>/dev/null | head -n 1 || echo "snapchain")
fi

# ------------------------------------------------------------------------------
# 7. Health Check & Live Network Sync Monitor
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}• Verifying Node Initialization & P2P Gossip Ingestion...${NC}"
echo -e "  Waiting for HTTP API endpoint (:3381/v1/info)..."

INIT_TIMEOUT=180
ELAPSED=0
SYNCED=false

while [ "$ELAPSED" -lt "$INIT_TIMEOUT" ]; do
    if curl -fs -m 2 http://localhost:3381/v1/info > /dev/null 2>&1; then
        SYNCED=true
        break
    fi

    if ! $DOCKER_BIN ps --filter "name=${CONTAINER_NAME}" --filter "status=running" -q 2>/dev/null | grep -q .; then
        echo -e "\n${RED}[ERROR] Container stopped unexpectedly. Latest logs:${NC}"
        $DOCKER_BIN logs --tail 30 "${CONTAINER_NAME}" 2>&1 || true
        exit 1
    fi

    sleep 3
    ELAPSED=$(( ELAPSED + 3 ))
    printf "."
done

echo ""

if [ "$SYNCED" == "true" ]; then
    echo -e "\n${GREEN}${BOLD}================================================================${NC}"
    echo -e "${GREEN}${BOLD}  ✓ Snapchain Read Node is UP and RUNNING!                      ${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}"
    echo -e "\n${BLUE}Node Health Summary (http://localhost:3381/v1/info):${NC}"
    curl -s http://localhost:3381/v1/info | jq '.' 2>/dev/null || curl -s http://localhost:3381/v1/info
    
    echo -e "\n${GREEN}Available Service Endpoints:${NC}"
    echo -e "  - HTTP API (Reads & submitMessage writes): ${BOLD}http://localhost:3381${NC}"
    echo -e "  - gRPC API:                               ${BOLD}localhost:3383${NC}"
    echo -e "  - P2P Gossip Mesh:                        ${BOLD}0.0.0.0:3382 (UDP/QUIC & TCP)${NC}"
    if [ "$METRICS_ACTIVE" == "true" ]; then
        echo -e "  - Grafana Monitoring Dashboard:           ${BOLD}http://localhost:3005${NC} (admin/admin)"
    fi
    echo -e "\nTo view live logs: ${BOLD}${DOCKER_BIN} logs -f ${CONTAINER_NAME}${NC}"
else
    echo -e "${YELLOW}Notice: Node container is starting up and catching up blocks.${NC}"
    echo -e "Inspect status anytime using: ${BOLD}${DOCKER_BIN} logs -f ${CONTAINER_NAME}${NC}"
fi

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✓ Step (2/3) Complete: Snapchain Read Node is UP and RUNNING! ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}\n"

# ------------------------------------------------------------------------------
# Direct Automatic Transition to Step (3/3)
# ------------------------------------------------------------------------------
echo -e "${CYAN}${BOLD}• Automatically proceeding to Step (3/3) [Launch Web Client & Dashboard]...${NC}\n"

if [ -f "./scripts/2-create-client.sh" ]; then
    exec bash "./scripts/2-create-client.sh"
elif [ -f "./2-create-client.sh" ]; then
    exec bash "./2-create-client.sh"
elif [ -f "${HOME}/farcaster-snapchain-node-client/scripts/2-create-client.sh" ]; then
    exec bash "${HOME}/farcaster-snapchain-node-client/scripts/2-create-client.sh"
else
    TMP_SCRIPT=$(mktemp /tmp/snapchain_step2.XXXXXX.sh)
    curl -fsSL "https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh?v=$(date +%s)" -o "$TMP_SCRIPT"
    chmod +x "$TMP_SCRIPT"
    exec bash "$TMP_SCRIPT"
fi
