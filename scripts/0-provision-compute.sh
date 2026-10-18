#!/usr/bin/env bash
# ==============================================================================
# Command (0): Provision Compute for Farcaster Snapchain Read Node
# Part of Farcaster Client & Node Suite (MIT License)
#
# Hardware Requirements (Mainnet Read Node):
# - 4 CPU Cores (vCPUs)
# - 16 GB RAM
# - 2 TB SSD (gp3 or NVMe)
# - Public IPv4 with ports 3381 (HTTP), 3382 (Gossip), 3383 (gRPC) exposed
# ==============================================================================

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}================================================================${NC}"
echo -e "${BLUE}${BOLD}   (0) Provision Compute for Farcaster Snapchain Read Node     ${NC}"
echo -e "${BLUE}${BOLD}================================================================${NC}"

# Detect if running in an existing cloud VM or if user wants to provision via AWS CLI
MODE="${1:-local}"

show_help() {
    echo "Usage: ./0-provision-compute.sh [local|aws|check]"
    echo ""
    echo "Modes:"
    echo "  local  - Prepare current server (installs Docker, opens ports, tunes sysctl)"
    echo "  aws    - Launch an AWS EC2 m5.xlarge with 2TB gp3 volume and firewall"
    echo "  check  - Verify if current machine satisfies Snapchain requirements"
    echo ""
}

check_system_specs() {
    echo -e "\n${YELLOW}Checking local machine hardware specs...${NC}"
    
    # Check CPU Cores
    CPUS=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)
    echo -e "CPU Cores: ${BOLD}${CPUS}${NC} (Required: 4+)"

    # Check RAM
    if [ -f /proc/meminfo ]; then
        RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        RAM_GB=$(( RAM_KB / 1024 / 1024 ))
    else
        RAM_GB=16 # fallback
    fi
    echo -e "System Memory: ${BOLD}${RAM_GB} GB${NC} (Required: 16 GB+)"

    # Check Disk Space
    DISK_GB=$(df -BG . | tail -1 | awk '{print $4}' | tr -d 'G')
    echo -e "Free Disk Space: ${BOLD}${DISK_GB} GB${NC} (Recommended: 2000 GB / 2 TB)"

    if [ "$CPUS" -lt 4 ]; then
        echo -e "${YELLOW}[!] Warning: CPU cores (${CPUS}) is below the recommended 4 cores.${NC}"
    else
        echo -e "${GREEN}[✓] CPU requirement met.${NC}"
    fi

    if [ "$RAM_GB" -lt 14 ]; then
        echo -e "${YELLOW}[!] Warning: RAM (${RAM_GB}GB) is below the recommended 16GB.${NC}"
    else
        echo -e "${GREEN}[✓] RAM requirement met.${NC}"
    fi
}

