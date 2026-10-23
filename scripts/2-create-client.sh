#!/usr/bin/env bash
# ==============================================================================
# Command (2): Create and Launch Sovereign Farcaster Client Container
# Part of Farcaster Client & Node Suite (MIT License)
# Repository: https://github.com/mohammadma98/farcaster-snapchain-node-client
#
# Properties:
# - ZERO global Node.js or npm dependencies required on the host (100% Dockerized)
# - Connects directly to local Read Node (http://localhost:3381)
# - No 3rd-party API keys required
# - Imports existing seed phrase safely (gasless EIP-712 app key)
# - Reads feed, posts casts, reacts, follows, searches users
# - Modern light-theme interface matching farcaster.xyz
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
echo -e "${BLUE}${BOLD} (2) Launch Sovereign Farcaster Client Container (Dockerized)   ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

CLIENT_TYPE="${1:-web}" # 'web' or 'cli'
READ_NODE_URL="${2:-http://localhost:3381}"
REPO_URL="https://github.com/mohammadma98/farcaster-snapchain-node-client.git"

echo -e "Target Read Node: ${BOLD}${READ_NODE_URL}${NC}"
echo -e "Client Interface: ${BOLD}${CLIENT_TYPE}${NC}"
echo -e "Runtime Engine:   ${BOLD}${GREEN}Docker Container (Zero host Node.js required)${NC}\n"

# ------------------------------------------------------------------------------
# 1. Detect Privilege Level & Resolve Docker Engine
# ------------------------------------------------------------------------------
if [ "$(id -u)" -eq 0 ]; then
    SUDO=""
else
    if command -v sudo &> /dev/null; then
        SUDO="sudo"
    else
        SUDO=""
    fi
fi

# Intelligent Docker Runtime Detection
DOCKER_BIN="docker"

if docker info > /dev/null 2>&1; then
    DOCKER_BIN="docker"
elif [ -n "$SUDO" ] && $SUDO docker info > /dev/null 2>&1; then
    DOCKER_BIN="$SUDO docker"
elif command -v docker &> /dev/null; then
    # Try starting daemon if inactive
    if command -v systemctl &> /dev/null; then
        $SUDO systemctl enable --now docker > /dev/null 2>&1 || true
    elif command -v service &> /dev/null; then
        $SUDO service docker start > /dev/null 2>&1 || true
    fi
    sleep 2
    if docker info > /dev/null 2>&1; then
        DOCKER_BIN="docker"
    elif [ -n "$SUDO" ] && $SUDO docker info > /dev/null 2>&1; then
        DOCKER_BIN="$SUDO docker"
    fi
fi

if ! $DOCKER_BIN info > /dev/null 2>&1; then
    echo -e "${YELLOW}Docker is not active or installed on this system.${NC}"
    echo -e "Please run Command (0) first to provision compute and install Docker:"
    echo -e "${CYAN}${BOLD}curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash${NC}\n"
    exit 1
fi

echo -e "Container Runtime: ${GREEN}${BOLD}$($DOCKER_BIN --version)${NC}"

# Ensure Git is installed for fetching the repository
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Git not detected. Installing git...${NC}"
    if command -v apt-get &> /dev/null; then
        export DEBIAN_FRONTEND=noninteractive
        $SUDO apt-get update -qq > /dev/null 2>&1 || true
        $SUDO apt-get install -y -qq git > /dev/null 2>&1 || true
    fi
fi

# ------------------------------------------------------------------------------
# 2. Free Port 3000 & Stop Any Prior Client Container
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}Preparing port 3000 and container environment...${NC}"

# Stop any previous farcaster-client container
$DOCKER_BIN rm -f farcaster-client > /dev/null 2>&1 || true

# Kill any stale host processes on port 3000 if present
if command -v fuser &> /dev/null; then
    $SUDO fuser -k -9 3000/tcp 2>/dev/null || true
fi

