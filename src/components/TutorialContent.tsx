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
} from 'lucide-react';
import { Language, translations } from '../lib/translations';

interface TutorialContentProps {
  lang: Language;
}

export function TutorialContent({ lang }: TutorialContentProps) {
  const t = translations[lang];

  return (
    <div className="space-y-12 text-purple-100/90 leading-relaxed">
      {/* Module 1: Architecture Overview */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t.architectureTitle}</h3>
            <span className="text-xs text-purple-200/50">Tendermint / CometBFT • Shards • Read Nodes vs Validators</span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {lang === 'zh'
            ? 'Snapchain 是 Farcaster 协议的高性能去中心化存储层，采用了基于 CometBFT（Tendermint）的拜占庭容错共识引擎。与旧版 Hubble 单节点全网状态同步不同，Snapchain 引入了分片存储（Sharding）架构：'
            : 'Snapchain is the high-throughput decentralized storage layer for Farcaster, replacing Hubble with a Byzantine Fault Tolerant (BFT) consensus engine based on CometBFT. Unlike legacy monolithic hubs, Snapchain partitions protocol state across shards:'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 font-mono text-xs">
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-purple-300 font-bold">
              <span>Shard 0 (Identity & Rent)</span>
              <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded">Core State</span>
            </div>
            <p className="text-purple-200/70 text-[11px] font-sans">
              {lang === 'zh'
                ? '管理 FID 注册、链上账户托管地址绑定、App Key 签名密钥授权以及存储单元租约（Rent units）。'
                : 'Maintains FID registrations, custody address mappings, App Key signer authorizations, and storage rent units.'}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-cyan-300 font-bold">
              <span>Shards 1 & 2 (User Actions)</span>
              <span className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded">High Throughput</span>
            </div>
            <p className="text-cyan-200/70 text-[11px] font-sans">
              {lang === 'zh'
                ? '并行处理社交消息流：Casts 发言、Reactions 点赞转发、Links 关注关系以及 UserData 个人资料更新。'
                : 'Processes social graph operations in parallel: CastAdd/Remove, ReactionAdd, Follow/Unfollow links, and profile updates.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-black/60 border border-white/5 p-4 space-y-2 text-xs">
          <h4 className="font-semibold text-white">Read Nodes vs Validator Nodes:</h4>
          <p className="text-purple-200/70">
            {lang === 'zh'
              ? '验证者节点（Validators）运行 Tendermint 引擎并通过 PoS/BFT 进行区块提议与共识签名。而只读节点（Read Nodes）无需参与共识出块，只需同步验证已确定的区块并向外部提供高速 HTTP/gRPC 查询与写入中继服务。'
              : 'Validator nodes participate in CometBFT block proposals and consensus voting. Standalone Read Nodes, on the other hand, do not need staking or consensus rights; they continuously sync verified blocks and provide local low-latency HTTP/gRPC query and write relay services.'}
          </p>
        </div>
      </section>

      {/* Module 2: Why Read Nodes Take Writes */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t.readNodeRoleTitle}</h3>
            <span className="text-xs text-purple-200/50">Mempool Gossip • Signature Verification • HTTP :3381</span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {lang === 'zh'
            ? '初学者常有疑问：“既然是只读节点，为什么还能接受写请求？” 在去中心化协议设计中，这是极具威力的特性：'
            : 'Developers often ask: "If it is called a read node, why does it accept write requests?" In peer-to-peer architecture, this is intentional and sovereign:'}
        </p>

        <div className="rounded-xl border border-white/10 bg-black/80 p-4 font-mono text-xs text-purple-300 space-y-2">
          <div className="text-white font-semibold font-sans">The Message Write Lifecycle:</div>
          <div className="space-y-1 text-[11px] text-purple-200/80">
            <div>1. Client creates message & signs with Ed25519 App Key.</div>
            <div>2. Client sends HTTP POST binary protobuf to local read node: <code className="text-cyan-300">http://127.0.0.1:3381/v1/submitMessage</code></div>
            <div>3. Read node validates Ed25519 signature, checks FID storage rent limits, and checks nonce.</div>
            <div>4. If valid, read node injects the message into its local <strong>mempool</strong>.</div>
            <div>5. Read node gossips the message via libp2p (:3383) to validator peers.</div>
            <div>6. Validators include message in the next Snapchain block.</div>
          </div>
        </div>

        <p className="text-xs text-purple-200/70">
          {lang === 'zh'
            ? '这意味着开发者无需依赖任何中介服务器即可发布内容。你的本地只读节点就是你通向整个去中心化社交网络的私有网关。'
            : 'This means you never need a centralized relay (like Neynar or Infura) to publish. Your local read node acts as your private censorship-resistant gateway directly into the global gossip network.'}
        </p>
      </section>

      {/* Module 3: Gasless App Keys */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t.gaslessSignersTitle}</h3>
            <span className="text-xs text-purple-200/50">EIP-712 Signatures • Zero OP ETH • Engine V16</span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {lang === 'zh'
            ? '在旧版 Farcaster 中，为应用授权一个签名密钥（Signer）必须向 Optimism 主网发送链上交易并支付 ETH Gas 费。自 Snapchain Engine V16 起，引入了“无 Gas 签名密钥”（Gasless Signers）：'
            : 'In early Farcaster iterations, registering a new App Key (Signer) required submitting an on-chain transaction to Optimism and paying ETH gas. Since Snapchain Engine V16, signers can be registered completely gasless:'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-2">
            <span className="text-purple-300 font-bold block">1. EIP-712 Custody Signature</span>
            <p className="text-purple-200/70 text-[11px]">
              {lang === 'zh'
                ? '以太坊托管地址（Custody Address）对 KeyAddBody 结构体进行 EIP-712 离线签名，授权特定的 Ed25519 公钥、权限范围（Scopes）和过期时间（TTL）。'
                : 'The Ethereum custody address produces an off-chain EIP-712 signature over KeyAddBody, authorizing the Ed25519 public key, permitted scopes, and sliding-window TTL.'}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-2">
            <span className="text-cyan-300 font-bold block">2. Proof of Possession (PoP)</span>
            <p className="text-cyan-200/70 text-[11px]">
              {lang === 'zh'
                ? '新生成的 Ed25519 私钥再对整个消息信封进行签名，证明调用方确实持有该私钥，防止公钥重放攻击。'
                : 'The newly generated Ed25519 private key signs the overall message envelope, proving possession and preventing unauthorized public key spoofing.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Lock className="h-4 w-4" />
            <span>Developer Security Guidance (Unix `rm` Analogy)</span>
          </div>
          <p className="text-amber-200/80 leading-relaxed text-[11px]">
            {lang === 'zh'
              ? 'Balaji 特别指出：在开源开发者客户端中输入助记词或私钥，在安全哲学上类似于在 Unix 中执行 `rm` 命令——它给予开发者完全的底层自由度，但也要求必须仅在测试账号中使用。切勿在开发环境中输入存放高价值资产的冷钱包！'
              : 'Balaji specifically emphasized framing seed phrase entry with clear developer warnings: like `rm` in Unix, developer software exposes raw cryptographic control for testing and development. Always use dedicated test accounts with sandbox FIDs rather than personal high-value cold wallets.'}
          </p>
        </div>
      </section>

      {/* Module 4: Client Filtering Mechanics */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t.clientFilterTheoryTitle}</h3>
            <span className="text-xs text-purple-200/50">Balaji Community Specification • Source Attribution • Sovereign Curation</span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {lang === 'zh'
            ? 'Balaji 在挑战需求中特别指明：客户端必须能够包含或排除来自任何其他客户端（如 Warpcast、Supercast）的内容，以此让用户能够构建属于自己的独特社区。'
            : 'In his prize specification, Balaji explicitly instructed: "You can also build the client to do things like include or exclude casts from any other client (like Warpcast or Supercast) so as to make your own community."'}
        </p>

        <div className="space-y-3 text-xs text-purple-200/70">
          <p>
            {lang === 'zh'
              ? '去中心化网络的美妙之处在于客户端中立性（Client Neutrality）。传统社交网络中中心化平台决定你的时间线；而在 Farcaster 上，所有数据都是底层公开的，每个客户端可以拥有完全自主的过滤策略：'
              : 'The brilliance of decentralized social protocols is Client Neutrality. On centralized platforms, an opaque algorithm controls your feed. On Farcaster, all data is in the global state, allowing sovereign client-side filtering:'}
          </p>

          <ul className="list-disc list-inside space-y-1.5 pl-2 text-[12px] text-purple-200/80">
            <li>
              <strong>Warpcast Exclude Mode:</strong> Filter out corporate casts, consumer spam, and engagement-bait to create a pure developer-first feed.
            </li>
            <li>
              <strong>Supercast / Native Filter:</strong> Isolate power-user discussions and direct protocol participants.
            </li>
            <li>
              <strong>Custom Community Rules:</strong> Combine client origin filtering with keyword and channel regex to spawn niche, censorship-resistant communities.
            </li>
          </ul>
        </div>
      </section>

      {/* Module 5: Zero API Keys vs Gateways */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t.zeroApiKeyTitle}</h3>
            <span className="text-xs text-purple-200/50">Self-Hosting • Censorship Resistance • Cost Analysis</span>
          </div>
        </div>

        <p className="text-sm text-purple-200/80">
          {lang === 'zh'
            ? '许多 Farcaster 应用为了省事而依赖 Neynar 等中心化 API 网关。但这引入了月租费用、调用次数限额以及单点审查风险。'
            : 'Many early Farcaster developers relied on Neynar or centralized hubs out of convenience. While useful for rapid prototyping, third-party APIs introduce rate limits, recurring monthly subscription fees, and central points of failure.'}
        </p>

        <div className="rounded-xl border border-white/10 bg-black/60 p-4 text-xs space-y-2">
          <div className="text-white font-semibold">Self-Hosted Standalone Node Economics:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-purple-200/70 pt-2">
            <div>
              <span className="text-emerald-400 font-semibold block mb-1">Standalone Read Node (Our Solution):</span>
              • Zero recurring API fees<br />
              • Unthrottled local queries at &lt;5ms latency<br />
              • Direct mempool gossip broadcasting<br />
              • 100% sovereign data ownership
            </div>
            <div>
              <span className="text-amber-400 font-semibold block mb-1">Centralized Gateway (Neynar/Alchemy):</span>
              • \$99 to \$999/month API tiers<br />
              • Rate limits & quota throttling<br />
              • Potential censorship or service outages<br />
              • Dependent on third-party uptime
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
