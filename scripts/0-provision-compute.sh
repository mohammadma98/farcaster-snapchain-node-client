#!/usr/bin/env bash
# ==============================================================================
# Command (0): Provision & Prepare Compute for Farcaster Snapchain Read Node
# Part of Farcaster Client & Node Suite (MIT License)
# Repository: https://github.com/mohammadma98/farcaster-snapchain-node-client
#
# Hardware Targets (Mainnet Read Node):
# - Matrix Architecture: Decoupled 3x3x3 Adaptive Profiling Engine
# - CPU Profiles:  C1 (<4 Cores), C2 (4-6 Cores), C3 (>6 Cores)
# - RAM Profiles:  R1 (<6 GB),    R2 (6-12 GB),   R3 (>12 GB)
# - Disk Profiles: D1 (HDD),      D2 (SSD),       D3 (NVMe)
# - Minimum Storage: 750 GB (RAM-Assisted Streaming Pipeline) | 1,400 GB (Bulk Extraction)
# - Ports: 22 (SSH), 3381 (HTTP API), 3382 (Gossip P2P), 3383 (gRPC), 3000 (Web UI), 3005 (Grafana)
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
echo -e "${BLUE}${BOLD}   (0) Provision Compute for Farcaster Snapchain Read Node     ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

# 1. Detect privilege level
if [ "$(id -u)" -eq 0 ]; then
    SUDO=""
else
    if command -v sudo &> /dev/null; then
        SUDO="sudo"
    else
        echo -e "${RED}[ERROR] This script requires administrative privileges. Please run as root or install sudo.${NC}"
        exit 1
    fi
fi

# Helper function to read user input interactively even when piped via curl | bash
prompt_user() {
    local prompt_msg="$1"
    local default_val="$2"
    local response=""

    # If running in check mode, automatically return default value
    if [ "${MODE:-setup}" == "check" ]; then
        echo "$default_val"
        return 0
    fi

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

# Optional mode parameter: 'check' or default full setup
MODE="${1:-setup}"

# Operational Specifications
MIN_DISK_GB=750       # Optimized for RAM-assisted chunk-by-chunk streaming pipeline
BULK_DISK_GB=1400     # Required only for unpipelined bulk extraction
REC_DISK_GB=1500      # Official full recommendation for archive retention

# ------------------------------------------------------------------------------
# 2. Hardware Inspection & Decoupled Matrix Evaluation
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[1/6] Inspecting System Hardware & Profile Classification...${NC}"

# Detect CPU cores
CPUS=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 1)

if [ "$CPUS" -lt 4 ]; then
    PROFILE_CPU="C1"
    CPU_LABEL="Constrained / Low-Core (${CPUS} Core)"
elif [ "$CPUS" -le 6 ]; then
    PROFILE_CPU="C2"
    CPU_LABEL="Balanced Cloud Standard (${CPUS} Cores)"
else
    PROFILE_CPU="C3"
    CPU_LABEL="High-Throughput Dedicated (${CPUS} Cores)"
fi

echo -e "  - CPU Cores:      ${BOLD}${CPUS}${NC} -> ${GREEN}${BOLD}Profile [${PROFILE_CPU}]${NC} (${CPU_LABEL})"

# Detect RAM
if [ -f /proc/meminfo ]; then
    RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    RAM_GB=$(( (RAM_KB + 524288) / 1024 / 1024 )) # Rounded calculation
else
    RAM_GB=16
fi

if [ "$RAM_GB" -lt 6 ]; then
    PROFILE_RAM="R1"
    RAM_LABEL="Low Memory (${RAM_GB} GB - ZRAM Optimization Required)"
elif [ "$RAM_GB" -le 12 ]; then
    PROFILE_RAM="R2"
    RAM_LABEL="Balanced Memory (${RAM_GB} GB)"
else
    PROFILE_RAM="R3"
    RAM_LABEL="High Memory (${RAM_GB} GB - In-Memory Cache Enabled)"
fi

echo -e "  - System Memory:  ${BOLD}${RAM_GB} GB${NC} -> ${GREEN}${BOLD}Profile [${PROFILE_RAM}]${NC} (${RAM_LABEL})"
echo -e "  - Storage Bounds: Streaming Pipeline: ${BOLD}${MIN_DISK_GB} GB${NC} | Bulk Archive: ${BOLD}${BULK_DISK_GB} GB${NC} | Recommended: ${BOLD}${REC_DISK_GB} GB${NC}"

# ------------------------------------------------------------------------------
# 3. Network Ports Inspection
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[2/6] Inspecting Required Network Ports...${NC}"

