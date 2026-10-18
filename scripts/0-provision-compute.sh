#!/usr/bin/env bash
# ==============================================================================
# Command (0): Provision & Prepare Compute for Farcaster Snapchain Read Node
# Part of Farcaster Client & Node Suite (MIT License)
# Repository: https://github.com/mohammadma98/farcaster-snapchain-node-client
#
# Hardware Targets (Mainnet Read Node):
# - 4 CPU Cores (vCPUs)  [Minimum: 2 Cores]
# - 16 GB RAM            [Minimum: 4 GB]
# - 1.5 TB SSD (gp3/NVMe) [Minimum: 100 GB for initial sync snapshot & RocksDB]
# - Public IPv4 with ports 22 (SSH), 3381 (HTTP), 3382 (Gossip), 3383 (gRPC), 3000 (Web), 3005 (Grafana)
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

    # Output prompt message to stderr so user sees it in terminal without polluting subshell stdout
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

# Minimum & Recommended Specifications (Aligned with official farcasterxyz/snapchain standards)
MIN_CPUS=2
REC_CPUS=4
MIN_RAM_GB=4
REC_RAM_GB=16
MIN_DISK_GB=100
REC_DISK_GB=1500

# ------------------------------------------------------------------------------
# 2. Hardware Inspection & Preliminary Assessment
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[1/5] Inspecting System Hardware Specifications...${NC}"

# Detect CPU cores
CPUS=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || grep -c ^processor /proc/cpuinfo 2>/dev/null || echo 1)
echo -e "  - CPU Cores:      ${BOLD}${CPUS}${NC} (Minimum: ${MIN_CPUS}, Recommended: ${REC_CPUS}+)"

# Detect RAM
if [ -f /proc/meminfo ]; then
    RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    RAM_GB=$(( RAM_KB / 1024 / 1024 ))
else
    RAM_GB=16
fi
echo -e "  - System Memory:  ${BOLD}${RAM_GB} GB${NC} (Minimum: ${MIN_RAM_GB} GB, Recommended: ${REC_RAM_GB} GB+)"

# Detect Available Block Storage Mounts (Excluding virtual, boot, and small mounts)
echo -e "  - Storage Bounds: Official Recommended: ${BOLD}${REC_DISK_GB} GB (1.5 TB SSD)${NC} | Minimum Working Space: ${BOLD}${MIN_DISK_GB} GB${NC}"

# ------------------------------------------------------------------------------
# 3. Network Ports Inspection
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[2/5] Inspecting Required Network Ports...${NC}"

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
        # Port 22 is expected to be in use for SSH
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
# 4. Hardware Verification & Policy Enforcement
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[3/5] Evaluating Hardware Sufficiency...${NC}"

# Critical Insufficiency Check (Cannot install on critically low hardware)
if [ "$CPUS" -lt "$MIN_CPUS" ] || [ "$RAM_GB" -lt "$MIN_RAM_GB" ]; then
    echo -e "${RED}${BOLD}================================================================${NC}"
    echo -e "${RED}${BOLD}[FATAL ERROR] Insufficient Server Hardware Resources!${NC}"
    echo -e "${RED}${BOLD}================================================================${NC}"
    echo -e "${RED}This script cannot be installed on this server.${NC}"
    echo -e "Snapchain Read Node and Tendermint engine require minimum hardware to operate without crashing:"
    echo -e "  - Minimum Required: ${BOLD}${MIN_CPUS} CPU Cores, ${MIN_RAM_GB} GB RAM${NC}"
    echo -e "  - Detected System:  ${BOLD}${CPUS} CPU Cores, ${RAM_GB} GB RAM${NC}"
    echo -e "  - Official Specs:   ${BOLD}${REC_CPUS}+ CPU Cores, ${REC_RAM_GB}+ GB RAM, 1.5 TB SSD${NC}\n"
    echo -e "${RED}Installation terminated. Please upgrade this server to meet minimum requirements.${NC}"
    
    # Invalidate any prior configuration
    $SUDO rm -f /etc/snapchain/snapchain.conf 2>/dev/null || true
    exit 1
fi

