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

## ⚠️ 开发者安全提示（类比 Unix `rm` 操作）

> **开发者重要安全警示**：
> 在任何开发者客户端中输入助记词或私钥，在安全层面上等同于在 Unix 系统中执行 `rm -rf` 指令：它赋予程序直接、底层的最高加密权限。
> 
> - **强烈建议仅使用专门的测试账户**或测试 FID 进行开发调试；
> - **切勿输入存储有核心大额资产的冷钱包助记词**；
> - 可在 Web 界面中直接点击 **"生成沙盒测试账户"（Generate Sandbox Account）** 按钮，一键创建独立测试账户，零风险体验全部协议功能。

---

## 💻 交互式命令行工具 (CLI Reference)

套件内置了可直连只读节点的 CLI 命令行工具（可在本地环境运行，或在 Docker 中通过 `./scripts/2-create-client.sh cli` 执行）：

```bash
# 查看只读节点运行状态与连接的 P2P 节点数
npm run cli node-info

# 查看指定 FID 的 Feed，并过滤掉来自 Warpcast 的动态
npm run cli feed 2 --exclude Warpcast

# 查看指定 FID 的 Feed，并只保留来自 Supercast 的动态
npm run cli feed 2 --include Supercast

# 按关键词过滤垃圾广告内容
npm run cli feed 2 --keyword "airdrop"

# 签发免 Gas 的应用密钥 (Signer)
npm run cli create-signer <fid>

# 直接向节点内存池广播发布一条 Cast
npm run cli post-cast "Decentralized social via standalone Snapchain read node!"

# 链上关注某位用户 (LinkAdd)
npm run cli follow 3

# 取消关注某位用户 (LinkRemove)
npm run cli unfollow 3

# 对特定 Cast 进行点赞或转播 (React)
npm run cli react 2 0x8f2a1b94c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8 like
```

---

## 🔌 独立 REST API 文档

客户端套件内置了完整的 RESTful 后端 API 接口（`/api/...`），这些接口直接与本地运行的 Snapchain 节点通信（`http://127.0.0.1:3381`），可轻松对接至您自己的外部系统或自动化 Agent 中：

### 1. 动态与 Cast
* **`GET /api/feed?source=all&limit=40`**：获取近期协议动态，支持客户端来源过滤（如 `source=Warpcast`、`source=Supercast` 等）。
* **`GET /api/casts/:hash`**：根据哈希查询 Cast 详情、父 Cast 及完整回复列表。
* **`POST /api/casts`**：通过 Protobuf 二进制签名直接向节点内存池发布全新 Cast、引用 Cast 或回复。

### 2. 社交互动与关注关系
* **`POST /api/reactions`**：对目标 Cast 点赞、取消点赞、转播或取消转播。
* **`POST /api/links`**：关注或取关特定目标 FID 用户。

### 3. 用户与信息检索
* **`GET /api/users/:id`**：根据数字 FID 或 `@username` 检索用户资料。
* **`GET /api/users/:id/casts`**：获取指定用户发表的历史 Cast。
* **`GET /api/users/search?q=query`**：模糊搜索用户名、显示名称或 FID。

### 4. 身份认证与节点健康
* **`POST /api/auth/login`**：基于助记词验证、推导托管地址并通过 EIP-712 自动派发 Ed25519 密钥。
* **`POST /api/auth/sandbox`**：一键生成 12 词测试助记词与沙盒账户。
* **`GET /api/node/status`**：实时返回节点健康度、网络延迟、连接对等节点数量及区块同步高度。

---

## 🧪 自动化测试与构建

运行协议集成测试套件，验证二进制序列化、客户端过滤逻辑、关注消息构建与密码学推导：

```bash
npm test
```

打包 Next.js 生产环境应用：
```bash
npm run build
```

---

## 📄 开源许可协议 (License)

本项目代码完全开源，遵循 **MIT 许可证**。
详情请参阅 [LICENSE](LICENSE) 文件。