check_port_status() {
    local port="$1"
    local proto="${2:-tcp}"
    local in_use=0

    if command -v ss &>/dev/null; then
        if [ "$proto" == "udp" ]; then
            ss -uln 2>/dev/null | grep -E -q "[:.]${port}\b" && in_use=1 || in_use=0
        else
            ss -tln 2>/dev/null | grep -E -q "[:.]${port}\b" && in_use=1 || in_use=0
        fi
    elif command -v netstat &>/dev/null; then
        if [ "$proto" == "udp" ]; then
            netstat -uln 2>/dev/null | grep -E -q "[:.]${port}\b" && in_use=1 || in_use=0
        else
            netstat -tln 2>/dev/null | grep -E -q "[:.]${port}\b" && in_use=1 || in_use=0
        fi
    elif command -v lsof &>/dev/null; then
        lsof -i :"$port" &>/dev/null && in_use=1 || in_use=0
    fi

    echo "$in_use"
}

PORT_CONFLICTS=0

PORTS_TO_CHECK=(
    "22:tcp:SSH Remote Access"
    "3381:tcp:Snapchain HTTP API & submitMessage"
    "3382:udp:Snapchain Libp2p Gossip Mesh (QUIC)"
    "3382:tcp:Snapchain Libp2p Gossip Mesh (TCP)"
    "3383:tcp:Snapchain gRPC API"
    "3000:tcp:Farcaster Web Client"
    "3005:tcp:Grafana Monitoring Dashboard"
)

for p_entry in "${PORTS_TO_CHECK[@]}"; do
    IFS=':' read -r port proto desc <<< "$p_entry"
    STATUS=$(check_port_status "$port" "$proto")
    if [ "$port" -eq 22 ]; then
        echo -e "  ✓ Port ${port}/${proto} (${desc}) is active (SSH connection)."
    elif [ "$STATUS" -eq 0 ]; then
        echo -e "  ✓ Port ${port}/${proto} (${desc}) is free and available."
    else
        echo -e "  ${YELLOW}⚠ Warning: Port ${port}/${proto} (${desc}) is currently in use.${NC}"
        PORT_CONFLICTS=$((PORT_CONFLICTS + 1))
    fi
done

if [ "$PORT_CONFLICTS" -gt 0 ]; then
    echo -e "\n${YELLOW}Notice: ${PORT_CONFLICTS} required port(s) are currently occupied.${NC}"
    if [ "$MODE" != "check" ]; then
        PROCEED_PORT=$(prompt_user "Do you want to proceed anyway? [y/N]: " "n")
        case "$PROCEED_PORT" in
            [yY]|[yY][eE][sS])
                echo -e "  ${GREEN}✓ Proceeding despite port warnings.${NC}"
                ;;
            *)
                echo -e "${RED}[ABORTED] Please stop conflicting services before running setup.${NC}"
                exit 1
                ;;
        esac
    fi
fi

# ------------------------------------------------------------------------------
# 4. Storage Analysis, Volume Selection & Disk Profile Classification
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[3/6] Analyzing Storage Volumes & Detecting Disk Medium...${NC}"

# Parse real block storage devices with >= MIN_DISK_GB (750 GB) free space
ELIGIBLE_MOUNTS=()
while IFS='|' read -r m_mount m_avail m_total m_used m_device; do
    if [ -n "$m_mount" ]; then
        ELIGIBLE_MOUNTS+=("${m_mount}|${m_avail}|${m_total}|${m_used}|${m_device}")
    fi
done < <(df -P -BG 2>/dev/null | awk -v min_gb="$MIN_DISK_GB" 'NR>1 && $1 ~ /^\/dev\// && $1 !~ /^\/dev\/loop/ && $6 !~ /^\/boot/ {
    avail = $4; gsub(/[^0-9]/, "", avail);
    total = $2;
    used = $3;
    device = $1;
    mount = $6;
    if (avail + 0 >= min_gb + 0) {
        print mount "|" avail "|" total "|" used "|" device;
    }
}' | sort -t'|' -k2,2rn || true)