# Warning & Confirmation for Sub-optimal Resources
HARDWARE_SUBOPTIMAL=0
if [ "$CPUS" -lt "$REC_CPUS" ] || [ "$RAM_GB" -lt "$REC_RAM_GB" ]; then
    HARDWARE_SUBOPTIMAL=1
    echo -e "  ${YELLOW}${BOLD}⚠ Hardware Warning: Server is below official recommended specs:${NC}"
    if [ "$CPUS" -lt "$REC_CPUS" ]; then
        echo -e "    • CPU Cores (${CPUS}) is below recommended ${REC_CPUS}+ cores. Block synchronization and RocksDB compaction will be slower."
    fi
    if [ "$RAM_GB" -lt "$REC_RAM_GB" ]; then
        echo -e "    • System RAM (${RAM_GB} GB) is below recommended ${REC_RAM_GB} GB+. Tendermint consensus may experience memory pressure during high gossip volume."
    fi
    echo -e "  ${YELLOW}Server meets minimum operational threshold (${MIN_CPUS} Cores / ${MIN_RAM_GB} GB RAM), but performance may degrade.${NC}\n"
    
    if [ "$MODE" != "check" ]; then
        CONFIRM_RES=$(prompt_user "Do you want to confirm and proceed with this configuration? [y/N]: " "n")
        case "$CONFIRM_RES" in
            [yY]|[yY][eE][sS])
                echo -e "  ${GREEN}✓ Operator confirmation received. Proceeding with installation.${NC}"
                ;;
            *)
                echo -e "${RED}[ABORTED] Installation stopped by operator.${NC}"
                exit 0
                ;;
        esac
    fi
else
    echo -e "  ${GREEN}✓ CPU cores and System RAM satisfy all recommended specifications.${NC}"
fi

# ------------------------------------------------------------------------------
# 5. Storage Analysis & Operator Volume Selection
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[4/5] Analyzing Available Storage Volumes...${NC}"

# Parse all real block storage devices with >= MIN_DISK_GB (100 GB) free space
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
    echo -e "${RED}${BOLD}================================================================${NC}"
    echo -e "${RED}${BOLD}[FATAL ERROR] Insufficient Free Storage Space!${NC}"
    echo -e "${RED}${BOLD}================================================================${NC}"
    echo -e "${RED}No storage volume on this server has at least ${MIN_DISK_GB} GB of free space.${NC}"
    echo -e "Official Snapchain specification requires ${BOLD}${REC_DISK_GB} GB (1.5 TB SSD)${NC} for archive retention,"
    echo -e "and an absolute minimum of ${BOLD}${MIN_DISK_GB} GB${NC} to download initial snapshots and initialize RocksDB."
    echo -e "\nDetected block partitions:"
    df -h -x tmpfs -x devtmpfs -x overlay -x squashfs -x efivarfs 2>/dev/null || df -h
    echo -e "\n${RED}Please attach additional storage (e.g., 500 GB - 2 TB NVMe/SSD) and re-run.${NC}"
    exit 1
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

    echo -e "  Found 1 eligible storage volume with sufficient capacity:"
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
    echo -e "  ${GREEN}Detected ${TOTAL_ELIGIBLE} eligible storage volumes (>= ${MIN_DISK_GB} GB free space):${NC}\n"
    IDX=1
    for entry in "${ELIGIBLE_MOUNTS[@]}"; do
        IFS='|' read -r em_mount em_avail em_total em_used em_device <<< "$entry"
        TAG=""
        if [ "$IDX" -eq 1 ]; then
            TAG="${GREEN}${BOLD}[RECOMMENDED - Largest Free Space]${NC}"
        fi
        echo -e "  [${BOLD}${IDX}${NC}] Mount: ${BOLD}${em_mount}${NC} | Free: ${BOLD}${em_avail} GB${NC} | Total: ${em_total} | Device: ${em_device} ${TAG}"
        IDX=$((IDX + 1))
    done

    echo ""
    CHOICE=$(prompt_user "Select storage volume for Snapchain node installation [1-${TOTAL_ELIGIBLE}] (Default: 1): " "1")
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