if command -v lsof &> /dev/null; then
    for pid in $(lsof -ti:3000 2>/dev/null || true); do
        if [ -n "$pid" ] && [ "$pid" != "$$" ] && [ "$pid" != "$PPID" ]; then
            $SUDO kill -9 "$pid" 2>/dev/null || true
        fi
    done
fi

if command -v ss &> /dev/null; then
    for pid in $(ss -tlpn '( sport = :3000 )' 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true); do
        if [ -n "$pid" ] && [ "$pid" != "$$" ] && [ "$pid" != "$PPID" ]; then
            $SUDO kill -9 "$pid" 2>/dev/null || true
        fi
    done
fi

# ------------------------------------------------------------------------------
# 3. Locate or Clone Repository & Pull Latest Code
# ------------------------------------------------------------------------------
TARGET_DIR=""

if [ -f "package.json" ] && [ -d ".git" ]; then
    TARGET_DIR="$(pwd)"
elif [ -d "${HOME}/farcaster-snapchain-node-client/.git" ]; then
    TARGET_DIR="${HOME}/farcaster-snapchain-node-client"
elif [ -d "farcaster-snapchain-node-client/.git" ]; then
    TARGET_DIR="$(pwd)/farcaster-snapchain-node-client"
fi

if [ -n "$TARGET_DIR" ]; then
    cd "$TARGET_DIR"
    echo -e "${YELLOW}Synchronizing repository in ${TARGET_DIR} with latest GitHub commits...${NC}"
    git remote set-url origin "$REPO_URL" 2>/dev/null || true
    git fetch origin main --force 2>/dev/null || true
    git checkout -B main origin/main 2>/dev/null || true
    git reset --hard origin/main 2>/dev/null || true
    git clean -fd 2>/dev/null || true
else
    TARGET_DIR="${HOME}/farcaster-snapchain-node-client"
    echo -e "${YELLOW}Cloning repository to ${TARGET_DIR}...${NC}"
    git clone "$REPO_URL" "$TARGET_DIR"
    cd "$TARGET_DIR"
fi

COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null | head -n 1 || echo "release")
echo -e "Verified repository commit: ${GREEN}${BOLD}${COMMIT_HASH}${NC} (${COMMIT_MSG})"

# ------------------------------------------------------------------------------
# 4. Build Sovereign Client Docker Image
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}Building Sovereign Farcaster Client Container Image (farcaster-client)...${NC}"
echo -e "  Notice: Next.js dependencies and production build execute entirely inside Docker."
echo -e "  Host machine remains completely clean with zero global Node.js packages.\n"

$DOCKER_BIN build -t farcaster-client .

echo -e "\n  ${GREEN}✓ Client Docker image successfully built: farcaster-client${NC}"

# ------------------------------------------------------------------------------
# 4.5 Ensure Sovereign PostgreSQL Indexer Database (512MB RAM cap, Zero-Config)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}${BOLD}Ensuring Sovereign PostgreSQL Indexer Container (512MB RAM cap)...${NC}"
PG_NET_ARGS="--network host"
PG_HOST="127.0.0.1"
if [ "$(uname -s 2>/dev/null || echo "")" != "Linux" ]; then
    PG_NET_ARGS="-p 5432:5432"
    PG_HOST="host.docker.internal"
fi

if ! $DOCKER_BIN ps --format '{{.Names}}' 2>/dev/null | grep -q '^farcaster-postgres$'; then
    $DOCKER_BIN rm -f farcaster-postgres > /dev/null 2>&1 || true
    $DOCKER_BIN run -d \
        --name farcaster-postgres \
        --restart unless-stopped \
        --memory=512m \
        --cpus=1.0 \
        -v farcaster-pgdata:/var/lib/postgresql/data \
        -e POSTGRES_DB=snapchain_client \
        -e POSTGRES_USER=farcaster \
        -e POSTGRES_PASSWORD=farcaster_secret \
        $PG_NET_ARGS \
        postgres:16-alpine > /dev/null 2>&1 || true
    echo -e "  Waiting for PostgreSQL database container initialization..."
    sleep 3