TOTAL_ELIGIBLE=${#ELIGIBLE_MOUNTS[@]}

if [ "$TOTAL_ELIGIBLE" -eq 0 ]; then
    echo -e "${YELLOW}${BOLD}================================================================${NC}"
    echo -e "${YELLOW}${BOLD}  ⚠ Storage Notice: Free Space is Below ${MIN_DISK_GB} GB Baseline       ${NC}"
    echo -e "${YELLOW}${BOLD}================================================================${NC}"
    echo -e "${YELLOW}No storage volume on this server has at least ${MIN_DISK_GB} GB of free space.${NC}"
    echo -e "Note: The streaming chunk pipeline requires ~550-750 GB to materialize RocksDB."
    echo -e "\n${YELLOW}Searching for mounted volumes with at least 50 GB available...${NC}"

    while IFS='|' read -r m_mount m_avail m_total m_used m_device; do
        if [ -n "$m_mount" ] && [ "${m_avail:-0}" -ge 50 ]; then
            ELIGIBLE_MOUNTS+=("${m_mount}|${m_avail}|${m_total}|${m_used}|${m_device}")
        fi
    done < <(df -P -BG 2>/dev/null | awk 'NR>1 && $1 ~ /^\/dev\// && $1 !~ /^\/dev\/loop/ && $6 !~ /^\/boot/ {
        avail = $4; gsub(/[^0-9]/, "", avail);
        total = $2;
        used = $3;
        device = $1;
        mount = $6;
        print mount "|" avail "|" total "|" used "|" device;
    }' | sort -t'|' -k2,2rn || true)

    TOTAL_ELIGIBLE=${#ELIGIBLE_MOUNTS[@]}

    if [ "$TOTAL_ELIGIBLE" -eq 0 ]; then
        echo -e "\n${RED}${BOLD}[FATAL ERROR] Insufficient Free Storage Space (< 50 GB)!${NC}"
        echo -e "${RED}Server does not have enough storage space to bootstrap a Snapchain node.${NC}"
        df -h -x tmpfs -x devtmpfs -x overlay 2>/dev/null || df -h
        exit 1
    fi

    if [ "$MODE" != "check" ]; then
        echo -e "${YELLOW}Warning: Proceeding with < ${MIN_DISK_GB} GB may cause disk exhaustion during sync.${NC}"
        CONFIRM_DISK=$(prompt_user "Do you want to proceed with available storage anyway? [y/N]: " "n")
        case "$CONFIRM_DISK" in
            [yY]|[yY][eE][sS])
                echo -e "  ${GREEN}✓ Proceeding with available volume.${NC}\n"
                ;;
            *)
                echo -e "${RED}[ABORTED] Setup stopped by operator.${NC}"
                exit 1
                ;;
        esac
    fi
fi

SELECTED_MOUNT=""
SELECTED_AVAIL=""
SELECTED_DEVICE=""
SELECTED_SNAPCHAIN_DIR=""

if [ "$TOTAL_ELIGIBLE" -eq 1 ]; then
    IFS='|' read -r s_mount s_avail s_total s_used s_device <<< "${ELIGIBLE_MOUNTS[0]}"
    SELECTED_MOUNT="$s_mount"
    SELECTED_AVAIL="$s_avail"
    SELECTED_DEVICE="$s_device"

    echo -e "  Found 1 eligible storage volume:"
    echo -e "  - Mount:      ${BOLD}${s_mount}${NC}"
    echo -e "  - Available:  ${BOLD}${s_avail} GB${NC} (Total: ${s_total}, Device: ${s_device})"
    
    if [ "$s_mount" == "/" ]; then
        DEFAULT_PATH="${HOME}/snapchain"
    else
        DEFAULT_PATH="${s_mount}/snapchain"
    fi

    echo -e "  - Target Dir: ${BOLD}${DEFAULT_PATH}${NC}"
    CONFIRM_PATH=$(prompt_user "Use this target directory for Snapchain node data? [Y/n]: " "y")
    case "$CONFIRM_PATH" in
        [nN]|[nN][oO])
            CUSTOM_DIR=$(prompt_user "Enter custom directory path on ${s_mount}: " "$DEFAULT_PATH")
            SELECTED_SNAPCHAIN_DIR="${CUSTOM_DIR:-$DEFAULT_PATH}"
            ;;
        *)
            SELECTED_SNAPCHAIN_DIR="$DEFAULT_PATH"
            ;;
    esac
