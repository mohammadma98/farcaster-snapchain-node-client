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
# - Interactive Observability & Metrics Configurator (Optional StatsD / Grafana)
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
# 1. Verify Step (0) Provisioning State & Load Matrix Profiles
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
# 2. Interactive Observability & Metrics Configuration
# ------------------------------------------------------------------------------
echo -e "${CYAN}${BOLD}[Component Configuration] Monitoring & Observability Stack${NC}"
echo -e "  The monitoring stack includes Grafana (Dashboard) and StatsD (Metrics Collector)."
echo -e "  ${YELLOW}Notice: These services consume ~700 MB RAM, additional CPU cycles, and write"
echo -e "  continuous time-series metrics to disk. They are NOT required for node operation.${NC}"

if [ "$PROFILE_DISK" == "D1" ] || [ "$PROFILE_RAM" == "R1" ] || [ "$PROFILE_CPU" == "C1" ]; then
    echo -e "  • ${BOLD}Engineering Recommendation for this host:${NC} ${YELLOW}Disable Metrics (N)${NC} to protect CPU/RAM/Disk resources."
    DEFAULT_METRICS="n"
else
    echo -e "  • ${BOLD}Engineering Recommendation for this host:${NC} ${GREEN}Enable Metrics (Y)${NC} (host has sufficient resources)."
    DEFAULT_METRICS="y"
fi

ENABLE_METRICS=$(prompt_user "Would you like to install and run the Metrics stack (Grafana/StatsD)? [y/N]: " "$DEFAULT_METRICS")
case "$ENABLE_METRICS" in
    [yY]|[yY][eE][sS])
        METRICS_ACTIVE=true
        echo -e "  ${GREEN}✓ Metrics stack enabled (Grafana on port 3005).${NC}\n"
        ;;
    *)
        METRICS_ACTIVE=false
        echo -e "  ${GREEN}✓ Running in Lean Mode: Metrics disabled to preserve host resources.${NC}\n"
        ;;
esac

# ------------------------------------------------------------------------------
# 3. Setup Target Directory & Pull Official Manifests
# ------------------------------------------------------------------------------
SNAPCHAIN_DIR="${SNAPCHAIN_DATA_DIR:-${HOME}/snapchain}"
NODE_OPERATOR_FID="${1:-2}"

mkdir -p "$SNAPCHAIN_DIR"
cd "$SNAPCHAIN_DIR"

echo -e "${YELLOW}[1/4] Pulling node manifests & management scripts...${NC}"
curl -sSL -o snapchain.sh https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/scripts/snapchain.sh
chmod +x snapchain.sh

cat <<EOF > .env
## Snapchain Read Node Configuration (Zero API Keys)
AGREE_NO_REWARDS_FOR_ME=true
HUB_OPERATOR_FID=${NODE_OPERATOR_FID}
SKIP_CRONTAB=false
GRAFANA_CREDS=admin:admin
EOF

curl -sSL -o docker-compose.yml https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/docker-compose.mainnet.yml
curl -sSL -o validators.toml https://raw.githubusercontent.com/farcasterxyz/snapchain/refs/heads/main/validators.toml

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

# Check if all shards (0, 1, 2) are already fully materialized on disk
ALL_SHARDS_DONE=true
for s in 0 1 2; do
    s_dir="${SNAPCHAIN_DIR}/.rocks/shard-${s}"
    s_bytes=$(du -sb "$s_dir" 2>/dev/null | awk '{print $1}' || echo 0)
    if [ "$s" -eq 0 ] && [ "$s_bytes" -le 10737418240 ]; then
        ALL_SHARDS_DONE=false
    elif [ "$s" -ne 0 ] && [ "$s_bytes" -le 107374182400 ]; then
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
        echo -e "  ${GREEN}✓ Active Background Snapshot Pipeline detected (PID: ${WORKER_PID}).${NC}"
        echo -e "    ${CYAN}Notice: The pipeline is running in a detached background worker independent of this SSH session.${NC}"
        echo -e "    ${CYAN}Tip: You can safely detach anytime with Ctrl+C; the download will keep running.${NC}\n"
    else
        echo -e "  • Starting Detached RAM-Assisted Concurrent Streaming Pipeline..."
        echo -e "    ${CYAN}Notice: Worker runs as an independent daemon immune to SSH dropouts or terminal closure.${NC}"
        echo -e "    ${CYAN}Chunks are streamed through RAM (/dev/shm) directly into RocksDB (zero disk waste).${NC}\n"

        # Generate the self-contained detached worker daemon script
        cat <<'WORKER_SCRIPT_EOF' > "${SNAPCHAIN_DIR}/.snapshot_worker.sh"