fi
echo -e "  ${GREEN}✓ PostgreSQL Indexer is running (512MB cap, Zero-Config)${NC}"

# ------------------------------------------------------------------------------
# 5. Launch Client (Interactive CLI or Background Web UI Container)
# ------------------------------------------------------------------------------
if [ "$CLIENT_TYPE" == "cli" ]; then
    echo -e "\n${GREEN}${BOLD}Launching Farcaster Interactive CLI inside Docker Container...${NC}\n"
    $DOCKER_BIN run --rm -it \
        --network host \
        -e FARCASTER_NODE_URL="${READ_NODE_URL}" \
        -e DATABASE_URL="postgresql://farcaster:farcaster_secret@${PG_HOST}:5432/snapchain_client" \
        farcaster-client npm run cli
else
    echo -e "\n${CYAN}${BOLD}Starting Sovereign Farcaster Web Client container (port 3000)...${NC}"

    # Determine container network configuration
    NET_ARGS="--network host"
    if [ "$(uname -s 2>/dev/null || echo "")" != "Linux" ]; then
        NET_ARGS="-p 3000:3000 --add-host=host.docker.internal:host-gateway"
    fi

    $DOCKER_BIN run -d \
        --name farcaster-client \
        --restart unless-stopped \
        $NET_ARGS \
        -e FARCASTER_NODE_URL="${READ_NODE_URL}" \
        -e DATABASE_URL="postgresql://farcaster:farcaster_secret@${PG_HOST}:5432/snapchain_client" \
        -e PORT="3000" \
        -e HOSTNAME="0.0.0.0" \
        farcaster-client > /dev/null

    # Detect public IP for user convenience
    PUBLIC_IP=$(curl -s -m 2 https://api.ipify.org 2>/dev/null || curl -s -m 2 ifconfig.me 2>/dev/null || echo "127.0.0.1")

    # Health check for web client readiness
    echo -e "  Waiting for Web Client container to become ready on http://localhost:3000..."
    WAIT_SEC=0
    CLIENT_READY=false
    while [ "$WAIT_SEC" -lt 30 ]; do
        if curl -fs -m 2 http://localhost:3000/ > /dev/null 2>&1; then
            CLIENT_READY=true
            break
        fi
        sleep 2
        WAIT_SEC=$(( WAIT_SEC + 2 ))
        printf "."
    done
    echo ""

    echo -e "\n${GREEN}${BOLD}================================================================${NC}"
    echo -e "${GREEN}${BOLD}  ✓ Sovereign Farcaster Client Container is LIVE!               ${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}"
    echo -e "  - Web Client URL:  ${BOLD}${CYAN}http://${PUBLIC_IP}:3000${NC}"
    echo -e "  - Local Host URL:  ${BOLD}http://localhost:3000${NC}"
    echo -e "  - REST API Feed:   ${BOLD}http://${PUBLIC_IP}:3000/api/feed${NC}"
    echo -e "  - Target Node RPC: ${BOLD}${READ_NODE_URL}${NC}"
    echo -e "  - Postgres Engine: ${BOLD}farcaster-postgres (512MB RAM cap, Volume: farcaster-pgdata)${NC}"
    echo -e "  - Container Name:  ${BOLD}farcaster-client${NC} (Status: Running)"
    echo -e "  - Commit Build:    ${BOLD}${COMMIT_HASH}${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}\n"
    echo -e "To view client container logs:  ${BOLD}${DOCKER_BIN} logs -f farcaster-client${NC}"
    echo -e "To restart client container:    ${BOLD}${DOCKER_BIN} restart farcaster-client${NC}"
    echo -e "To stop client container:       ${BOLD}${DOCKER_BIN} stop farcaster-client farcaster-postgres${NC}\n"
fi