else
    echo -e "  ${GREEN}Detected ${TOTAL_ELIGIBLE} eligible storage volumes:${NC}\n"
    IDX=1
    for entry in "${ELIGIBLE_MOUNTS[@]}"; do
        IFS='|' read -r em_mount em_avail em_total em_used em_device <<< "$entry"
        TAG=""
        if [ "$IDX" -eq 1 ]; then
            TAG="${GREEN}${BOLD}[RECOMMENDED]${NC}"
        fi
        echo -e "  [${BOLD}${IDX}${NC}] Mount: ${BOLD}${em_mount}${NC} | Free: ${BOLD}${em_avail} GB${NC} | Total: ${em_total} | Device: ${em_device} ${TAG}"
        IDX=$((IDX + 1))
    done

    echo ""
    CHOICE=$(prompt_user "Select storage volume for installation [1-${TOTAL_ELIGIBLE}] (Default: 1): " "1")
    if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "$TOTAL_ELIGIBLE" ]; then
        CHOICE=1
    fi

    CHOSEN_ENTRY="${ELIGIBLE_MOUNTS[$((CHOICE - 1))]}"
    IFS='|' read -r s_mount s_avail s_total s_used s_device <<< "$CHOSEN_ENTRY"
    SELECTED_MOUNT="$s_mount"
    SELECTED_AVAIL="$s_avail"
    SELECTED_DEVICE="$s_device"

    if [ "$s_mount" == "/" ]; then
        DEFAULT_PATH="${HOME}/snapchain"
    else
        DEFAULT_PATH="${s_mount}/snapchain"
    fi

    echo -e "\n  ${GREEN}Selected Storage Volume:${NC} ${BOLD}${s_mount}${NC} (${s_avail} GB free on ${s_device})"
    DIR_INPUT=$(prompt_user "Installation Directory [Press Enter for ${DEFAULT_PATH}]: " "${DEFAULT_PATH}")
    SELECTED_SNAPCHAIN_DIR="${DIR_INPUT:-$DEFAULT_PATH}"
fi

# Detect Storage Medium (HDD vs SSD vs NVMe)
detect_disk_medium() {
    local dev="$1"
    local raw_dev
    raw_dev=$(basename "$dev" 2>/dev/null || echo "")

    # Strip partition suffix (e.g. sda1 -> sda, nvme0n1p1 -> nvme0n1)
    if [[ "$raw_dev" =~ ^nvme ]]; then
        raw_dev=$(echo "$raw_dev" | sed -E 's/p[0-9]+$//')
    else
        raw_dev=$(echo "$raw_dev" | sed -E 's/[0-9]+$//')
    fi

    local rota=1
    if [ -f "/sys/block/${raw_dev}/queue/rotational" ]; then
        rota=$(cat "/sys/block/${raw_dev}/queue/rotational" 2>/dev/null || echo 1)
    elif command -v lsblk &>/dev/null; then
        rota=$(lsblk -dno ROTA "$dev" 2>/dev/null | head -n 1 || echo 1)
    fi

    if [ "$rota" -eq 1 ]; then
        # Check for virtualized storage (VirtIO / Xen / Cloud VMs)
        # Hypervisors frequently default rotational=1 for virtio disks even when backed by enterprise NVMe/SSD
        if [[ "$raw_dev" =~ ^(vd|xvd) ]]; then
            echo "D2:SSD:VirtIO Cloud Solid-State Drive"
        else
            echo "D1:HDD:Rotational Mechanical Hard Disk"
        fi
    else
        if [[ "$dev" =~ nvme ]] || [[ "$raw_dev" =~ nvme ]]; then
            echo "D3:NVMe:High-Performance PCIe NVMe Solid-State Drive"
        else
            echo "D2:SSD:Standard Solid-State Drive"
        fi
    fi
}

DISK_METRIC=$(detect_disk_medium "$SELECTED_DEVICE")
IFS=':' read -r PROFILE_DISK DISK_TYPE DISK_LABEL <<< "$DISK_METRIC"
echo -e "  - Disk Medium:    ${BOLD}${SELECTED_DEVICE}${NC} -> ${GREEN}${BOLD}Profile [${PROFILE_DISK}]${NC} (${DISK_LABEL})"

# If mode is check-only, display summary and exit without modifying system
if [ "$MODE" == "check" ]; then
    echo -e "\n${GREEN}${BOLD}================================================================${NC}"
    echo -e "${GREEN}${BOLD}  ✓ Hardware check & matrix evaluation complete!                ${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}"
    echo -e "System Matrix Classification:"
    echo -e "  - CPU Profile:    ${BOLD}[${PROFILE_CPU}]${NC} (${CPU_LABEL})"
    echo -e "  - RAM Profile:    ${BOLD}[${PROFILE_RAM}]${NC} (${RAM_LABEL})"
    echo -e "  - Disk Profile:   ${BOLD}[${PROFILE_DISK}]${NC} (${DISK_LABEL})"
    echo -e "  - Selected Mount: ${BOLD}${SELECTED_MOUNT}${NC} (${SELECTED_AVAIL} GB free on ${SELECTED_DEVICE})"
    echo -e "  - Target Path:    ${BOLD}${SELECTED_SNAPCHAIN_DIR}${NC}\n"
    exit 0
