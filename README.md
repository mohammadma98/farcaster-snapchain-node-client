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

## 🔌 Sovereign REST API Documentation

The client suite exposes a comprehensive, zero-dependency RESTful API engine on `http://localhost:3000/api/...` (also directly accessible via your secure Cloudflare HTTPS domain). Every endpoint communicates natively with your local Snapchain node (`http://127.0.0.1:3381`) and the high-speed local indexing layer.

### 1. Node Health & P2P Diagnostics
* **`GET /api/node/status`**: Live health check, ping latency, peer count, synchronization state, and processed message count from the local Snapchain node.

### 2. Timeline Feed & Protocol Curation
* **`GET /api/feed`**: Retrieve chronological or personalized protocol casts with granular client attribution filtering.
  * **Query Parameters:**
    * `mode` *(string)*: `'global'` (default) or `'following'` (requires `viewerFid`).
    * `limit` *(integer)*: Maximum number of casts to return (default: `20`, max: `100`).
    * `cursor` *(integer)*: Timestamp cursor for pagination.
    * `source` *(string)*: Client source filter (e.g. `'all'`, `'Warpcast'`, `'Supercast'`, `'Direct Snapchain'`).
    * `fid` *(integer)*: Filter casts authored exclusively by a specific FID.
    * `viewerFid` *(integer)*: Viewer's FID to resolve personalized like/recast/follow states.
    * `client_fids` *(string)*: Comma-separated list of client FIDs to include.
    * `exclude_client_fids` *(string)*: Comma-separated list of client FIDs to exclude (e.g. `9152` for Warpcast).
    * `only_self_registered` *(boolean)*: Filter casts strictly to verified self-registered accounts.

### 3. Cast Publishing & Thread Retrieval
* **`POST /api/casts`**: Publish a new cast, quote cast, or thread reply directly to the read node mempool via signed binary Protobuf.
  * **Body:**
    ```json
    {
      "fid": 320011,
      "signerPrivateKey": "0x...",
      "text": "Broadcasting directly to my standalone Snapchain node!",
      "embeds": [{ "url": "https://example.com/image.png" }],
      "parentCastId": { "fid": 2, "hash": "0x8f2a1b94..." }
    }
    ```
* **`GET /api/casts/:hash`**: Fetch complete conversation threads, parent casts, root casts, and ordered replies.

### 4. Reactions (Likes & Recasts)
* **`POST /api/reactions`**: Submit or retract likes and recasts to the protocol mempool.
  * **Body:**
    ```json
    {
      "fid": 320011,
      "signerPrivateKey": "0x...",
      "targetFid": 2,
      "targetHash": "0x8f2a1b94...",
      "type": "like",
      "isRemove": false
    }
    ```
  * `type`: `'like'` or `'recast'`. `isRemove`: `false` to add, `true` to retract.

### 5. Social Graph (Follows & Unfollows)
* **`POST /api/links`**: Follow or unfollow users via protocol-level `LinkAdd` / `LinkRemove` messages.
  * **Body:**
    ```json
    {
      "fid": 320011,
      "signerPrivateKey": "0x...",
      "targetFid": 3,
      "type": "follow",
      "isRemove": false
    }
    ```

### 6. User Profiles & Cast History
* **`GET /api/users/:id`**: Fetch user profile metadata, display name, bio, follower count, and custody address by numeric FID (`/api/users/2`) or handle (`/api/users/dwr.eth`).
* **`GET /api/users/:id/casts?limit=30`**: Retrieve chronological casts published by the user.
* **`GET /api/users/search?q=query`**: Search user accounts by username, display name, or FID.

### 7. Multi-Chain Wallet Balances & Portfolio
* **`GET /api/wallet/tokens?fid=320011`** or **`GET /api/wallet/tokens?address=0x...`**: Query live on-chain token holdings, balances, and USD valuation across **Ethereum** and **Base** networks.

### 8. Image & Media Upload
* **`POST /api/upload`**: Upload images for cast embeds with server-side magic byte verification (supports JPEG, PNG, GIF, WebP up to 10 MB). Accepts multipart form data with field `file` and returns the hosted media URL.

### 9. Client Ecosystem Registry
* **`GET /api/clients`**: Retrieve registered Farcaster client applications and their corresponding App FIDs for client-level filtering.

### 10. Authentication & Gasless Signer Management
* **`POST /api/auth/login`**: Authenticate using your 24-word recovery phrase. Derives the custody address and automatically generates an off-chain EIP-712 custody authorization to register a zero-gas Ed25519 app signer without requiring gas or raw private keys.
  * **Body:**
    ```json
    {
      "mnemonic": "word1 word2 ... word24"
    }
    ```

---

## 📄 License

This project is open-source and released under the **MIT License**.
See [LICENSE](LICENSE) for details.
