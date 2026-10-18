#!/usr/bin/env bash
# ==============================================================================
# Command (0): Provision & Prepare Compute for Farcaster Snapchain Read Node
# Part of Farcaster Client & Node Suite (MIT License)
#
# Hardware Targets (Mainnet Read Node):
# - 4 CPU Cores (vCPUs)
# - 16 GB RAM
# - 2 TB SSD (gp3 or NVMe)
# - Public IPv4 with ports 22 (SSH), 3381 (HTTP), 3382 (Gossip), 3383 (gRPC)
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

# Optional mode parameter: 'check' or default full setup
MODE="${1:-setup}"

# 2. System Hardware Specification Verification
check_system_specs() {
    echo -e "\n${CYAN}${BOLD}[1/4] Verifying hardware specifications...${NC}"
    
    # Check CPU Cores
    CPUS=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)
    echo -e "  • CPU Cores: ${BOLD}${CPUS}${NC} (Recommended: 4+)"

    # Check RAM
    if [ -f /proc/meminfo ]; then
        RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        RAM_GB=$(( RAM_KB / 1024 / 1024 ))
    else
        RAM_GB=16 # fallback
    fi
    echo -e "  • System Memory: ${BOLD}${RAM_GB} GB${NC} (Recommended: 16 GB+)"

    # Check Disk Space
    DISK_GB=$(df -BG . | tail -1 | awk '{print $4}' | tr -d 'G')
    echo -e "  • Available Storage: ${BOLD}${DISK_GB} GB${NC} (Recommended: ~2000 GB / 2 TB)"

    if [ "$CPUS" -lt 4 ]; then
        echo -e "  ${YELLOW}⚠ Warning: CPU cores (${CPUS}) is below the recommended 4 cores. Synchronization may be slower.${NC}"
    else
        echo -e "  ${GREEN}✓ CPU cores requirement satisfied.${NC}"
    fi

    if [ "$RAM_GB" -lt 14 ]; then
        echo -e "  ${YELLOW}⚠ Warning: RAM (${RAM_GB}GB) is below the recommended 16GB. Tendermint consensus may experience memory pressure.${NC}"
    else
        echo -e "  ${GREEN}✓ Memory requirement satisfied.${NC}"
    fi
}

# 3. Install Docker Engine & Container Runtime
configure_docker() {
    echo -e "\n${CYAN}${BOLD}[2/4] Verifying and configuring Docker Engine...${NC}"

    if ! command -v docker &> /dev/null; then
        echo "  • Docker not detected. Installing official Docker Engine..."
        curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
        $SUDO sh /tmp/get-docker.sh
        rm -f /tmp/get-docker.sh
        
        if [ -n "$SUDO" ] && [ -n "${USER:-}" ]; then
            $SUDO usermod -aG docker "$USER" || true
        fi
        echo -e "  ${GREEN}✓ Docker Engine successfully installed.${NC}"
    else
        echo -e "  ${GREEN}✓ Docker is already installed: $(docker --version)${NC}"
    fi

    # Ensure Docker daemon is active and enabled
    if command -v systemctl &> /dev/null; then
        $SUDO systemctl enable --now docker > /dev/null 2>&1 || true
        echo -e "  ${GREEN}✓ Docker service enabled and running.${NC}"
    fi
}

# 4. Configure Firewall & Network Ports
configure_firewall() {
    echo -e "\n${CYAN}${BOLD}[3/4] Configuring firewall and opening required ports...${NC}"

    if command -v ufw &> /dev/null; then
        # Ensure SSH is open first so operator is never locked out
        $SUDO ufw allow 22/tcp comment 'SSH Remote Access' > /dev/null 2>&1 || true
        
        # Snapchain Ports
        $SUDO ufw allow 3381/tcp comment 'Snapchain HTTP API & submitMessage' > /dev/null 2>&1 || true
        $SUDO ufw allow 3382/tcp comment 'Snapchain Libp2p Gossip Mesh' > /dev/null 2>&1 || true
        $SUDO ufw allow 3383/tcp comment 'Snapchain gRPC API' > /dev/null 2>&1 || true

        echo -e "  ${GREEN}✓ UFW rules updated:${NC}"
        echo -e "    - Port 22/tcp   (SSH)"
        echo -e "    - Port 3381/tcp (HTTP API & Writes)"
        echo -e "    - Port 3382/tcp (P2P Gossip Mesh)"
        echo -e "    - Port 3383/tcp (gRPC)"
    else
        echo -e "  ${YELLOW}• UFW firewall not active. Ensure cloud security group opens ports 22, 3381, 3382, 3383.${NC}"
    fi
}

# 5. Kernel & Network Tuning for P2P Throughput
tune_kernel_buffers() {
    echo -e "\n${CYAN}${BOLD}[4/4] Tuning Linux kernel network buffers for P2P gossip throughput...${NC}"

    # Set real-time parameters
    $SUDO sysctl -w fs.file-max=2097152 > /dev/null 2>&1 || true
    $SUDO sysctl -w net.core.somaxconn=65535 > /dev/null 2>&1 || true
    $SUDO sysctl -w net.ipv4.tcp_max_syn_backlog=65535 > /dev/null 2>&1 || true

    # Persist configurations
    if [ -d /etc/sysctl.d ]; then
        cat <<EOF | $SUDO tee /etc/sysctl.d/99-snapchain.conf > /dev/null
# Snapchain P2P Gossip Buffer Optimization
fs.file-max = 2097152
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
EOF
        echo -e "  ${GREEN}✓ Persisted kernel parameters to /etc/sysctl.d/99-snapchain.conf${NC}"
    elif [ -w /etc/sysctl.conf ]; then
        echo -e "\n# Snapchain P2P Tuning\nfs.file-max=2097152\nnet.core.somaxconn=65535" | $SUDO tee -a /etc/sysctl.conf > /dev/null
        echo -e "  ${GREEN}✓ Appended parameters to /etc/sysctl.conf${NC}"
    fi
}

# Execution Flow
if [ "$MODE" == "check" ]; then
    check_system_specs
    echo -e "\n${GREEN}${BOLD}Specs check complete.${NC}"
    exit 0
fi

check_system_specs
configure_docker
configure_firewall
tune_kernel_buffers

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✓ Step (0) Complete: Server is fully provisioned and ready!   ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "Next step: Run Command (1) to start your Snapchain Read Node:"
echo -e "${CYAN}${BOLD}curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash${NC}\n"