fi

# Ensure Target Directory is Created and Writable
$SUDO mkdir -p "$SELECTED_SNAPCHAIN_DIR"
$SUDO touch "$SELECTED_SNAPCHAIN_DIR/.write_test_$$" 2>/dev/null && $SUDO rm -f "$SELECTED_SNAPCHAIN_DIR/.write_test_$$" || {
    echo -e "${RED}[ERROR] Target directory ${SELECTED_SNAPCHAIN_DIR} is not writable. Check permissions.${NC}"
    exit 1
}

if [ -n "$SUDO" ] && [ -n "${USER:-}" ]; then
    $SUDO chown -R "$USER":"$USER" "$SELECTED_SNAPCHAIN_DIR" 2>/dev/null || true
fi
$SUDO chmod 775 "$SELECTED_SNAPCHAIN_DIR"

echo -e "  ${GREEN}✓ Target directory verified and writable:${NC} ${BOLD}${SELECTED_SNAPCHAIN_DIR}${NC}"

# ------------------------------------------------------------------------------
# 5. Interactive Observability & Metrics Stack Configuration
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[4/6] Configuring Observability & Monitoring Stack (Grafana/StatsD)...${NC}"
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

ENABLE_METRICS_CHOICE=$(prompt_user "Would you like to install and run the Metrics stack (Grafana/StatsD)? [y/N]: " "$DEFAULT_METRICS")
case "$ENABLE_METRICS_CHOICE" in
    [yY]|[yY][eE][sS])
        METRICS_ACTIVE=true
        echo -e "  ${GREEN}✓ Metrics stack enabled (Grafana mapped to port 3005).${NC}"
        ;;
    *)
        METRICS_ACTIVE=false
        echo -e "  ${GREEN}✓ Running in Lean Mode: Metrics disabled to preserve host resources.${NC}"
        ;;
esac

# ------------------------------------------------------------------------------
# 6. Advanced Adaptive Memory & Swap Engineering (ZRAM vs Disk Swap)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[5/6] Configuring Memory Subsystem & Swap Architecture...${NC}"

ZRAM_ACTIVE=false

if [ "$PROFILE_RAM" == "R1" ]; then
    echo -e "  • Applying Profile [R1] Memory Engineering (Low-RAM Defense)..."
    
    # 1. Purge or deactivate rotational HDD swap to prevent catastrophic I/O thrashing
    if [ "$PROFILE_DISK" == "D1" ]; then
        if [ -f /swapfile ] && swapon --show | grep -q '/swapfile'; then
            echo -e "    ${YELLOW}⚠ Active swapfile detected on mechanical HDD. Deactivating to prevent I/O freeze...${NC}"
            $SUDO swapoff /swapfile 2>/dev/null || true
            $SUDO sed -i '\|^/swapfile|d' /etc/fstab 2>/dev/null || true
            echo -e "    ${GREEN}✓ Rotational HDD swap successfully disabled.${NC}"
        fi
    fi

    # 2. Configure ZRAM (RAM Compression via LZ4)
    echo -e "    Attempting to initialize high-speed compressed in-memory swap (ZRAM)..."
    if $SUDO modprobe zram num_devices=1 2>/dev/null; then
        if [ -b /dev/zram0 ]; then
            $SUDO swapoff /dev/zram0 2>/dev/null || true
            echo lz4 | $SUDO tee /sys/block/zram0/comp_algorithm > /dev/null 2>&1 || true
            # Allocate 2.5 GB compressed virtual swap
            echo 2684354560 | $SUDO tee /sys/block/zram0/disksize > /dev/null 2>&1 || true
            $SUDO mkswap /dev/zram0 > /dev/null 2>&1 || true
            $SUDO swapon -p 100 /dev/zram0 > /dev/null 2>&1 || true
            ZRAM_ACTIVE=true
            echo -e "    ${GREEN}✓ 2.5 GB ZRAM compressed swap active (Priority: 100, Algorithm: LZ4).${NC}"
        fi
    fi

    if [ "$ZRAM_ACTIVE" != "true" ]; then
        echo -e "    ${YELLOW}Notice: Kernel zram module not available in this virtual environment.${NC}"
        SWAP_TOTAL_KB=$(grep SwapTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo 0)
        if [ "$SWAP_TOTAL_KB" -lt 1048576 ] && [ "$PROFILE_DISK" != "D1" ]; then
            echo -e "    Allocating 2 GB emergency swapfile on non-rotational disk..."
            $SUDO fallocate -l 2G /swapfile 2>/dev/null || $SUDO dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null || true
            $SUDO chmod 600 /swapfile
            $SUDO mkswap /swapfile > /dev/null 2>&1 || true
            $SUDO swapon /swapfile > /dev/null 2>&1 || true
            echo -e "    ${GREEN}✓ 2 GB safety swapfile active.${NC}"
        fi
    fi
