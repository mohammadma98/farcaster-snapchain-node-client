<div align="right">
  <strong>多语言导航 / Languages:</strong>
  <a href="README.md">English (英文)</a> |
  <a href="README_zh.md">简体中文 (Chinese)</a>
</div>

# 🟣 Farcaster Snapchain 只读节点与自主 Web 客户端套件

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Snapchain](https://img.shields.io/badge/Snapchain-Engine%20V16-blue.svg)](https://github.com/farcasterxyz/snapchain)
[![Language](https://img.shields.io/badge/Bilingual-EN%20%7C%20%E4%B8%AD%E6%96%87-cyan.svg)](README.md)
[![Network](https://img.shields.io/badge/Network-Mainnet%20Ready-success.svg)](https://snapchain.farcaster.xyz)

一款面向生产环境的专业级独立 Farcaster 专属节点与 Web 客户端基础设施套件，**完全无需任何外部第三方 API 密钥**。专为开发者、去中心化拥护者以及反审查社区打造，旨在实现 100% 的底层协议数据主权。

---

## ⚡ 仅需单条命令！(一键全自动部署)

在任何干净的 Ubuntu 22.04+ 服务器（或 AWS EC2 实例）上只需运行一条命令，系统即可全自动完成全部部署工作：

```bash
curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash
```

运行后，全自动部署流将按序依次执行 **3 个一体化阶段**：

1. **第一阶段：服务器环境与内核参数调优 (`0-provision-compute.sh`)**
   - 自动安装全部底层依赖工具（Docker Engine、Docker Compose 插件、UFW 防火墙、zstd、jq 等）。
   - 自动配置网络端口与安全规则（开放端口：`22` SSH、`3000` Web 客户端、`3381` HTTP API、`3382` UDP/TCP Libp2p Gossip 广播、`3383` gRPC、`3005` Grafana 监控）。
   - 动态调优 Linux 内核网络栈（套接字缓冲队列、连接上限、文件描述符限制及可选的 zRAM 内存压缩交换分区），以承载高并发 P2P 广播流量。

2. **第二阶段：只读节点安装与高速流式数据流水线 (`1-setup-read-node.sh`)**
   - 采用专门工程化设计的高速并发数据流管道，以极致网络带宽拉取 Snapchain 庞大历史快照。
   - 实现边下载边解压直接写入 RocksDB 存储层，完全避免了额外占用上百 GB 压缩包所导致的硬盘空间翻倍浪费。
   - 启动 Docker 容器化 Snapchain 节点，并通过 `http://127.0.0.1:3381/v1/info` 持续健康巡检直至全网同步完成。

3. **第三阶段：Web 客户端、数据索引层与 Cloudflare SSL 自动化隧道 (`2-create-client.sh`)**
   - 自动构建并启动轻量高效的 Next.js 独立 Web 客户端及中间快速索引数据层。
   - 自动集成并打通 Cloudflare Edge Tunnel (`https://*.trycloudflare.com`)，自动签发受信任的 SSL 证书。
   - 无需手动配置域名 DNS 解析、无需路由器端口映射，也无需任何 API 密钥，直接生成公开可访问的安全 HTTPS 地址供电脑与手机浏览器即开即用。

> **提示**：上述单条命令已实现端到端无人值守全自动安装；如需按需单独分步执行，亦可分别调用对应的独立脚本：
> - `curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash`
> - `curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash`
> - `curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash`

---

## 🌟 项目核心特性与优势

- **最低服务器硬盘要求（600 GB - 750 GB 即可上线）**：得益于边流式下载边写入 RocksDB 的技术优化，无需重复预留庞大的压缩包解压空间，峰值存储需求从官方推荐的 1.4 TB 降至仅需 500~600 GB 即可稳定运行。
- **极致轻量，完美适配低配 VPS**：针对低资源服务器进行全方位算力矩阵调优，即使是 **1 核 CPU、3 GB 内存** 的极简配置亦可流畅运行。
- **快照下载与节点启动耗时极短**：在多流分块管道技术支持下，**低配服务器通常在 3 小时内完成**，中高配服务器通常在 **1 小时内** 即可完成同步并启动就绪。
- **零配置全自动 Cloudflare 域名与 SSL**：全自动分配全球边缘网络通道并携带有效 HTTPS 证书，无需公网固定 IP 绑定或繁杂的域名申请。
- **真正意义上的 1 条命令全自动化**：零手动参数配置，一行命令启动后即可离线等待，数小时后即可收获一套完整的 Farcaster 专属节点与专属客户端。
- **对齐原生客户端完整功能**：
  - 自由发布 Cast 动态（支持图片与外链多媒体嵌入）。
  - 实时查看托管钱包地址及链上资产余额。
  - 时间线 Feed 动态流浏览、主题回复树、Parent Cast 追溯。
  - 链上社交交互：点赞 (Like)、转播 (Recast)、关注 (Follow) 与取关。
  - 客户端层级社区过滤（一键过滤或单独查看特定客户端，如 Warpcast、Supercast 等发帖源，或屏蔽垃圾关键词）。
  - 完全免 Gas 费用的签名密钥生成（基于 V16 引擎的 EIP-712 链下托管签名）。
- **全平台响应式与移动端完美兼容**：界面针对手机端触控操作与电脑宽屏端进行了深度 UI/UX 优化，体验如原生 App 般丝滑。

---

## 📊 实测服务器基准测试与服务商推荐

本项目已在不同层级的真实云服务器上完成了严格的基准测试：

| 服务器配置等级 | 硬件配置细节 | 参考月租 | 下载同步与启动总耗时 | 验证状态 |
| :--- | :--- | :--- | :--- | :--- |
| **基础入门型** | 1 核 CPU、3 GB 内存、750 GB HDD 硬盘 | 约 $6 / 月 | 约 3 小时 | ✅ 测试通过 |
| **均衡主流型** | 2 核 CPU、4 GB 内存、600 GB SSD 固态 | 约 $15 / 月 | 约 3 小时 | ✅ 测试通过 |
| **高性能极速型** | 4 核 CPU、12 GB 内存、600 GB SSD/NVMe | 约 $60 / 月 | 约 2 小时（优质网络 < 1 小时） | ✅ 测试通过 |

### 推荐的 VPS 云厂商
您可以在任何支持 Ubuntu 22.04+ 的服务商处开通服务器。本项目的实际部署测试主要基于以下三家主流提供商：
- **[Hetzner](https://www.hetzner.com/)**（高性价比欧洲云服务器与高性能存储卷）
- **[InterServer](https://www.interserver.net/)**（性价比较高的存储型 VPS 选项）
- **[Cloudzy](https://cloudzy.com/)**（全球低延迟机房与轻量 KVM VPS）
- 此外亦完全支持 AWS EC2（如 `m5.xlarge`）、DigitalOcean、Vultr 以及 OVH 等标准云平台。

---

## 🏛️ 系统架构与协议机制解析

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         自主 Farcaster 客户端                                │
│       (本地 localhost:3000 • 移动端适配 • 免 Gas EIP-712 链下签名)          │
└───────────────────────┬─────────────────────────────▲───────────────────────┘
                        │ POST /v1/submitMessage      │ GET /v1/castsByFid
                        │ (Protobuf 二进制格式)        │ GET /v1/info
                        ▼                             │
┌─────────────────────────────────────────────────────┴───────────────────────┐
│                       独立 Snapchain 只读节点 (:3381)                       │
│    (Docker 容器化部署 • 零第三方 API 依赖 • 本地 Mempool 内存池)           │
└───────────────────────┬─────────────────────────────▲───────────────────────┘
                        │ libp2p Gossip (:3382)       │ 区块同步
                        │ (mempool 广播主题)           │ (Tendermint / CometBFT)
                        ▼                             │
┌─────────────────────────────────────────────────────┴───────────────────────┐
│                        Snapchain 验证者网络 (Validators)                    │
│          Shard 0 (身份与租金)  •  Shards 1 & 2 (用户各类操作动态)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. 为什么只读节点能够直接接收写入？
在 Farcaster Snapchain 网络中，只读节点本身就是 P2P 广播网络的全功能参与节点。当客户端向 `POST /v1/submitMessage` 提交消息时：
1. 只读节点在本地迅速核验 Ed25519 签名及 FID 权限；
2. 校验通过的消息立即进入该节点的本地 **Mempool（内存池）**；
3. 只读节点通过 P2P Libp2p 广播通道向网络中的验证者节点转发该消息；
4. 验证者将消息打包进下一个 Snapchain 新区块中。

### 2. 免 Gas 签名密钥密码学逻辑 (Engine V16)
开发者与用户无需花费链上 Gas 即可签发应用密钥（Signer）：
1. **密钥对生成**：客户端在本地生成 Ed25519 密钥对。
2. **托管授权 (EIP-712)**：以太坊托管地址对链下 `KeyAddBody` 结构体进行签名（声明公钥、权限 scope 及最长 90 天有效期）。
3. **持有证明 (PoP)**：由新生成的 Ed25519 私钥对整体消息外层封装签名，证明对其私钥拥有权。
4. **零手续费**：封装好的 `KEY_ADD` 消息直发只读节点并被全网确认，无需向 Optimism 主网发送任何交易，零 Gas 消耗。

---

## 🔌 独立 REST API 文档

客户端套件内置了功能完善、零外部依赖的 RESTful API 引擎，运行于 `http://localhost:3000/api/...`（亦可通过 Cloudflare 生成的安全 HTTPS 域名直接外网调用）。每个接口均直接与您本地运行的 Snapchain 节点（`http://127.0.0.1:3381`）及本地高性能索引数据层无缝交互。

### 1. 节点健康度与 P2P 诊断
实时监测本地 Snapchain 只读节点的同步进度、对等节点连通数与响应延迟。

* **`GET /api/node/status`**
  ```bash
  curl -s http://localhost:3000/api/node/status
  ```
  **响应示例 (`200 OK`):**
  ```json
  {
    "status": "ok",
    "health": {
      "isOnline": true,
      "latencyMs": 4,
      "version": "1.0.0",
      "isSyncing": false,
      "peerCount": 24,
      "numMessages": 85492031,
      "error": null
    },
    "timestamp": 1729761000000
  }
  ```

---

### 2. 动态时间线 (Feed) 与内容筛选
拉取全网实时或关注动态流，支持精细化的客户端来源识别与关键词过滤。

* **`GET /api/feed`**
  * **查询参数 (Query Parameters):**
    * `mode` *(string)*: 动态范围 — `'global'`（全局，默认）或 `'following'`（仅限关注列表，需传 `viewerFid`）。
    * `limit` *(integer)*: 返回条数（默认：`20`，上限：`100`）。
    * `cursor` *(integer)*: 时间戳游标，用于向前/向后无限滚动翻页。
    * `source` *(string)*: 客户端来源过滤 — 如 `'all'`、`'Warpcast'`、`'Supercast'`、`'Direct Snapchain'` 等。
    * `fid` *(integer)*: 仅获取指定作者 FID 发布的动态。
    * `viewerFid` *(integer)*: 当前访问者的 FID，用于计算点赞、转播及关注状态。
    * `client_fids` *(string)*: 逗号分隔的 App FID 列表，只保留指定客户端的内容。
    * `exclude_client_fids` *(string)*: 逗号分隔的 App FID 列表，排除指定客户端的内容（例如过滤 Warpcast）。
    * `only_self_registered` *(boolean)*: 为 `true` 时，仅展示已通过自注册验证的用户动态。

  ```bash
  # 拉取最新的 25 条 Supercast 动态
  curl -s "http://localhost:3000/api/feed?limit=25&source=Supercast"
  ```

  **响应示例 (`200 OK`):**
  ```json
  {
    "casts": [
      {
        "hash": "0x8f2a1b94c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8",
        "author": {
          "fid": 2,
          "username": "v",
          "displayName": "Varun Srinivasan",
          "pfpUrl": "https://...",
          "bio": "Building Farcaster"
        },
        "text": "Decentralized social networking on Snapchain.",
        "timestamp": 1729760950,
        "client": { "name": "Supercast", "fid": 414214 },
        "reactions": { "likes": 42, "recasts": 12 },
        "viewerContext": { "liked": false, "recasted": false }
      }
    ],
    "nextCursor": 1729758000
  }
  ```

---

### 3. Cast 发布与完整回复树检索
直接使用已签名的 Ed25519 二进制 Protobuf 格式向节点本地内存池提交新 Cast、引用转发或主题评论。

* **`POST /api/casts`**
  ```bash
  curl -X POST http://localhost:3000/api/casts \
    -H "Content-Type: application/json" \
    -d '{
      "fid": 320011,
      "signerPrivateKey": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "text": "来自我的独立 Snapchain 节点的直发广播！",
      "embeds": [{ "url": "https://farcaster.xyz" }],
      "parentCastId": {
        "fid": 2,
        "hash": "0x8f2a1b94c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8"
      }
    }'
  ```

  **响应示例 (`200 OK`):**
  ```json
  {
    "status": "ok",
    "success": true,
    "hash": "0x3e1a8b94c7d2e1f0a9b8c7d6e5f4a3b2c1d0e9f1",
    "cast": {
      "hash": "0x3e1a8b94c7d2e1f0a9b8c7d6e5f4a3b2c1d0e9f1",
      "fid": 320011,
      "text": "来自我的独立 Snapchain 节点的直发广播！"
    }
  }
  ```

* **`GET /api/casts/:hash`**
  获取整条会话评论树，包括父级 Cast、祖先 Cast 以及按时间排列的所有下属回复。
  ```bash
  curl -s http://localhost:3000/api/casts/0x8f2a1b94c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8
  ```

---

### 4. 社交互动 (点赞与转播)
向节点内存池提交或取消协议层级的点赞 (Like) 与转播 (Recast)。

* **`POST /api/reactions`**
  ```bash
  curl -X POST http://localhost:3000/api/reactions \
    -H "Content-Type: application/json" \
    -d '{
      "fid": 320011,
      "signerPrivateKey": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "targetFid": 2,
      "targetHash": "0x8f2a1b94c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8",
      "type": "like",
      "isRemove": false
    }'
  ```

  **核心参数说明:**
  * `type` *(string)*: 操作类型 — `'like'` (点赞) 或 `'recast'` (转播)。
  * `isRemove` *(boolean)*: `false` 为新增互动；`true` 为撤销/取消该互动。

---

### 5. 社交图谱 (关注与取关)
通过协议级 `LinkAdd` 与 `LinkRemove` 消息构建或解除链上关注关系。

* **`POST /api/links`**
  ```bash
  curl -X POST http://localhost:3000/api/links \
    -H "Content-Type: application/json" \
    -d '{
      "fid": 320011,
      "signerPrivateKey": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "targetFid": 3,
      "type": "follow",
      "isRemove": false
    }'
  ```

---

### 6. 用户资料与个人动态历史
查询链上身份、社交统计、个人简介及已发布的历史 Cast 列表。

* **`GET /api/users/:id`**: 通过数字 FID（例如 `/api/users/2`）或用户名（例如 `/api/users/dwr.eth`）快速查询。
* **`GET /api/users/:id/casts?limit=30`**: 按时间倒序拉取该用户发布的历史 Cast 列表。
* **`GET /api/users/search?q=alice`**: 根据用户名、昵称或数字 FID 进行全库模糊检索。

---

### 7. 多链钱包资产余额与持仓
实时查询指定托管地址或指定 FID 在 **Ethereum** 与 **Base** 主网上的代币持仓、现价与 USD 估值。

* **`GET /api/wallet/tokens?fid=320011`**
* **`GET /api/wallet/tokens?address=0x1234567890abcdef1234567890abcdef12345678`**

  **响应示例 (`200 OK`):**
  ```json
  {
    "status": "ok",
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "totalUsd": 1420.50,
    "tokens": [
      {
        "id": "eth",
        "name": "Ether",
        "symbol": "ETH",
        "decimals": 18,
        "amount": 0.45,
        "price": 2700.00,
        "usdValue": 1215.00,
        "network": "Ethereum"
      },
      {
        "id": "degen",
        "name": "Degen",
        "symbol": "DEGEN",
        "decimals": 18,
        "amount": 25000.0,
        "price": 0.00822,
        "usdValue": 205.50,
        "network": "Base"
      }
    ]
  }
  ```

---

### 8. 多媒体图片上传接口
上传用于嵌入 Cast 动态的图片资源，内置服务端 Magic Bytes 文件签名校验（支持 JPEG、PNG、GIF、WebP 格式，单文件上限 10 MB）。

* **`POST /api/upload`** (Multipart Form Data，表单字段名为 `file`):
  ```bash
  curl -X POST http://localhost:3000/api/upload \
    -F "file=@screenshot.png"
  ```
  **响应示例 (`200 OK`):**
  ```json
  {
    "status": "ok",
    "url": "/uploads/media_7f8a9b1c2d.png"
  }
  ```

---

### 9. 生态客户端注册表
获取当前网络已识别的客户端应用列表及其对应的 App FID，方便前端进行归属标记或自由过滤。

* **`GET /api/clients`**
  ```json
  {
    "status": "ok",
    "clients": [
      { "name": "Warpcast", "fid": 9152 },
      { "name": "Supercast", "fid": 414214 },
      { "name": "Phaver", "fid": 9534 },
      { "name": "Herocast", "fid": 194682 },
      { "name": "Direct Snapchain", "fid": 0 }
    ]
  }
  ```

---

### 10. 身份认证与免 Gas 密钥派发
* **`POST /api/auth/login`**: 支持使用 12/24 词助记词或已有有效 Ed25519 签名私钥登录。自动派发并由以太坊托管地址完成 EIP-712 链下免 Gas 授权签名。
* **`POST /api/auth/sandbox`**: 一键快速生成一套 12 词沙盒测试助记词与隔离测试账户，便于无风险本地调试。

---

## 📄 开源许可协议 (License)

本项目代码完全开源，遵循 **MIT 许可证**。
详情请参阅 [LICENSE](LICENSE) 文件。
