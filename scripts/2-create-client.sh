#!/usr/bin/env bash
# ==============================================================================
# Command (2): Create and Launch Farcaster Client
# Part of Farcaster Client & Node Suite (MIT License)
#
# Properties:
# - Connects directly to local Read Node (http://localhost:3381)
# - No 3rd-party API keys required
# - Imports existing seed phrase safely
# - Issues gasless app keys (EIP-712 KEY_ADD message)
# - Reads feed, posts casts, reacts, follows
# - Includes/excludes casts from any other client (censorship resistance)
# ==============================================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}     (2) Create and Launch Client Reading From Your Node        ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

CLIENT_TYPE="${1:-web}" # 'web' or 'cli'
READ_NODE_URL="${2:-http://localhost:3381}"

echo -e "Read Node target: ${BOLD}${READ_NODE_URL}${NC}"
echo -e "Client interface: ${BOLD}${CLIENT_TYPE}${NC}"

# Check Node.js and NPM
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not detected. Installing Node.js LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo -e "Using Node.js: ${BOLD}$(node -v)${NC}"

# Ensure git is available
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Git not detected. Installing git...${NC}"
    sudo apt-get update -y > /dev/null 2>&1 || true
    sudo apt-get install -y git
fi

# Ensure repository exists locally
REPO_DIR="farcaster-snapchain-node-client"
if [ ! -f "package.json" ]; then
    if [ -d "$REPO_DIR" ] && [ -f "$REPO_DIR/package.json" ]; then
        cd "$REPO_DIR"
    else
        echo -e "\n${YELLOW}Cloning repository to local machine...${NC}"
        git clone https://github.com/mohammadma98/farcaster-snapchain-node-client.git
        cd "$REPO_DIR"
    fi
fi

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo -e "\n${YELLOW}Installing client dependencies...${NC}"
    npm install
fi

# Set local environment pointing to local node
export FARCASTER_NODE_URL="${READ_NODE_URL}"
export PORT="3000"

if [ "$CLIENT_TYPE" == "cli" ]; then
    echo -e "\n${GREEN}${BOLD}Launching Farcaster Interactive CLI Client...${NC}"
    npm run cli
else
    echo -e "\n${GREEN}${BOLD}Launching Farcaster Web Client & Documentation Microsite...${NC}"
    echo -e "Accessible at: ${BOLD}http://localhost:3000${NC}"
    npm run dev
fi