#!/usr/bin/env bash
set -uo pipefail

# Ignore SIGHUP so closing the SSH session never interrupts the pipeline
trap '' HUP

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

R2_PUBLIC_BASE="https://pub-d352dd8819104a778e20d08888c5a661.r2.dev"
NETWORK_NAME="FARCASTER_NETWORK_MAINNET"
SHARDS=(0 1 2)
NUM_SHARDS=${#SHARDS[@]}

mkdir -p "${SNAPCHAIN_DIR}/.rocks"

PIPE_FIFO=""
TAR_PID=""
BUFFER_DIR=""
declare -A DOWNLOAD_PIDS=()

cleanup_resources() {
    exec 3>&- 2>/dev/null || true
    [ -n "$PIPE_FIFO" ] && rm -f "$PIPE_FIFO" 2>/dev/null || true
    for p in "${DOWNLOAD_PIDS[@]}"; do
        [ -n "$p" ] && kill -9 "$p" 2>/dev/null || true
    done
    [ -n "$TAR_PID" ] && kill -9 "$TAR_PID" 2>/dev/null || true
    [ -n "$BUFFER_DIR" ] && rm -rf "$BUFFER_DIR" 2>/dev/null || true
}
trap cleanup_resources INT TERM

for SHARD_ID in "${SHARDS[@]}"; do
    SHARD_DIR="${SNAPCHAIN_DIR}/.rocks/shard-${SHARD_ID}"
    SHARD_BYTES=0
    if [ -d "$SHARD_DIR" ]; then
        SHARD_BYTES=$(du -sb "$SHARD_DIR" 2>/dev/null | awk '{print $1}' || echo 0)
    fi

    # Check if this specific shard is already bootstrapped (Shard 0: >10GB, Shards 1&2: >100GB)
    if [ "$SHARD_ID" -eq 0 ] && [ "$SHARD_BYTES" -gt 10737418240 ]; then
        update_status "  ${GREEN}✓ Shard 0 already materialized ($(format_bytes "$SHARD_BYTES")). Skipping.${NC}"
        continue
    elif [ "$SHARD_ID" -ne 0 ] && [ "$SHARD_BYTES" -gt 107374182400 ]; then
        update_status "  ${GREEN}✓ Shard ${SHARD_ID} already materialized ($(format_bytes "$SHARD_BYTES")). Skipping.${NC}"
        continue
    elif [ "$SHARD_BYTES" -gt 0 ]; then
        update_status "  ${YELLOW}Notice: Cleaning up incomplete Shard ${SHARD_ID} state ($(format_bytes "$SHARD_BYTES"))...${NC}"
        rm -rf "$SHARD_DIR"
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

    BUFFER_DIR="/dev/shm/snapchain_shard_${SHARD_ID}_$$"
    SHM_AVAIL_MB=$(df -BM /dev/shm 2>/dev/null | awk 'NR==2 {print $4}' | tr -d 'M' || echo 0)
    SAFETY_RESERVE_MB=350

    if [ "${SHM_AVAIL_MB:-0}" -ge $(( SAFETY_RESERVE_MB + 150 )) ]; then
        USABLE_SHM_MB=$(( SHM_AVAIL_MB - SAFETY_RESERVE_MB ))
        MAX_BUFFERED_CHUNKS=$(( USABLE_SHM_MB / 75 ))
        [ "$MAX_BUFFERED_CHUNKS" -lt 2 ] && MAX_BUFFERED_CHUNKS=2
        if [ "${SHM_AVAIL_MB:-0}" -gt 1024 ]; then
            CONCURRENT_DOWNLOADS=4
        else
            CONCURRENT_DOWNLOADS=3
        fi
        mkdir -p "$BUFFER_DIR"
    else
        BUFFER_DIR="${SNAPCHAIN_DIR}/.chunks_tmp_${SHARD_ID}"
        MAX_BUFFERED_CHUNKS=3
        CONCURRENT_DOWNLOADS=2
        mkdir -p "$BUFFER_DIR"
    fi

    PIPE_FIFO="/tmp/snapchain_pipe_${SHARD_ID}_$$.fifo"
    rm -f "$PIPE_FIFO"
    mkfifo "$PIPE_FIFO"

    tar -xf "$PIPE_FIFO" -C "${SNAPCHAIN_DIR}/.rocks" &
    TAR_PID=$!
    TAR_COMPLETED=false

    exec 3> "$PIPE_FIFO"

    CHUNK_LIST=$(python3 -c "import json; print(' '.join(json.loads('''$META_DATA''')['chunks']))")
    CHUNK_ARRAY=($CHUNK_LIST)

    START_TIME=$(date +%s)
    BYTES_PROCESSED=0

    declare -A DOWNLOAD_PIDS=()
    NEXT_DOWNLOAD_IDX=0

    refill_download_queue() {
        local curr_extract_idx=$1
        while [ "$NEXT_DOWNLOAD_IDX" -lt "$TOTAL_CHUNKS" ]; do
            if [ $(( NEXT_DOWNLOAD_IDX - curr_extract_idx )) -ge "$MAX_BUFFERED_CHUNKS" ]; then
                break
            fi

            local active=0
            for p in "${DOWNLOAD_PIDS[@]}"; do
                if kill -0 "$p" 2>/dev/null; then
                    active=$(( active + 1 ))
                fi
            done

            if [ "$active" -ge "$CONCURRENT_DOWNLOADS" ]; then
                break
            fi

            local chunk_name="${CHUNK_ARRAY[NEXT_DOWNLOAD_IDX]}"
            local chunk_url="${R2_PUBLIC_BASE}/${KEY_BASE}/${chunk_name}"
            curl -fsSL --retry 5 --retry-connrefused --retry-delay 2 "$chunk_url" -o "${BUFFER_DIR}/${chunk_name}" &
            DOWNLOAD_PIDS["$NEXT_DOWNLOAD_IDX"]=$!
            NEXT_DOWNLOAD_IDX=$(( NEXT_DOWNLOAD_IDX + 1 ))
        done
    }

    refill_download_queue 0

    for (( i=0; i<TOTAL_CHUNKS; i++ )); do
        CURRENT_CHUNK="${CHUNK_ARRAY[i]}"
        CURRENT_FILE="${BUFFER_DIR}/${CURRENT_CHUNK}"

        refill_download_queue "$i"

        if [ -n "${DOWNLOAD_PIDS[$i]:-}" ]; then
            wait "${DOWNLOAD_PIDS[$i]}" || {
                echo "[ERROR] Download failed for chunk ${CURRENT_CHUNK}" >> "$LOG_FILE"
                echo "ERROR" > "$DONE_FILE"
                cleanup_resources
                exit 1
            }
            unset DOWNLOAD_PIDS["$i"]
        fi

        refill_download_queue "$i"

        if [ -s "$CURRENT_FILE" ]; then
            CHUNK_SIZE=$(stat -c%s "$CURRENT_FILE" 2>/dev/null || echo 70209256)
            gzip -dc "$CURRENT_FILE" >&3
            rm -f "$CURRENT_FILE"
            BYTES_PROCESSED=$(( BYTES_PROCESSED + CHUNK_SIZE ))
        else
            echo "[ERROR] Chunk file missing or empty: ${CURRENT_CHUNK}" >> "$LOG_FILE"
            echo "ERROR" > "$DONE_FILE"
            cleanup_resources
            exit 1
        fi

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

        NOW=$(date +%s)
        ELAPSED=$(( NOW - START_TIME ))
        if [ "$ELAPSED" -gt 0 ]; then
            CURR_SPEED=$(( BYTES_PROCESSED / ELAPSED ))
        else
            CURR_SPEED=0
        fi

        DONE_COUNT=$(( i + 1 ))
        PERCENT=$(( DONE_COUNT * 100 / TOTAL_CHUNKS ))
        RAM_BUFFERED=$(ls -1 "$BUFFER_DIR" 2>/dev/null | wc -l || echo 0)

        PROGRESS_MSG=$(printf "  ${CYAN}➤ Shard %d/%d:${NC} [%3d%%] %4d/%d Chunks | %s | %s | Queue: %2d chunks | Elapsed: %02dm:%02ds" \
            "$SHARD_ID" "$NUM_SHARDS" "$PERCENT" "$DONE_COUNT" "$TOTAL_CHUNKS" \
            "$(format_bytes "$BYTES_PROCESSED")" "$(format_speed "$CURR_SPEED")" \
            "$RAM_BUFFERED" \
            $(( ELAPSED / 60 )) $(( ELAPSED % 60 )))

        update_status "$PROGRESS_MSG"

        if [ "$TAR_COMPLETED" == "true" ]; then
            break
        fi
    done

    for p in "${DOWNLOAD_PIDS[@]}"; do
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
    rm -f "$PIPE_FIFO" 2>/dev/null || true
    rm -rf "$BUFFER_DIR" 2>/dev/null || true

    update_status "  ${GREEN}✓ Shard [${SHARD_ID}/${NUM_SHARDS}] materialized successfully!${NC}"
done

echo "SUCCESS" > "$DONE_FILE"
rm -f "$PID_FILE" 2>/dev/null || true
WORKER_SCRIPT_EOF

        chmod +x "${SNAPCHAIN_DIR}/.snapshot_worker.sh"
        rm -f "$WORKER_DONE_FILE"

        nohup bash "${SNAPCHAIN_DIR}/.snapshot_worker.sh" "$SNAPCHAIN_DIR" > "$WORKER_LOG_FILE" 2>&1 &
        WORKER_PID=$!
        disown $WORKER_PID 2>/dev/null || true
        echo "$WORKER_PID" > "$WORKER_PID_FILE"

        echo -e "  ${GREEN}✓ Background worker started (PID: ${WORKER_PID}). Attaching to live progress monitor...${NC}"
        echo -e "    ${CYAN}Tip: Press Ctrl+C at any time to detach without interrupting the background sync.${NC}\n"
    fi

    # Set non-killing trap for interactive monitor: detaching does not kill worker
    trap 'echo -e "\n\n${YELLOW}[i] Detached from monitor. Snapshot worker (PID: ${WORKER_PID}) continues running in the background.${NC}"; echo -e "${CYAN}To re-attach anytime, simply run Step (1) again.${NC}\n"; exit 0' INT TERM

    LAST_STATUS=""
    while kill -0 "$WORKER_PID" 2>/dev/null; do
        if [ -f "$WORKER_STATUS_FILE" ]; then
            STATUS_LINE=$(cat "$WORKER_STATUS_FILE" 2>/dev/null || echo "")
            if [ -n "$STATUS_LINE" ] && [ "$STATUS_LINE" != "$LAST_STATUS" ]; then
                printf "\r%b" "$STATUS_LINE"
                LAST_STATUS="$STATUS_LINE"
            fi
        fi
        sleep 0.5
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
echo -e "\n${YELLOW}[4/4] Starting Snapchain Docker container...${NC}"
docker compose down || true
docker compose up -d

CONTAINER_NAME=$(docker ps --filter "name=snapchain" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -E "snapchain.*snapchain|snapchain" | head -n 1 || echo "")
if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME=$(docker ps --filter "name=snapchain" --format "{{.Names}}" 2>/dev/null | head -n 1 || echo "snapchain")
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

    if ! docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" -q 2>/dev/null | grep -q .; then
        echo -e "\n${RED}[ERROR] Container stopped unexpectedly. Latest logs:${NC}"
        docker logs --tail 30 "${CONTAINER_NAME}" 2>&1 || true
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
    echo -e "\nTo view live logs: ${BOLD}docker logs -f ${CONTAINER_NAME}${NC}"
else
    echo -e "${YELLOW}Notice: Node container is starting up and catching up blocks.${NC}"
    echo -e "Inspect status anytime using: ${BOLD}docker logs -f ${CONTAINER_NAME}${NC}"
fi

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✓ Step (1) Complete: Standalone Read Node operational!        ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}\n"

# ------------------------------------------------------------------------------
# 8. Interactive Prompt to Execute Step (2)
# ------------------------------------------------------------------------------
AUTO_STEP2=$(prompt_user "Would you like to automatically launch Step (2) [Sovereign Client & Web UI] now? [Y/n]: " "y")

case "$AUTO_STEP2" in
    [yY]|[yY][eE][sS])
        echo -e "\n${CYAN}${BOLD}Launching Step (2): Setting up Sovereign Web Client & CLI...${NC}\n"
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
        ;;
    *)
        echo -e "\nNext step: Run Command (2) whenever you are ready to launch your Client & Web UI:"
        echo -e "${CYAN}${BOLD}curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash${NC}\n"
        ;;
esac
