<div align="right">
  <strong>Languages:</strong>
  <a href="README.md">English</a> |
  <a href="README_zh.md">简体中文 (Chinese)</a>
</div>

# 🟣 Farcaster Snapchain Read Node & Sovereign Web Client

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Snapchain](https://img.shields.io/badge/Snapchain-Engine%20V16-blue.svg)](https://github.com/farcasterxyz/snapchain)
[![Language](https://img.shields.io/badge/Bilingual-EN%20%7C%20%E4%B8%AD%E6%96%87-cyan.svg)](README_zh.md)
[![Network](https://img.shields.io/badge/Network-Mainnet%20Ready-success.svg)](https://snapchain.farcaster.xyz)

A production-grade, professional, sovereign Farcaster node and web client suite requiring **zero third-party API keys**. Engineered for developers, decentralization advocates, and censorship-resistant communities seeking total protocol sovereignty.

---

## ⚡ Just ONE Command! (Single-Command Autonomous Quickstart)

Deploy a personal Farcaster Snapchain Read Node and Sovereign Web Client on any clean Ubuntu 22.04+ server (or AWS EC2 instance) with a single command:

```bash
curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash
```

Once executed, the automated pipeline performs all work sequentially across **3 integrated stages**:

1. **Stage 1: Server Configuration & Kernel Tuning (`0-provision-compute.sh`)**
   - Automatically installs prerequisite packages (Docker Engine, Docker Compose plugin, UFW firewall, zstd, jq).
   - Configures firewall rules (opening ports: `22` SSH, `3000` Web UI, `3381` HTTP API, `3382` UDP/TCP Libp2p Gossip, `3383` gRPC, `3005` Grafana).
   - Dynamically tunes Linux kernel network parameters (socket buffers, backlog limits, file descriptors, and optional zRAM swap) for sustained P2P gossiping throughput.

2. **Stage 2: Read Node Installation & High-Speed Streaming (`1-setup-read-node.sh`)**
   - Streams and downloads the large Snapchain database snapshot at maximum throughput using a custom-engineered concurrent chunk pipeline.
   - Extracts on-the-fly directly to the RocksDB storage layer, eliminating the need to store duplicate multi-hundred-gigabyte archive files.
   - Boots the Snapchain node container and monitors health (`http://127.0.0.1:3381/v1/info`) until fully synced.

3. **Stage 3: Web Client, Data Indexer & Cloudflare SSL Tunnel (`2-create-client.sh`)**
   - Builds and launches the high-performance Next.js web client and intermediate fast-indexing layer in isolated Docker containers.
   - Automatically sets up a zero-config Cloudflare Edge Tunnel (`https://*.trycloudflare.com`) with trusted SSL certificates.
   - Delivers a secure, public HTTPS URL for browser and mobile access without manual DNS setup, router port-forwarding, or third-party API accounts.

> **Note**: While the single command above runs the entire pipeline end-to-end autonomously, you can also run each modular script independently whenever needed:
> - `curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash`
> - `curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash`
> - `curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash`

---

## 🌟 Key Features & Capabilities

- **Minimal Server Storage (600 GB - 750 GB)**: Fully operational on drives as low as 600 GB to 750 GB. The memory-assisted streaming pipeline directly populates RocksDB partitions on-the-fly, reducing peak storage requirements from 1.4 TB+ down to ~500–600 GB.
- **Ultra-Optimized for Low-Spec Hardware**: Engineered with adaptive hardware matrix detection, running smoothly on constrained cloud servers with as little as **1 vCPU core and 3 GB RAM**.
- **Blazing Fast Snapshot & Boot Time**: Complete snapshot ingestion and node readiness in **under 3 hours on low-end servers** and **under 1 hour on mid/high-end servers**, thanks to multi-chunk concurrent network streaming.
- **Instant Automated SSL Domain**: Generates a live Cloudflare Tunnel with valid HTTPS certificates completely automatically, requiring zero API tokens, zero manual DNS records, and zero port mapping.
- **True 1-Command Autonomy**: Run one terminal command and walk away. The system handles dependency resolution, kernel tuning, snapshot extraction, container startup, and SSL tunneling without manual intervention.
- **Full Farcaster Client Parity**: Everything expected from a primary Farcaster client:
  - Publish casts with media/image attachments and URL embeds.
  - Live custody wallet balance and address inspection.
  - Chronological feeds, thread conversations, parent casts, and full reply trees.
  - On-chain social actions: likes, recasts, follows, and unfollows.
  - Client-level community filtering (filter out or isolate casts by client, e.g., Warpcast, Supercast, Phaver).
  - Gasless Signer creation (EIP-712 off-chain custody authorization via Engine V16).
- **100% Responsive & Mobile-Optimized**: Clean, modern responsive interface designed for smooth interaction on smartphones, tablets, and desktop workstations.

---

## 📊 Tested Server Benchmarks & Hosting Providers

This suite has been rigorously tested and benchmarked across diverse real-world hardware profiles:

| Server Profile | Hardware Specs | Monthly Cost | Sync & Launch Time | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Low-End Entry Tier** | 1 vCPU, 3 GB RAM, 750 GB HDD | ~$6 / month | ~3 hours | ✅ Verified |
| **Balanced Mid Tier** | 2 vCPU, 4 GB RAM, 600 GB SSD | ~$15 / month | ~3 hours | ✅ Verified |
| **High-Performance Tier** | 4 vCPU, 12 GB RAM, 600 GB SSD/NVMe | ~$60 / month | ~2 hours (or <1 hr) | ✅ Verified |

### Recommended VPS Providers
You can provision an Ubuntu 22.04+ VPS on any provider of your choice. Real-world verification tests were successfully performed on:
- **[Hetzner](https://www.hetzner.com/)** (High-speed European cloud & storage servers)
- **[InterServer](https://www.interserver.net/)** (Cost-effective storage VPS options)
- **[Cloudzy](https://cloudzy.com/)** (Low-latency worldwide KVM VPS instances)
- Also fully compatible with AWS EC2 (`m5.xlarge` or custom EBS), DigitalOcean, Vultr, and OVH.

---

## 🏛️ System Architecture & Protocol Mechanics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Sovereign Farcaster Client                            │
│    (Web Client at localhost:3000 • Mobile Responsive • Gasless EIP-712)     │
└───────────────────────┬─────────────────────────────▲───────────────────────┘
                        │ POST /v1/submitMessage      │ GET /v1/castsByFid
                        │ (Protobuf Binary)           │ GET /v1/info
                        ▼                             │
┌─────────────────────────────────────────────────────┴───────────────────────┐
│                       Standalone Read Node (:3381)                          │
│   (Dockerized Snapchain Read Node  •  Zero API Keys  •  Local Mempool)      │
└───────────────────────┬─────────────────────────────▲───────────────────────┘
                        │ libp2p Gossip (:3382)       │ Block Synchronization
                        │ (mempool topic)             │ (Tendermint / CometBFT)
                        ▼                             │
┌─────────────────────────────────────────────────────┴───────────────────────┐
│                        Snapchain Validator Network                          │
│          Shard 0 (Identity & Rent)  •  Shards 1 & 2 (User Actions)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Why Read Nodes Accept Writes
In Farcaster Snapchain, read nodes are full participants in the peer-to-peer gossip mesh. When a client submits a message to `POST /v1/submitMessage`:
1. The read node verifies the Ed25519 signature and FID permissions locally.
2. The message is admitted into the read node's local **mempool**.
3. The read node broadcasts the message across the gossip network to validator nodes.
4. Validators validate and include the transaction in the next Snapchain block.

### 2. Gasless App Key Cryptography (Engine V16)
App keys (signers) are authorized without blockchain transactions:
1. **Key Generation**: Client generates a cryptographic Ed25519 keypair.
2. **Custody Authorization (EIP-712)**: The Ethereum custody address signs an off-chain `KeyAddBody` struct specifying the new Ed25519 public key, permissions (`scopes`), and a sliding-window TTL (max 90 days).
3. **Proof of Possession (PoP)**: The Ed25519 private key signs the overall message envelope.
4. **Zero Gas**: The resulting `KEY_ADD` message is accepted directly by the read node with zero Optimism transaction fees.

---

## ⚠️ Developer Security Guidance (Unix `rm` Analogy)

> **Important Developer Notice**:
> Entering a seed phrase or private key into developer software is like running `rm -rf` in Unix: it grants direct, unmediated cryptographic power.
> 
> - **Only use dedicated test accounts** with test FIDs for development.
> - **Never enter your primary cold-storage wallet** or high-value Ethereum accounts.
> - Use the built-in **"Generate Sandbox Test Account"** button in the web client to test gasless key generation with zero risk.

---

## 💻 CLI Client Reference

The suite includes an interactive command-line interface communicating directly with the read node (runnable locally or inside Docker with `./scripts/2-create-client.sh cli`):

```bash
# Check node status and peer count
npm run cli node-info

# View feed for FID 2 with Warpcast casts excluded
npm run cli feed 2 --exclude Warpcast

# View feed including ONLY Supercast casts
npm run cli feed 2 --include Supercast

# Filter out spam by keyword
npm run cli feed 2 --keyword "airdrop"

# Issue a gasless signer for testing
npm run cli create-signer <fid>

# Publish a cast directly to the node mempool
npm run cli post-cast "Decentralized social via standalone Snapchain read node!"

# Follow a user on-chain via LinkAdd
npm run cli follow 3

# Unfollow a user via LinkRemove
npm run cli unfollow 3

# React (like or recast) to a cast
npm run cli react 2 0x8f2a1b94c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8 like
```

---

## 🔌 Sovereign REST API Documentation

The client suite includes a full set of RESTful backend API routes (`/api/...`) that communicate directly with the local Snapchain node (`http://127.0.0.1:3381`):

### 1. Feed & Casts
* **`GET /api/feed?source=all&limit=40`**: Retrieve recent protocol casts. Supports client filtering (`source=Warpcast`, `source=Supercast`, `source=Direct Snapchain`).
* **`GET /api/casts/:hash`**: Retrieve full cast details, parent cast, and all replies/comments.
* **`POST /api/casts`**: Publish a new cast, quote cast, or thread reply directly to the read node mempool via signed binary Protobuf.
  ```json
  {
    "fid": 320011,
    "signerPrivateKey": "0x...",
    "text": "Decentralized social directly through local Snapchain node!",
    "embeds": [{ "url": "https://farcaster.xyz" }]
  }
  ```

### 2. Reactions & Social Graph (Follows)
* **`POST /api/reactions`**: Like, unlike, recast, or unrecast a target cast:
  ```json
  {
    "fid": 320011,
    "signerPrivateKey": "0x...",
    "targetFid": 2,
    "targetHash": "0x8f2a1b94c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8",
    "type": "like",
    "isRemove": false
  }
  ```
* **`POST /api/links`**: Follow or unfollow a user via protocol `LinkAdd` / `LinkRemove`:
  ```json
  {
    "fid": 320011,
    "signerPrivateKey": "0x...",
    "targetFid": 3,
    "type": "follow",
    "isRemove": false
  }
  ```

### 3. Users & Search
* **`GET /api/users/:id`**: Fetch user profile (by numeric FID or `@username`).
* **`GET /api/users/:id/casts`**: Fetch all casts published by a user.
* **`GET /api/users/search?q=query`**: Search users by username, display name, or FID.

### 4. Cryptographic Authentication & Node Health
* **`POST /api/auth/login`**: Authenticate with seed phrase, derive custody address, and issue gasless Ed25519 signer via off-chain EIP-712 signature.
* **`POST /api/auth/sandbox`**: Generate a fresh 12-word dev mnemonic and sandbox test account in 1 click.
* **`GET /api/node/status`**: Live health check, ping latency, peer count, and sync state from `http://127.0.0.1:3381/v1/info`.

---

## 🧪 Testing & Verification

Run the comprehensive protocol test suite verifying binary serialization, client filtering, follow/link messages, and cryptographic derivation:

```bash
npm test
```

Build the production Next.js application:
```bash
npm run build
```

---

## 📄 License

This project is open-source and released under the **MIT License**.
See [LICENSE](LICENSE) for details.
