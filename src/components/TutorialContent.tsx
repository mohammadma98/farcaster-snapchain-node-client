'use client';

import React from 'react';
import {
  Layers,
  Network,
  KeyRound,
  Filter,
  ShieldCheck,
  Server,
  Terminal,
  Zap,
  Cpu,
  Database,
  Lock,
  UserCheck,
  Hash,
  Coins,
  HardDrive,
  Shield,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Language, translations } from '../lib/translations';

interface TutorialContentProps {
  lang: Language;
}

export function TutorialContent({ lang }: TutorialContentProps) {
  const isZh = lang === 'zh';

  return (
    <div className="space-y-12 text-purple-100/90 leading-relaxed">
      {/* Module 1: FIDs & Custody Addresses */}
      <section className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {isZh ? '1. 协议身份体系：FIDs 与托管地址 (Custody Addresses)' : '1. Protocol Identity: FIDs & Custody Addresses'}
            </h3>
            <span className="text-xs text-purple-200/50">
              {isZh ? 'IdRegistry 合约 • 永久数字身份 • 所有权与操作权分离' : 'IdRegistry Contract • Immutable Numeric Identity • Ownership vs Operation'}
            </span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {isZh
            ? '在 Farcaster 协议中，用户身份是纯链上自托管的，完全不依赖任何 Web2 邮箱或手机号。身份的核心由两大部分构成：'
            : 'In the Farcaster protocol, user identity is self-sovereign and on-chain, requiring zero centralized Web2 intermediaries (no email, phone, or password). Identity is fundamentally anchored by two primitives:'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3 font-mono text-xs">
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-bold font-sans">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/30 text-xs">#</span>
              <span>Farcaster ID (FID)</span>
            </div>
            <p className="text-purple-200/70 text-[11px] font-sans leading-relaxed">
              {isZh
                ? 'FID 是分配给每个账户的全局唯一正整数（例如 FID 1, 2, 3）。它由部署在 Optimism 主网上的 IdRegistry 智能合约递增发行。用户名（FName）可以变更，但 FID 是永恒不变的底层主键。'
                : 'A globally unique, auto-incrementing integer (e.g. FID 2, 3). Minted on Optimism L2 by the IdRegistry smart contract. Usernames (FNames) can be transferred or changed, but your FID is the permanent, immutable anchor of your social graph.'}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold font-sans">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <span>Custody Address (托管地址)</span>
            </div>
            <p className="text-cyan-200/70 text-[11px] font-sans leading-relaxed">
              {isZh
                ? '以太坊地址（通过 12/24 位助记词派生），拥有对该 FID 的最高所有权。托管地址可以转移 FID、添加/注销应用签名密钥（Signers），但绝不能直接用于高频日常签名。'
                : 'The standard Ethereum address (derived from your 12 or 24-word seed phrase) that holds ultimate ownership of the FID. It has root permissions to transfer the FID or authorize signers, but should never be exposed for daily post signing.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-purple-950/30 border border-purple-500/20 p-4 text-xs space-y-1">
          <span className="font-semibold text-white block">
            {isZh ? '🔑 所有权与操作权的安全隔离原则：' : '🔑 The Separation of Ownership & Operation:'}
          </span>
          <p className="text-purple-200/70 text-[11px]">
            {isZh
              ? '日常发帖、点赞或关注由低权限的 Ed25519 应用密钥（App Key）完成。即使客户端或服务器受到攻击，攻击者也只能操作社交动作，绝对无法转移你的 FID 或盗取以太坊资产。'
              : 'Everyday actions (casts, likes, follows) are signed by lightweight Ed25519 App Keys. Even if a third-party client is compromised, the attacker can only publish social messages; they can NEVER transfer your FID or access your funds.'}
          </p>
        </div>
      </section>

      {/* Module 2: Storage Rent & Pruning Mechanics */}
      <section className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {isZh ? '2. 状态经济学：存储租约与修剪机制 (Storage Rent & Pruning)' : '2. State Economics: Storage Rent & Pruning'}
            </h3>
            <span className="text-xs text-purple-200/50">
              {isZh ? '防止状态膨胀 • 存储单元规格 • FIFO 自动修剪机制' : 'Preventing State Bloat • Storage Unit Quotas • FIFO Pruning'}
            </span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {isZh
            ? '传统区块链因无限累积历史状态导致全节点体积恶性膨胀。Farcaster 创新性地引入了“存储租约（Storage Rent）”机制：用户为占用全网节点的 RAM 与 NVMe 空间支付年租费，既抑制了女巫垃圾攻击，又保证了普通个人服务器能够轻松运行只读节点。'
            : 'Traditional blockchains suffer from unconstrained state growth, requiring terabytes of storage that price out independent operators. Farcaster solves this via Storage Rent: users pay an annual fee to lease physical storage on peer nodes, disincentivizing spam while keeping node requirements modest.'}
        </p>

        <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-3 font-mono text-xs">
          <div className="text-emerald-400 font-sans font-semibold">
            {isZh ? '📦 单个存储单元（1 Unit）的标准容量配额：' : '📦 Storage Unit (1 Unit) Capacity Quota:'}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-lg font-bold text-white block">5,000</span>
              <span className="text-[10px] text-purple-200/60 font-sans">{isZh ? 'Casts 发帖数' : 'Casts'}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-lg font-bold text-white block">2,500</span>
              <span className="text-[10px] text-purple-200/60 font-sans">{isZh ? 'Reactions 点赞/转发' : 'Reactions'}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-lg font-bold text-white block">2,500</span>
              <span className="text-[10px] text-purple-200/60 font-sans">{isZh ? 'Links 关注关系' : 'Follow Links'}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-lg font-bold text-white block">50</span>
              <span className="text-[10px] text-purple-200/60 font-sans">{isZh ? 'UserData 资料字段' : 'UserData'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-black/60 border border-white/5 p-4 text-xs space-y-2">
          <h4 className="font-semibold text-white">
            {isZh ? 'FIFO 修剪机制 (First-In, First-Out Pruning)：' : 'FIFO Pruning Dynamics:'}
          </h4>
          <p className="text-purple-200/70 text-[11px] leading-relaxed">
            {isZh
              ? '当某个 FID 的消息数量超过已租用的存储单元上限时，Snapchain 节点会严格遵循 FIFO（先进先出）原则：自动修剪掉该用户时间最早的那条消息，以便腾出空间容纳最新的消息。若希望永久保留更多发言，只需购买额外的存储单元即可。'
              : 'When an FID exceeds its purchased storage limit, Snapchain nodes automatically prune the oldest message in that category (FIFO: First-In, First-Out). This guarantees predictable disk usage for node operators while allowing users to purchase additional units if they desire larger active histories.'}
          </p>
        </div>
      </section>

      {/* Module 3: Snapchain Architecture & Read Nodes vs Validators */}
      <section className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {isZh ? '3. Snapchain 架构：只读节点与验证者节点 (Read Nodes vs Validators)' : '3. Snapchain Architecture: Read Nodes vs Validators'}
            </h3>
            <span className="text-xs text-purple-200/50">Tendermint / CometBFT • Shards 0, 1, 2 • P2P Gossip Mesh</span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {isZh
            ? 'Snapchain 是 Farcaster 专为海量社交吞吐量设计的底层区块链，取代了旧版单体 Hubble 架构。它基于拜占庭容错共识（CometBFT），并将数据严格分片：'
            : 'Snapchain is Farcaster’s high-throughput consensus blockchain, replacing monolithic Hubble hubs. Engineered on CometBFT Byzantine Fault Tolerance, it partitions state into specialized shards:'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-purple-300 font-bold font-sans">
              <span>Shard 0 (Identity & Rent)</span>
              <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded font-mono">Consensus Critical</span>
            </div>
            <p className="text-purple-200/70 text-[11px] font-sans">
              {isZh
                ? '管理全局核心状态：FID 注册、托管地址绑定、App Key 签名密钥授权以及存储单元租约。'
                : 'Maintains foundational identity state: FID registry, custody bindings, App Key authorizations, and active storage rent units.'}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-cyan-300 font-bold font-sans">
              <span>Shards 1 & 2 (User Actions)</span>
              <span className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded font-mono">Parallel Execution</span>
            </div>
            <p className="text-cyan-200/70 text-[11px] font-sans">
              {isZh
                ? '并行处理高频社交消息流：CastAdd/Remove 发帖、ReactionAdd 点赞/转发、LinkAdd 关注关系及个人资料变更。'
                : 'Executes high-frequency social graph operations: CastAdd/Remove, ReactionAdd/Remove, LinkAdd (Follows), and UserData updates.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-black/60 border border-white/5 p-4 space-y-2 text-xs">
          <h4 className="font-semibold text-white">
            {isZh ? '只读节点与验证者节点的职责对比：' : 'Read Nodes vs Validator Nodes:'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-purple-200/70 pt-1">
            <div className="border-l-2 border-cyan-400 pl-3">
              <strong className="text-white block mb-0.5">{isZh ? '只读节点 (Read Nodes - 本套件):' : 'Standalone Read Nodes:'}</strong>
              {isZh
                ? '无需质押，不参与出块投票。持续同步并校验已定案区块，并在本地提供低延迟的 HTTP (:3381) 与 gRPC (:3383) 接口。同时将客户端发来的写入请求注入内存池并向全网广播。'
                : 'Zero staking or voting rights. Continuously syncs finalized blocks, serves microsecond local queries via HTTP (:3381) / gRPC (:3383), and relays submitted writes into validator mempools.'}
            </div>
            <div className="border-l-2 border-purple-400 pl-3">
              <strong className="text-white block mb-0.5">{isZh ? '验证者节点 (Validator Nodes):' : 'Validator Nodes:'}</strong>
              {isZh
                ? '运行 CometBFT 共识协议，收集各只读节点广播上来的内存池交易，按轮次进行区块提议并签名达成最终性（Finality）。'
                : 'Run CometBFT consensus engine, collect incoming gossip transactions, propose candidate blocks, and cryptographically vote to seal block finality.'}
            </div>
          </div>
        </div>
      </section>

      {/* Module 4: Why Read Nodes Take Writes */}
      <section className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {isZh ? '4. 核心机制：为什么只读节点可以接受写入请求？' : '4. Protocol Mechanics: Why Read Nodes Accept Writes'}
            </h3>
            <span className="text-xs text-purple-200/50">Mempool Libp2p Gossip • Zero Intermediaries • HTTP POST :3381</span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {isZh
            ? '开发者常有困惑：“既然称为只读节点，为何还能处理写入？” 在 Snapchain 架构中，只读节点绝非被动的缓存代理，而是对等的 P2P 写入中继站：'
            : 'New developers often wonder: "If it is called a read node, why does it accept writes?" In Snapchain, read nodes are full sovereign peers in the libp2p gossip mesh:'}
        </p>

        <div className="rounded-xl border border-white/10 bg-black/80 p-4 font-mono text-xs text-purple-300 space-y-2">
          <div className="text-white font-semibold font-sans">
            {isZh ? '📜 消息写入的完整六步生命周期：' : '📜 The 6-Step Message Write Lifecycle:'}
          </div>
          <div className="space-y-1.5 text-[11px] text-purple-200/80">
            <div>1. <span className="text-cyan-300">Client Signature</span>: Client generates message & signs with Ed25519 App Key.</div>
            <div>2. <span className="text-cyan-300">Local Submission</span>: Binary protobuf payload sent to read node: <code className="text-cyan-300">POST http://127.0.0.1:3381/v1/submitMessage</code></div>
            <div>3. <span className="text-cyan-300">Edge Verification</span>: Read node verifies signature, checks FID storage rent balance, and validates sequence nonce.</div>
            <div>4. <span className="text-cyan-300">Mempool Admission</span>: Valid messages enter the read node’s local in-memory <strong>mempool</strong>.</div>
            <div>5. <span className="text-cyan-300">P2P Gossip Broadcast</span>: Read node broadcasts the message via libp2p (:3382 UDP/QUIC) to validator peers.</div>
            <div>6. <span className="text-cyan-300">Block Inclusion</span>: Validators bundle the message into the next block across Shards 1 or 2.</div>
          </div>
        </div>

        <p className="text-xs text-purple-200/70">
          {isZh
            ? '这一设计消除了对任何中心化中继服务商（如 Neynar、Alchemy）的依赖。你的本地只读节点就是你通向整个全球社交网络的抗审查主权网关。'
            : 'This design completely eliminates third-party gatekeeper dependencies. Your standalone read node is your direct, censorship-resistant doorway into the global peer-to-peer network.'}
        </p>
      </section>

      {/* Module 5: Gasless App Keys & Unix rm Security Guidance */}
      <section className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {isZh ? '5. 无 Gas 签名密钥 (Engine V16) 与 Unix rm 安全哲学' : '5. Gasless App Keys (Engine V16) & Unix rm Security Philosophy'}
            </h3>
            <span className="text-xs text-purple-200/50">EIP-712 Custody Signature • Proof of Possession • Zero OP ETH</span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {isZh
            ? '在旧版 Farcaster 中，注册一个签名密钥（Signer）必须向 Optimism 链发送链上交易并支付 ETH Gas 费。自 Snapchain Engine V16 起，引入了完全无 Gas 的签名密钥注册协议：'
            : 'In early Farcaster iterations, issuing a new App Key (Signer) required submitting an on-chain transaction to Optimism Mainnet and paying ETH gas. Since Engine V16, app keys are registered entirely off-chain without spending a single cent of OP ETH:'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-2">
            <span className="text-purple-300 font-bold block font-sans">1. EIP-712 Custody Authorization</span>
            <p className="text-purple-200/70 text-[11px] leading-relaxed">
              {isZh
                ? '以太坊托管地址对 KeyAddBody 结构体（包含新 Ed25519 公钥、权限范围 Scopes、滑动有效期 TTL 与 Nonce）进行标准 EIP-712 链下签名。无需发起任何链上交易。'
                : 'The custody Ethereum address produces an off-chain EIP-712 typed signature over the KeyAddBody struct (containing the Ed25519 public key, permissions, TTL, and nonce). No gas fees required.'}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-2">
            <span className="text-cyan-300 font-bold block font-sans">2. Proof of Possession (PoP)</span>
            <p className="text-cyan-200/70 text-[11px] leading-relaxed">
              {isZh
                ? '新生成的 Ed25519 私钥再对整个消息信封进行签名，证明调用方真实持有该私钥，防止他人盗用或伪造公钥注册。'
                : 'The newly generated Ed25519 private key signs the overall message envelope, proving possession and preventing public key replay attacks.'}
            </p>
          </div>
        </div>

        {/* Unix rm Security Warning */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Lock className="h-4 w-4" />
            <span>Developer Security Guidance (Unix `rm` Analogy)</span>
          </div>
          <p className="text-amber-200/80 leading-relaxed text-[11px]">
            {isZh
              ? '在 Unix 操作系统中，`rm -rf` 赋予管理员毁灭性的底层权力，使用不慎会导致数据全失。同样，在开源开发者软件中直接输入助记词或私钥具有极高风险！'
              : 'In Unix, the `rm -rf` command provides unmediated raw power: essential for low-level systems engineers, but disastrous if used carelessly. Handling mnemonic seed phrases in developer software carries the exact same weight:'}
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-200/90 pl-1">
            <li>
              <strong>{isZh ? '仅使用专用测试账户：' : 'Dedicated Test Accounts Only:'}</strong>{' '}
              {isZh
                ? '仅在测试账户中输入助记词，切勿在开发环境中输入存放核心资产或高净值域名的冷钱包！'
                : 'Only test with dedicated sandbox accounts. Never expose your primary cold-storage wallet in local dev environments.'}
            </li>
            <li>
              <strong>{isZh ? '一键沙盒生成器：' : 'Built-in 1-Click Sandbox:'}</strong>{' '}
              {isZh
                ? '在客户端中使用“生成沙盒测试账户”按钮，即刻在内存中生成临时密钥对，零风险体验完整流程。'
                : 'Use our client’s "1-Click Sandbox Test Session" button to generate ephemeral keypairs in-memory with zero financial risk.'}
            </li>
          </ul>
        </div>
      </section>

      {/* Module 6: Client Filtering Mechanics & Sovereign Community */}
      <section className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {isZh ? '6. 社区治理：客户端中立性与信息流过滤机制' : '6. Community Curation: Client Neutrality & Filtering Engine'}
            </h3>
            <span className="text-xs text-purple-200/50">Censorship Resistance • Source Attribution • Include & Exclude Rules</span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {isZh
            ? '去中心化社交协议最强大的基石在于客户端中立性（Client Neutrality）：底层协议存储所有人的所有数据，但每个客户端可以根据自己的社区价值观定制过滤逻辑。'
            : 'The cornerstone of decentralized social networks is Client Neutrality: the underlying protocol stores all data globally, but individual clients have full sovereignty over display and filtering rules.'}
        </p>

        <div className="space-y-3 text-xs text-purple-200/70">
          <ul className="list-disc list-inside space-y-2 pl-2 text-[12px] text-purple-200/85">
            <li>
              <strong className="text-white">Exclude Warpcast Mode:</strong>{' '}
              {isZh
                ? '过滤掉来自主流大厂客户端的营销、引流或日常闲聊内容，打造极简、纯粹的技术开发者专属信息流。'
                : 'Filter out consumer marketing, engagement-bait, and mainstream chatter to establish a focused developer feed.'}
            </li>
            <li>
              <strong className="text-white">Supercast / Native Snapchain Only:</strong>{' '}
              {isZh
                ? '仅保留高阶重度用户及自主节点运行者发布的发言，营造高信噪比的技术极客圈层。'
                : 'Isolate power-user discussions and direct protocol node builders for ultra-high signal-to-noise ratio.'}
            </li>
            <li>
              <strong className="text-white">Custom Regex & Keyword Rules:</strong>{' '}
              {isZh
                ? '结合关键字黑名单与客户端来源双重维度，无需中心化算法审核即可构建自主可控的专属去中心化社群。'
                : 'Combine client attribution with keyword blacklist filters to curate autonomous communities free from algorithmic manipulation.'}
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
