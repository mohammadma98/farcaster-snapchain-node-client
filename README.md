# 🟣 Farcaster Snapchain Read Node & Sovereign Client Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Snapchain](https://img.shields.io/badge/Snapchain-Engine%20V16-blue.svg)](https://github.com/farcasterxyz/snapchain)
[![Language](https://img.shields.io/badge/Bilingual-EN%20%7C%20%E4%B8%AD%E6%96%87-cyan.svg)](https://github.com/mohammadma98/farcaster-snapchain-node-client)
[![Network](https://img.shields.io/badge/Network-Mainnet%20Ready-success.svg)](https://snapchain.farcaster.xyz)

A production-grade, sovereign infrastructure suite for provisioning a standalone **Farcaster Snapchain Read Node** with **zero third-party API keys**, paired with a high-performance **Web & CLI Client** featuring **gasless app keys** (EIP-712) and **protocol-level community client filtering** (exclude/include Warpcast, Supercast, etc.).

Designed for developers, node operators, and decentralized communities seeking complete data sovereignty, censorship resistance, and zero subscription overhead.

---

## ⚡ 3-Command Quickstart

Run these three commands sequentially on any clean Ubuntu 22.04+ instance or AWS EC2 instance (`m5.xlarge` recommended):

### 0. Provision Compute (AWS EC2 / Ubuntu VPS)
```bash
curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash
```
*Configures Docker Engine, sets up UFW firewall (ports 22 SSH, 3000 Web, 3381 HTTP, 3382 UDP/TCP gossip, 3383 gRPC), and tunes Linux kernel network buffers for p2p throughput.*

### 1. Setup & Bootstrap Standalone Read Node
```bash
curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash
```
*Fetches the official Snapchain `docker-compose.yml` and `validators.toml`, isolates metrics to port 3005 to keep port 3000 open for the client, boots the read node container, and continuously polls `http://127.0.0.1:3381/v1/info` until healthy. Requires **zero third-party API keys**.*

### 2. Launch Sovereign Web Client & CLI
```bash
curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash
```
*Auto-clones repository, builds the isolated Docker container (`farcaster-client`), and launches the sovereign web interface (`http://localhost:3000`) and terminal CLI with **zero host Node.js dependencies**.*

---

## 🌟 Architecture & Capabilities

| Feature | Description | Protocol Standard |
| :--- | :--- | :--- |
| **Zero API Keys** | Connects directly to local read node via `:3381` (HTTP) and `:3382` (libp2p gossip). No Neynar, Alchemy, or Infura accounts required. | Decentralized P2P Mesh |
| **Gasless Signers** | Generates Ed25519 app keys authorized via off-chain EIP-712 signatures from the custody account. Zero Optimism ETH or gas fees. | Snapchain Engine V16 |
| **Community Filtering** | Include or exclude casts originating from specific clients (Warpcast, Supercast, Phaver, Herocast) or keywords to curate custom communities. | Client-Neutral Curation |
| **Read Node Writes** | Directly submits signed binary protobuf messages to `:3381/v1/submitMessage`. Read nodes gossip writes into validator mempools. | Libp2p Mempool Gossip |
| **Developer Security Warning** | Explicit warning framing seed phrase entry as developer testing tool (analogous to `rm -rf` in Unix) with sandbox test generator. | Cryptographic Sandbox Standard |
| **Bilingual Support (EN / 中文)** | Instant toggle between fluent English and 简体中文 across documentation, tutorial, and interactive UI. | Global Internationalization (i18n) |

---

## 🏛️ System Architecture & Protocol Mechanics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Sovereign Farcaster Client                            │
│   (Web Client at localhost:3000  •  Interactive CLI  •  Gasless EIP-712)   │
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
4. Validators include the transaction in the next Snapchain block.

### 2. Gasless App Key Cryptography (Engine V16)
App keys (signers) are authorized without blockchain transactions:
1. **Key Generation**: Client generates a cryptographic Ed25519 keypair.
2. **Custody Authorization (EIP-712)**: The Ethereum custody address signs an off-chain `KeyAddBody` struct specifying the new Ed25519 public key, permissions (`scopes`), and a sliding-window TTL (max 90 days).
3. **Proof of Possession (PoP)**: The Ed25519 private key signs the overall message envelope.
4. **Zero Gas**: The resulting `KEY_ADD` message is accepted directly by the read node.

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

The suite includes an interactive command-line interface communicating directly with the read node (runnable directly or inside Docker with `./scripts/2-create-client.sh cli`):

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

The client suite includes a full set of RESTful backend API routes (`/api/...`) that communicate directly with the local Snapchain node (`http://127.0.0.1:3381`). You can integrate these endpoints into your own applications, scripts, or agents:

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
* **`POST /api/auth/login`**: Authenticate with 12/24-word seed phrase, derive custody address, and issue gasless Ed25519 signer via off-chain EIP-712 signature.
* **`POST /api/auth/sandbox`**: Generate a fresh 12-word dev mnemonic and sandbox test account in 1 click.
* **`GET /api/node/status`**: Live health check, ping latency, peer count, and sync state from `http://127.0.0.1:3381/v1/info`.

---

## 🇨🇳 中文快速入门与架构说明 (Chinese Quickstart & Documentation)

本项目提供完整的端到端独立 Farcaster Snapchain 只读节点与自主 Web/CLI 客户端套件，支持**零第三方 API 密钥**、**无 Gas 签名密钥 (EIP-712)** 与**客户端自由过滤**。

### 极速 3 步启动：
```bash
# 0. 服务器与网络配置 (自动安装 Docker，开放 UFW 22, 3000, 3381, 3382 UDP/TCP, 3383 端口)
curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash

# 1. 启动官方 Snapchain 只读节点 (免第三方 API Key，自动将 Grafana 隔离至 3005 端口)
curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash

# 2. 自动拉取代码并启动 Web 客户端 (http://localhost:3000) 与 CLI
curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash
```

### 核心特性说明：
- **只读节点直接处理写入**：向本地 `:3381/v1/submitMessage` 发送 Protobuf 二进制消息，只读节点校验后进入本地内存池，并通过 P2P Libp2p (:3382) 广播至验证者出块。
- **完全免 Gas 密钥 (Engine V16)**：通过以太坊托管地址对 `KeyAddBody` 进行 EIP-712 链下签名，再由 Ed25519 密钥签名证明持有权 (PoP)，无需向 Optimism 发送交易，零 Gas 费。
- **客户端中立过滤**：支持一键包含或排除来自 Warpcast、Supercast 等特定客户端的内容，构建纯粹去中心化的自主社区。

---

## 🧪 Testing & Verification

Run the comprehensive protocol test suite verifying binary serialization, client filtering, follow/link messages, and cryptographic derivation:

```bash
npm test
```

Build the production Next.js microsite:
```bash
npm run build
```

---

## 📄 License

This project is open-source and released under the **MIT License**.
See [LICENSE](LICENSE) for details.