# If mode is check-only, display summary and exit without modifying system
if [ "$MODE" == "check" ]; then
    echo -e "\n${GREEN}${BOLD}================================================================${NC}"
    echo -e "${GREEN}${BOLD}  ✓ Hardware check & storage evaluation complete!               ${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}"
    echo -e "System Summary:"
    echo -e "  - CPU Cores:      ${BOLD}${CPUS}${NC}"
    echo -e "  - System RAM:     ${BOLD}${RAM_GB} GB${NC}"
    echo -e "  - Target Storage: ${BOLD}${SELECTED_MOUNT}${NC} (${SELECTED_AVAIL} GB available on ${SELECTED_DEVICE})"
    echo -e "  - Proposed Path:  ${BOLD}${SELECTED_SNAPCHAIN_DIR}${NC}\n"
    exit 0
fi

# Ensure Target Directory is Created and Writable
$SUDO mkdir -p "$SELECTED_SNAPCHAIN_DIR"
$SUDO touch "$SELECTED_SNAPCHAIN_DIR/.write_test_$$" 2>/dev/null && $SUDO rm -f "$SELECTED_SNAPCHAIN_DIR/.write_test_$$" || {
    echo -e "${RED}[ERROR] Target directory ${SELECTED_SNAPCHAIN_DIR} is not writable. Check permissions.${NC}"
    exit 1
}

# If running non-root, ensure user has ownership
if [ -n "$SUDO" ] && [ -n "${USER:-}" ]; then
    $SUDO chown -R "$USER":"$USER" "$SELECTED_SNAPCHAIN_DIR" 2>/dev/null || true
fi
$SUDO chmod 775 "$SELECTED_SNAPCHAIN_DIR"

echo -e "  ${GREEN}✓ Target directory verified and writable:${NC} ${BOLD}${SELECTED_SNAPCHAIN_DIR}${NC}"

# ------------------------------------------------------------------------------
# 6. Automated Docker, Firewall, and Kernel Tuning
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}[5/5] Configuring System Services & Runtime Environment...${NC}"

# Docker Engine & Compose
echo -e "  • Verifying Docker Engine & Container Runtime..."
if ! command -v docker &> /dev/null; then
    echo "    - Docker not detected. Installing official Docker Engine..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    $SUDO sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
    
    if [ -n "$SUDO" ] && [ -n "${USER:-}" ]; then
        $SUDO usermod -aG docker "$USER" 2>/dev/null || true
    fi
    echo -e "    ${GREEN}✓ Docker Engine successfully installed.${NC}"
else
    echo -e "    ${GREEN}✓ Docker is already installed: $(docker --version)${NC}"
fi

if command -v systemctl &> /dev/null; then
    $SUDO systemctl enable --now docker > /dev/null 2>&1 || true
    echo -e "    ${GREEN}✓ Docker service enabled and active.${NC}"
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
    $SUDO ufw allow 3005/tcp comment 'Grafana Metrics Dashboard' > /dev/null 2>&1 || true

    echo -e "    ${GREEN}✓ UFW rules configured:${NC}"
    echo -e "      - Port 22/tcp        (SSH)"
    echo -e "      - Port 3381/tcp      (HTTP API & Writes)"
    echo -e "      - Port 3382/udp+tcp  (P2P Gossip Mesh - QUIC & TCP)"
    echo -e "      - Port 3383/tcp      (gRPC API)"
    echo -e "      - Port 3000/tcp      (Farcaster Web Client)"
    echo -e "      - Port 3005/tcp      (Grafana Metrics)"
else
    echo -e "    ${YELLOW}• UFW firewall not active. Ensure cloud security groups permit ports 22, 3000, 3005, 3381, 3382 (UDP/TCP), 3383.${NC}"
fi

# Kernel Tuning for P2P Gossip Throughput & RocksDB
echo -e "  • Tuning Linux kernel network buffers and virtual memory..."
$SUDO sysctl -w fs.file-max=2097152 > /dev/null 2>&1 || true
$SUDO sysctl -w net.core.somaxconn=65535 > /dev/null 2>&1 || true
$SUDO sysctl -w net.ipv4.tcp_max_syn_backlog=65535 > /dev/null 2>&1 || true
$SUDO sysctl -w net.core.rmem_max=16777216 > /dev/null 2>&1 || true
$SUDO sysctl -w net.core.wmem_max=16777216 > /dev/null 2>&1 || true
$SUDO sysctl -w net.ipv4.udp_rmem_min=16384 > /dev/null 2>&1 || true
$SUDO sysctl -w net.ipv4.udp_wmem_min=16384 > /dev/null 2>&1 || true
$SUDO sysctl -w vm.max_map_count=262144 > /dev/null 2>&1 || true