provision_aws_ec2() {
    echo -e "\n${YELLOW}Provisioning AWS EC2 instance for Snapchain...${NC}"
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}[ERROR] AWS CLI is not installed. Please install awscli or run in 'local' mode on an existing server.${NC}"
        exit 1
    fi

    REGION="${AWS_DEFAULT_REGION:-us-east-1}"
    INSTANCE_TYPE="m5.xlarge"
    VOLUME_SIZE=2048 # 2 TB gp3
    SG_NAME="farcaster-snapchain-sg"
    KEY_NAME="${AWS_KEY_NAME:-snapchain-key}"

    echo -e "Region: ${BOLD}${REGION}${NC}"
    echo -e "Instance: ${BOLD}${INSTANCE_TYPE}${NC} (4 vCPU, 16 GiB RAM)"
    echo -e "Storage: ${BOLD}${VOLUME_SIZE} GB gp3 SSD${NC}"

    # 1. Create Security Group if not exists
    SG_ID=$(aws ec2 describe-security-groups --group-names "$SG_NAME" --query "SecurityGroups[0].GroupId" --output text 2>/dev/null || true)
    if [ -z "$SG_ID" ] || [ "$SG_ID" == "None" ]; then
        echo "Creating Security Group: $SG_NAME..."
        SG_ID=$(aws ec2 create-security-group \
            --group-name "$SG_NAME" \
            --description "Security group for Farcaster Snapchain Read Node" \
            --query "GroupId" --output text)
        
        # Authorize Ports: 22 (SSH), 3381 (HTTP), 3382 (Gossip), 3383 (gRPC)
        aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 3381 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 3382 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 3383 --cidr 0.0.0.0/0
        echo -e "${GREEN}[✓] Security group configured with ports 22, 3381, 3382, 3383 open.${NC}"
    else
        echo -e "${GREEN}[✓] Using existing Security Group: ${SG_ID}${NC}"
    fi

    # 2. Query latest Ubuntu 22.04 LTS AMI
    AMI_ID=$(aws ec2 describe-images --owners 099720109477 \
        --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" "Name=state,Values=available" \
        --query "reverse(sort_by(Images, &CreationDate))[0].ImageId" --output text)
    echo -e "Found Ubuntu 22.04 AMI: ${BOLD}${AMI_ID}${NC}"

    # 3. Launch Instance with 2TB gp3 volume
    BLOCK_MAPPINGS="[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":$VOLUME_SIZE,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]"
    
    echo "Launching instance..."
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --count 1 \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_NAME" \
        --security-group-ids "$SG_ID" \
        --block-device-mappings "$BLOCK_MAPPINGS" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=Farcaster-Snapchain-ReadNode}]" \
        --query "Instances[0].InstanceId" --output text)

    echo -e "${GREEN}[✓] Successfully launched EC2 Instance: ${BOLD}${INSTANCE_ID}${NC}"
    echo "Waiting for public IP assignment..."
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"
    PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query "Reservations[0].Instances[0].PublicIpAddress" --output text)

    echo -e "${GREEN}${BOLD}Compute provisioned successfully!${NC}"
    echo -e "Public IPv4: ${BOLD}${PUBLIC_IP}${NC}"
    echo -e "Connect with: ${BOLD}ssh -i ${KEY_NAME}.pem ubuntu@${PUBLIC_IP}${NC}"
}

prepare_local_server() {
    echo -e "\n${YELLOW}Preparing local server environment for Snapchain...${NC}"

    # 1. Install Docker if missing
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker "$USER" || true
        rm -f get-docker.sh
        echo -e "${GREEN}[✓] Docker installed successfully.${NC}"
    else
        echo -e "${GREEN}[✓] Docker is already installed: $(docker --version)${NC}"
    fi

    # 2. Configure Firewall (UFW) if installed
    if command -v ufw &> /dev/null && sudo ufw status | grep -q "Status: active"; then
        echo "Opening Snapchain ports (3381 HTTP, 3382 Gossip, 3383 gRPC) on UFW..."
        sudo ufw allow 3381/tcp comment 'Snapchain HTTP'
        sudo ufw allow 3382/tcp comment 'Snapchain Gossip'
        sudo ufw allow 3383/tcp comment 'Snapchain gRPC'
        echo -e "${GREEN}[✓] Firewall ports open.${NC}"
    fi

    # 3. Kernel tuning for high-throughput p2p socket connections
    if [ -f /etc/sysctl.conf ]; then
        echo "Optimizing sysctl network buffers..."
        sudo sysctl -w fs.file-max=2097152 > /dev/null 2>&1 || true
        sudo sysctl -w net.core.somaxconn=65535 > /dev/null 2>&1 || true
    fi

    check_system_specs

    echo -e "\n${GREEN}${BOLD}Step (0) Complete!${NC} Compute is ready for Step (1): Snapchain Read Node Setup."
}

case "$MODE" in
    local)
        prepare_local_server
        ;;
    aws)
        provision_aws_ec2
        ;;
    check)
        check_system_specs
        ;;
    *)
        show_help
        ;;
esac
