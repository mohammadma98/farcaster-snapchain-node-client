#!/usr/bin/env bash
# ==============================================================================
# Command (2): Create and Launch Farcaster Client
# Part of Farcaster Client & Node Suite (MIT License)
# Repository: https://github.com/mohammadma98/farcaster-snapchain-node-client
#
# Properties:
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
echo -e "${BLUE}${BOLD}     (2) Create and Launch Sovereign Farcaster Web Client       ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

CLIENT_TYPE="${1:-web}" # 'web' or 'cli'
READ_NODE_URL="${2:-http://localhost:3381}"
REPO_URL="https://github.com/mohammadma98/farcaster-snapchain-node-client.git"

echo -e "Read Node target: ${BOLD}${READ_NODE_URL}${NC}"
echo -e "Client interface: ${BOLD}${CLIENT_TYPE}${NC}"

# ------------------------------------------------------------------------------
# 1. Ensure Prerequisites (Node.js LTS, Git)
# ------------------------------------------------------------------------------
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not detected. Installing Node.js LTS (v20)...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo -e "Node.js runtime:  ${BOLD}$(node -v)${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Git not detected. Installing git...${NC}"
    sudo apt-get update -y > /dev/null 2>&1 || true
    sudo apt-get install -y git
fi

# ------------------------------------------------------------------------------
# 2. Terminate Any Stale Process on Port 3000
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}Checking and freeing port 3000...${NC}"

# Safely kill processes holding port 3000
if command -v fuser &> /dev/null; then
    fuser -k -9 3000/tcp 2>/dev/null || true
fi

if command -v lsof &> /dev/null; then
    for pid in $(lsof -ti:3000 2>/dev/null || true); do
        if [ -n "$pid" ] && [ "$pid" != "$$" ] && [ "$pid" != "$PPID" ]; then
            kill -9 "$pid" 2>/dev/null || true
        fi
    done
fi

if command -v ss &> /dev/null; then
    for pid in $(ss -tlpn '( sport = :3000 )' 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true); do
        if [ -n "$pid" ] && [ "$pid" != "$$" ] && [ "$pid" != "$PPID" ]; then
            kill -9 "$pid" 2>/dev/null || true
        fi
    done
fi

# Cleanly stop any existing Next.js web instances, never killing our own process tree
for pid in $(pgrep -f "next-(server|dev|start)" 2>/dev/null || true); do
    if [ -n "$pid" ] && [ "$pid" != "$$" ] && [ "$pid" != "$PPID" ]; then
        kill -9 "$pid" 2>/dev/null || true
    fi
done

sleep 1

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
    echo -e "\n${YELLOW}Synchronizing repository in ${TARGET_DIR} with latest GitHub commits...${NC}"
    git remote set-url origin "$REPO_URL" 2>/dev/null || true
    git fetch origin main --force
    git checkout -B main origin/main
    git reset --hard origin/main
    git clean -fd
else
    TARGET_DIR="${HOME}/farcaster-snapchain-node-client"
    echo -e "\n${YELLOW}Cloning repository to ${TARGET_DIR}...${NC}"
    git clone "$REPO_URL" "$TARGET_DIR"
    cd "$TARGET_DIR"
fi

COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
echo -e "Verified repository commit: ${GREEN}${BOLD}${COMMIT_HASH}${NC} (${COMMIT_MSG})"

# Sanity check: Ensure application routes load FarcasterClient
if grep -rn "FarcasterClient" src/app/ >/dev/null 2>&1; then
    echo -e "Verified client component:  ${GREEN}✓ FarcasterClient (Light Theme) active in application routes${NC}"
else
    echo -e "${RED}[ERROR] Codebase does not contain FarcasterClient! Force resetting to origin/main...${NC}"
    git fetch origin main --force && git reset --hard origin/main
fi

# ------------------------------------------------------------------------------
# 4. Clean Build Cache & Install Dependencies
# ------------------------------------------------------------------------------
rm -rf .next

if [ ! -d "node_modules" ]; then
    echo -e "\n${YELLOW}Installing client dependencies...${NC}"
    npm install
else
    npm install --prefer-offline --no-audit > /dev/null 2>&1 || npm install
fi

# Set local environment pointing to local node
export FARCASTER_NODE_URL="${READ_NODE_URL}"
export PORT="3000"
export HOSTNAME="0.0.0.0"

# ------------------------------------------------------------------------------
# 5. Launch Client (CLI or Production Web Client)
# ------------------------------------------------------------------------------
if [ "$CLIENT_TYPE" == "cli" ]; then
    echo -e "\n${GREEN}${BOLD}Launching Farcaster Interactive CLI Client...${NC}"
    npm run cli
else
    echo -e "\n${CYAN}${BOLD}Building production Next.js application bundle...${NC}"
    export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=2048"
    npm run build

    # Detect public IP for user convenience
    PUBLIC_IP=$(curl -s -m 2 https://api.ipify.org 2>/dev/null || curl -s -m 2 ifconfig.me 2>/dev/null || echo "127.0.0.1")

    echo -e "\n${GREEN}${BOLD}================================================================${NC}"
    echo -e "${GREEN}${BOLD}  ✓ Sovereign Farcaster Client (Light Theme) is LIVE!           ${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}"
    echo -e "  - Web Client URL: ${BOLD}${CYAN}http://${PUBLIC_IP}:3000${NC}"
    echo -e "  - Local Host URL: ${BOLD}http://localhost:3000${NC}"
    echo -e "  - REST API Feed:  ${BOLD}http://${PUBLIC_IP}:3000/api/feed${NC}"
    echo -e "  - Target Node:    ${BOLD}${READ_NODE_URL}${NC}"
    echo -e "  - Active Commit:  ${BOLD}${COMMIT_HASH}${NC}"
    echo -e "${GREEN}${BOLD}================================================================${NC}\n"
    echo -e "${YELLOW}Tip: If your browser shows a cached view, press ${BOLD}Ctrl+Shift+R${NC} (or Cmd+Shift+R) to hard refresh.${NC}\n"

    npm run start
fi