# Persist kernel tuning
if [ -d /etc/sysctl.d ]; then
    cat <<EOF | $SUDO tee /etc/sysctl.d/99-snapchain.conf > /dev/null
# Snapchain P2P Gossip & RocksDB Optimization
fs.file-max = 2097152
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.udp_rmem_min = 16384
net.ipv4.udp_wmem_min = 16384
vm.max_map_count = 262144
EOF
    echo -e "    ${GREEN}✓ Kernel parameters saved to /etc/sysctl.d/99-snapchain.conf${NC}"
elif [ -w /etc/sysctl.conf ]; then
    echo -e "\n# Snapchain P2P Tuning\nfs.file-max=2097152\nnet.core.somaxconn=65535\nvm.max_map_count=262144" | $SUDO tee -a /etc/sysctl.conf > /dev/null
    echo -e "    ${GREEN}✓ Kernel parameters appended to /etc/sysctl.conf${NC}"
fi

# ------------------------------------------------------------------------------
# 7. Persist Node Provisioning State
# ------------------------------------------------------------------------------
$SUDO mkdir -p /etc/snapchain
cat <<EOF | $SUDO tee /etc/snapchain/snapchain.conf > /dev/null
# Farcaster Snapchain Node System Configuration
# Generated by 0-provision-compute.sh
PROVISIONED=true
HARDWARE_SUPPORTED=true
PROVISION_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
SNAPCHAIN_DATA_DIR="${SELECTED_SNAPCHAIN_DIR}"
SELECTED_MOUNT="${SELECTED_MOUNT}"
STORAGE_DEVICE="${SELECTED_DEVICE}"
STORAGE_AVAIL_GB="${SELECTED_AVAIL}"
CPU_CORES="${CPUS}"
RAM_GB="${RAM_GB}"
PROVISION_VERSION="2.0.0"
EOF

$SUDO chmod 644 /etc/snapchain/snapchain.conf

# Mirror configuration to user home and data directory for easy lookup
cat /etc/snapchain/snapchain.conf > "${HOME}/.snapchain.conf" 2>/dev/null || true
cat /etc/snapchain/snapchain.conf > "${SELECTED_SNAPCHAIN_DIR}/.snapchain.env" 2>/dev/null || true

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✓ Step (0) Complete: Server is fully provisioned and ready!   ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "Provisioned Configuration Summary:"
echo -e "  - Data Directory:  ${BOLD}${SELECTED_SNAPCHAIN_DIR}${NC}"
echo -e "  - Storage Volume:  ${BOLD}${SELECTED_MOUNT}${NC} (${SELECTED_AVAIL} GB available on ${SELECTED_DEVICE})"
echo -e "  - System Specs:    ${BOLD}${CPUS} CPU Cores / ${RAM_GB} GB RAM${NC}"
echo -e "  - System State:    Saved to ${BOLD}/etc/snapchain/snapchain.conf${NC}\n"

# ------------------------------------------------------------------------------
# 8. Interactive Prompt to Execute Step (1) Automatically
# ------------------------------------------------------------------------------
AUTO_STEP1=$(prompt_user "Would you like to automatically run Step (1) [Setup Snapchain Read Node] now? [Y/n]: " "y")

case "$AUTO_STEP1" in
    [yY]|[yY][eE][sS])
        echo -e "\n${CYAN}${BOLD}Launching Step (1): Setting up Standalone Snapchain Read Node...${NC}\n"
        
        # Check if local script exists
        if [ -f "./scripts/1-setup-read-node.sh" ]; then
            exec bash "./scripts/1-setup-read-node.sh"
        elif [ -f "./1-setup-read-node.sh" ]; then
            exec bash "./1-setup-read-node.sh"
        else
            exec bash -c "$(curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh)"
        fi
        ;;
    *)
        echo -e "\nNext step: Run Command (1) whenever you are ready to start your Snapchain Read Node:"
        echo -e "${CYAN}${BOLD}curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash${NC}\n"
        ;;
esac