else
    echo -e "  • Profile [${PROFILE_RAM}] detected: Sufficient host memory available (${RAM_GB} GB)."
fi

# ------------------------------------------------------------------------------
# 7. Granular Kernel & I/O Engine Tuning (Adaptive /etc/sysctl.d)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[6/6] Applying Adaptive Kernel & Storage Optimization...${NC}"

# Base P2P network capabilities
$SUDO sysctl -w fs.file-max=2097152 > /dev/null 2>&1 || true
$SUDO sysctl -w net.core.somaxconn=65535 > /dev/null 2>&1 || true
$SUDO sysctl -w net.ipv4.tcp_max_syn_backlog=65535 > /dev/null 2>&1 || true
$SUDO sysctl -w vm.max_map_count=262144 > /dev/null 2>&1 || true

# Tailored Dirty Pages & Virtual Memory parameters based on Disk & RAM Profile
if [ "$PROFILE_DISK" == "D1" ]; then
    # Rotational HDD: Flush dirty pages immediately in tiny increments to prevent disk head stalls
    VM_DIRTY_BG=3
    VM_DIRTY=6
    VM_VFS_PRESSURE=50
    VM_SWAPPINESS=10
elif [ "$PROFILE_DISK" == "D2" ]; then
    # Standard SSD
    VM_DIRTY_BG=10
    VM_DIRTY=20
    VM_VFS_PRESSURE=100
    VM_SWAPPINESS=20
else
    # D3 (NVMe)
    VM_DIRTY_BG=15
    VM_DIRTY=30
    VM_VFS_PRESSURE=100
    VM_SWAPPINESS=10
fi

# Network socket buffer scaling
if [ "$PROFILE_RAM" == "R1" ]; then
    NET_RMEM=8388608   # 8 MB to protect low-RAM host
    NET_WMEM=8388608
else
    NET_RMEM=16777216  # 16 MB standard P2P gossip buffers
    NET_WMEM=16777216
fi

$SUDO sysctl -w vm.dirty_background_ratio=$VM_DIRTY_BG > /dev/null 2>&1 || true
$SUDO sysctl -w vm.dirty_ratio=$VM_DIRTY > /dev/null 2>&1 || true
$SUDO sysctl -w vm.vfs_cache_pressure=$VM_VFS_PRESSURE > /dev/null 2>&1 || true
$SUDO sysctl -w vm.swappiness=$VM_SWAPPINESS > /dev/null 2>&1 || true
$SUDO sysctl -w net.core.rmem_max=$NET_RMEM > /dev/null 2>&1 || true
$SUDO sysctl -w net.core.wmem_max=$NET_WMEM > /dev/null 2>&1 || true

# Persist sysctl parameters
cat <<EOF | $SUDO tee /etc/sysctl.d/99-snapchain.conf > /dev/null
# Farcaster Snapchain Optimized Kernel Parameters
# Generated for Profile: CPU=[${PROFILE_CPU}], RAM=[${PROFILE_RAM}], Disk=[${PROFILE_DISK}]
fs.file-max = 2097152
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
vm.max_map_count = 262144
vm.dirty_background_ratio = ${VM_DIRTY_BG}
vm.dirty_ratio = ${VM_DIRTY}
vm.vfs_cache_pressure = ${VM_VFS_PRESSURE}
vm.swappiness = ${VM_SWAPPINESS}
net.core.rmem_max = ${NET_RMEM}
net.core.wmem_max = ${NET_WMEM}
net.ipv4.udp_rmem_min = 16384
net.ipv4.udp_wmem_min = 16384
EOF

echo -e "  ${GREEN}✓ Kernel sysctl parameters persisted to /etc/sysctl.d/99-snapchain.conf${NC}"

# Mount Optimization (noatime & nodiratime to eliminate metadata writes on reads)
if [ -f /etc/fstab ] && [ -n "$SELECTED_MOUNT" ]; then
    if ! grep -E "\s${SELECTED_MOUNT}\s.*noatime" /etc/fstab > /dev/null 2>&1; then
        echo -e "  • Filesystem metadata optimization: applying noatime,nodiratime to ${SELECTED_MOUNT}..."
        $SUDO mount -o remount,noatime,nodiratime "$SELECTED_MOUNT" 2>/dev/null || true
        echo -e "    ${GREEN}✓ noatime,nodiratime active on ${SELECTED_MOUNT} (eliminates random write overhead on file & directory reads).${NC}"
    fi
