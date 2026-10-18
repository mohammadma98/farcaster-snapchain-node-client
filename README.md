# 🟣 Farcaster Snapchain Read Node & Sovereign Client Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-emerald.svg)](https://nodejs.org/)
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
*Configures Docker Engine, sets up UFW firewall (ports 22, 3381 HTTP, 3382 gRPC, 3383 gossip), and tunes Linux kernel network buffers for p2p throughput.*

### 1. Setup & Bootstrap Standalone Read Node
```bash
curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash
```
*Fetches the official Snapchain `docker-compose.yml` and `validators.toml`, boots the read node container, and continuously polls `http://127.0.0.1:3381/v1/info` until healthy. Requires **zero third-party API keys**.*

### 2. Launch Sovereign Web Client & CLI
```bash
curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash
```
*Installs dependencies, runs protocol verification tests, and starts the local web interface (`http://localhost:3000`) and terminal CLI.*

---

## 🌟 Architecture & Capabilities

| Feature | Description | Protocol Standard |
| :--- | :--- | :--- |
| **Zero API Keys** | Connects directly to local read node via `:3381` (HTTP) and `:3383` (libp2p gossip). No Neynar, Alchemy, or Infura accounts required. | Decentralized P2P Mesh |
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
                        │ libp2p Gossip (:3383)       │ Block Synchronization
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

The suite includes an interactive command-line interface communicating directly with the read node:

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
```

---

## 🧪 Testing & Verification

Run the comprehensive protocol test suite verifying binary serialization, client filtering, and cryptographic derivation:

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