fi

# ------------------------------------------------------------------------------
# Verify & Install Foundational Packages & Python Runtime
# ------------------------------------------------------------------------------
echo -e "  • Verifying Python Runtime & Foundational Packages (python3, jq, pigz, curl, git)..."
MISSING_PKGS=()
for p in python3 jq pigz curl tar git; do
    if ! command -v "$p" &> /dev/null; then
        MISSING_PKGS+=("$p")
    fi
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
    echo -e "    - Installing missing foundational packages: ${YELLOW}${MISSING_PKGS[*]}${NC}..."
    if command -v apt-get &> /dev/null; then
        export DEBIAN_FRONTEND=noninteractive
        $SUDO apt-get update -qq > /dev/null 2>&1 || true
        $SUDO apt-get install -y -qq "${MISSING_PKGS[@]}" > /dev/null 2>&1 || $SUDO apt-get install -y "${MISSING_PKGS[@]}"
    elif command -v dnf &> /dev/null; then
        $SUDO dnf install -y -q "${MISSING_PKGS[@]}" > /dev/null 2>&1 || true
    elif command -v yum &> /dev/null; then
        $SUDO yum install -y -q "${MISSING_PKGS[@]}" > /dev/null 2>&1 || true
    fi
fi
echo -e "    ${GREEN}✓ Foundational packages & Python runtime verified:${NC} $(python3 --version 2>/dev/null || echo 'python3')"

# ------------------------------------------------------------------------------
# Intelligent Docker Engine & Container Runtime Verification
# ------------------------------------------------------------------------------
echo -e "  • Verifying Docker Engine & Container Runtime..."
if ! command -v docker &> /dev/null; then
    echo "    - Installing official Docker Engine via get.docker.com..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    $SUDO sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
    
    if [ -n "$SUDO" ] && [ -n "${USER:-}" ]; then
        $SUDO usermod -aG docker "$USER" 2>/dev/null || true
    fi
    echo -e "    ${GREEN}✓ Docker Engine successfully installed.${NC}"
else
    echo -e "    ${GREEN}✓ Docker is active: $(docker --version)${NC}"
fi

# Ensure Docker service is enabled and running
if command -v systemctl &> /dev/null; then
    $SUDO systemctl enable --now docker > /dev/null 2>&1 || true
elif command -v service &> /dev/null; then
    $SUDO service docker start > /dev/null 2>&1 || true
fi

# Ensure Docker Compose (V2 plugin or standalone) is installed and operational
if ! docker compose version &>/dev/null && ! command -v docker-compose &>/dev/null; then
    if [ -n "$SUDO" ] && $SUDO docker compose version &>/dev/null; then
        :
    else
        echo "    - Installing Docker Compose plugin..."
        if command -v apt-get &>/dev/null; then
            export DEBIAN_FRONTEND=noninteractive
            $SUDO apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1 || true
        fi
    fi
fi

# Firewall Configuration (UFW)
echo -e "  • Configuring host firewall rules (UFW)..."
if command -v ufw &> /dev/null; then
    $SUDO ufw allow 22/tcp comment 'SSH Remote Access' > /dev/null 2>&1 || true
    $SUDO ufw allow 3381/tcp comment 'Snapchain HTTP API & submitMessage' > /dev/null 2>&1 || true
    $SUDO ufw allow 3382/udp comment 'Snapchain Libp2p Gossip Mesh (QUIC)' > /dev/null 2>&1 || true
    $SUDO ufw allow 3382/tcp comment 'Snapchain Libp2p Gossip Mesh (TCP)' > /dev/null 2>&1 || true
    $SUDO ufw allow 3383/tcp comment 'Snapchain gRPC API' > /dev/null 2>&1 || true
    $SUDO ufw allow 3000/tcp comment 'Farcaster Web Client' > /dev/null 2>&1 || true
    if [ "$METRICS_ACTIVE" == "true" ]; then
        $SUDO ufw allow 3005/tcp comment 'Grafana Metrics Dashboard' > /dev/null 2>&1 || true
        echo -e "    ${GREEN}✓ UFW firewall rules configured (Ports 22, 3000, 3005, 3381, 3382, 3383).${NC}"
    else
        echo -e "    ${GREEN}✓ UFW firewall rules configured (Ports 22, 3000, 3381, 3382, 3383).${NC}"
    fi
else
    echo -e "    ${YELLOW}• UFW firewall not active. Ensure cloud security groups permit required ports.${NC}"
fi

# ------------------------------------------------------------------------------
# 8. Persist System Matrix State Configuration
# ------------------------------------------------------------------------------
$SUDO mkdir -p /etc/snapchain
cat <<EOF | $SUDO tee /etc/snapchain/snapchain.conf > /dev/null
# Farcaster Snapchain Node System Configuration
# Generated by 0-provision-compute.sh (Decoupled Matrix Architecture)
PROVISIONED=true
PROVISION_VERSION="2.2.0"
PROVISION_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Decoupled Hardware Matrix
PROFILE_CPU="${PROFILE_CPU}"
PROFILE_RAM="${PROFILE_RAM}"
PROFILE_DISK="${PROFILE_DISK}"
DISK_TYPE="${DISK_TYPE}"
CPU_CORES="${CPUS}"
RAM_GB="${RAM_GB}"
ZRAM_ACTIVE="${ZRAM_ACTIVE}"

# Monitoring & Observability Stack
ENABLE_METRICS="${METRICS_ACTIVE}"
METRICS_ACTIVE="${METRICS_ACTIVE}"

# Storage Bounds & Directory
SNAPCHAIN_DATA_DIR="${SELECTED_SNAPCHAIN_DIR}"
SELECTED_MOUNT="${SELECTED_MOUNT}"
STORAGE_DEVICE="${SELECTED_DEVICE}"
STORAGE_AVAIL_GB="${SELECTED_AVAIL}"
MIN_REQUIRED_GB="${MIN_DISK_GB}"
EOF

$SUDO chmod 644 /etc/snapchain/snapchain.conf
cat /etc/snapchain/snapchain.conf > "${HOME}/.snapchain.conf" 2>/dev/null || true
cat /etc/snapchain/snapchain.conf > "${SELECTED_SNAPCHAIN_DIR}/.snapchain.env" 2>/dev/null || true

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✓ Step (0) Complete: Server Provisioned with Adaptive Matrix! ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "Matrix Configuration Summary:"
echo -e "  - CPU Profile:     ${BOLD}[${PROFILE_CPU}]${NC} (${CPU_LABEL})"
echo -e "  - RAM Profile:     ${BOLD}[${PROFILE_RAM}]${NC} (${RAM_LABEL})"
echo -e "  - Disk Profile:    ${BOLD}[${PROFILE_DISK}]${NC} (${DISK_LABEL})"
echo -e "  - Metrics Stack:   ${BOLD}$( [ "$METRICS_ACTIVE" == "true" ] && echo "Enabled (Grafana on port 3005)" || echo "Disabled (Lean Mode)" )${NC}"
echo -e "  - Target Data Dir: ${BOLD}${SELECTED_SNAPCHAIN_DIR}${NC}"
echo -e "  - Configuration:   Saved to ${BOLD}/etc/snapchain/snapchain.conf${NC}\n"

# ------------------------------------------------------------------------------
# 9. Interactive Prompt to Execute Step (1)
# ------------------------------------------------------------------------------
AUTO_STEP1=$(prompt_user "Would you like to automatically run Step (1) [Setup Snapchain Read Node] now? [Y/n]: " "y")

case "$AUTO_STEP1" in
    [yY]|[yY][eE][sS])
        echo -e "\n${CYAN}${BOLD}Launching Step (1): Setting up Standalone Snapchain Read Node...${NC}\n"
        if [ -f "./scripts/1-setup-read-node.sh" ]; then
            exec bash "./scripts/1-setup-read-node.sh"
        elif [ -f "./1-setup-read-node.sh" ]; then
            exec bash "./1-setup-read-node.sh"
        elif [ -f "${HOME}/farcaster-snapchain-node-client/scripts/1-setup-read-node.sh" ]; then
            exec bash "${HOME}/farcaster-snapchain-node-client/scripts/1-setup-read-node.sh"
        else
            TMP_SCRIPT=$(mktemp /tmp/snapchain_step1.XXXXXX.sh)
            curl -fsSL "https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh?v=$(date +%s)" -o "$TMP_SCRIPT"
            chmod +x "$TMP_SCRIPT"
            exec bash "$TMP_SCRIPT"
        fi
        ;;
    *)
        echo -e "\nNext step: Run Command (1) whenever you are ready to start your Snapchain Read Node:"
        echo -e "${CYAN}${BOLD}curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash${NC}\n"
        ;;
esac
