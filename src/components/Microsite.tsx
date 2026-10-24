'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Server,
  Cpu,
  Layers,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Shield,
  Zap,
  HardDrive,
  CheckCircle2,
  Lock,
  Radio,
  BookOpen,
  Video,
  HeartHandshake,
  ArrowRight,
  Code2,
} from 'lucide-react';
import { Language, translations } from '../lib/translations';

interface MicrositeProps {
  onOpenClient?: () => void;
}

export function Microsite({ onOpenClient }: MicrositeProps) {
  const [lang, setLang] = useState<Language>('en');
  const [copiedOneCommand, setCopiedOneCommand] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const isZh = lang === 'zh';

  const oneCommandScript =
    'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash';

  const handleCopyOneCommand = () => {
    navigator.clipboard.writeText(oneCommandScript);
    setCopiedOneCommand(true);
    setTimeout(() => setCopiedOneCommand(false), 2000);
  };

  const handleCopySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-purple-100 selection:text-purple-900 font-sans antialiased flex flex-col justify-between">
      {/* TOP HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Wordmark */}
          <a href="#" className="flex items-center gap-2.5 group">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-700 text-white font-bold text-sm shadow-xs group-hover:bg-purple-800 transition-colors">
              FC
            </span>
            <span className="font-bold text-slate-900 tracking-tight text-base">
              Farcaster Snapchain
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-purple-50 text-purple-700 border border-purple-200">
              MIT
            </span>
          </a>

          {/*  */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#quickstart" className="hover:text-purple-700 transition-colors">
              {isZh ? '单命令极速起步' : '1-Command Quickstart'}
            </a>
            <a href="#stages" className="hover:text-purple-700 transition-colors">
              {isZh ? '3个阶段' : '3 Stages'}
            </a>
            <a href="#features" className="hover:text-purple-700 transition-colors">
              {isZh ? '核心特性' : 'Features'}
            </a>
            <a href="#benchmarks" className="hover:text-purple-700 transition-colors">
              {isZh ? '实测基准' : 'Benchmarks'}
            </a>
            <a href="#architecture" className="hover:text-purple-700 transition-colors">
              {isZh ? '系统架构' : 'Architecture'}
            </a>
            <a href="#api" className="hover:text-purple-700 transition-colors">
              {isZh ? 'REST API 接口' : 'REST API'}
            </a>
            <a href="#voucher" className="hover:text-purple-700 transition-colors">
              {isZh ? '同行背书' : 'Voucher'}
            </a>
          </nav>

          {/*  */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-bold border border-slate-200">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  lang === 'en'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('zh')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  lang === 'zh'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                中文
              </button>
            </div>

            {onOpenClient && (
              <button
                onClick={onOpenClient}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors"
              >
                <span>Launch Client</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            <a
              href="https://github.com/mohammadma98/farcaster-snapchain-node-client"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/*  */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-16 flex-grow w-full">
        {/*  */}
        <section className="space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-700 font-semibold font-mono">
            <span>🟣</span>
            <span>
              {isZh
                ? '完全开源 · MIT 协议 · 零第三方 API 密钥'
                : 'Open Source · MIT · Zero Third-Party API Keys'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
            {isZh ? (
              <>
                主权级 Farcaster 只读节点与 Web 客户端<span className="text-purple-700">.</span>
              </>
            ) : (
              <>
                Farcaster Snapchain Read Node & Sovereign Web Client<span className="text-purple-700">.</span>
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            {isZh
              ? '工业级、完全主权的 Farcaster 节点与 Web 客户端套件，无需任何第三方 API 密钥。专为追求极致协议主权与抗审查去中心会社区设计。'
              : 'A production-grade, sovereign Farcaster node and web client suite requiring zero third-party API keys. Engineered for developers, decentralization advocates, and censorship-resistant communities seeking total protocol sovereignty.'}
          </p>
        </section>

        {/*  */}
        <section id="quickstart" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 border-l-4 border-l-purple-700 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wider mb-1">
              <Zap className="h-4 w-4" />
              <span>{isZh ? '单命令全自动极速起步' : 'Single-Command Autonomous Quickstart'}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isZh ? '仅需 1 条命令！(Just ONE Command)' : 'Just ONE Command!'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isZh
                ? '在任何干净的 Ubuntu 22.04+ 服务器（或 AWS EC2 实例）上仅需一条命令即可完成全套部署：'
                : 'Deploy a personal Farcaster Snapchain Read Node and Sovereign Web Client on any clean Ubuntu 22.04+ server (or AWS EC2 instance) with a single command:'}
            </p>
          </div>

          {/*  */}
          <div className="relative bg-slate-950 rounded-xl p-4 sm:p-5 text-slate-100 font-mono text-xs sm:text-sm shadow-md overflow-x-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-slate-500">bash terminal</span>
              </span>
              <button
                onClick={handleCopyOneCommand}
                className="px-3 py-1 rounded-md bg-purple-700 hover:bg-purple-600 text-white font-sans text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {copiedOneCommand ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedOneCommand ? (isZh ? '已复制！' : 'Copied!') : (isZh ? '复制命令' : 'Copy Command')}</span>
              </button>
            </div>
            <code className="text-purple-300 font-bold select-all block break-all">
              {oneCommandScript}
            </code>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>{isZh ? '执行逻辑：' : 'How it works:'}</strong>{' '}
            {isZh
              ? '执行后，自动化流水线将按序连跑 3 个集成阶段：服务器环境调优 (0) → Snapchain 高速流式同步 (1) → Web 客户端、索引器与 Cloudflare SSL 自动化隧道 (2)。'
              : 'Once executed, the automated pipeline performs all work sequentially across 3 integrated stages: Server Configuration (0) → Snapchain High-Speed Ingestion (1) → Web Client, Indexer & Cloudflare SSL Tunnel (2).'}
          </p>
        </section>

        {/*  */}
        <section id="stages" className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isZh ? '3 个模块化阶段' : 'The 3 Sequential Stages'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isZh
                ? '单命令可全自动跑通全流程，亦可根据需要独立执行各个模块化脚本：'
                : 'While the single command above runs the entire pipeline end-to-end autonomously, you can also execute each modular script independently whenever needed:'}
            </p>
          </div>

          <div className="space-y-4">
            {/*  */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="space-y-1">
                <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-100 text-purple-800">
                  Stage 1
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isZh
                    ? '1. 服务器配置与内核调优 (0-provision-compute.sh)'
                    : '1. Server Configuration & Kernel Tuning (0-provision-compute.sh)'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isZh
                    ? '自动安装环境依赖（Docker Engine、Compose 插件、UFW 防火墙、zstd、jq）。配置防火墙端口：22 (SSH), 3000 (Web UI), 3381 (HTTP API), 3382 (Libp2p Gossip), 3383 (gRPC), 3005 (Grafana)。动态调整 Linux 内核网络缓冲区参数，确保 P2P 高频吞吐稳定。'
                    : 'Installs prerequisite packages (Docker Engine, Compose plugin, UFW firewall, zstd, jq). Configures firewall ports: 22 SSH, 3000 Web UI, 3381 HTTP API, 3382 Libp2p Gossip, 3383 gRPC, 3005 Grafana. Dynamically tunes Linux kernel network buffers for sustained P2P throughput.'}
                </p>
              </div>
              <div className="bg-slate-100 rounded-lg p-2.5 font-mono text-[11px] text-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
                <code className="break-all select-all">
                  curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash
                </code>
                <button
                  onClick={() =>
                    handleCopySnippet(
                      'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash',
                      's1'
                    )
                  }
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold shrink-0"
                >
                  {copiedSnippet === 's1' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/*  */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="space-y-1">
                <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-100 text-cyan-800">
                  Stage 2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isZh
                    ? '2. 只读节点流式下载与并发解压 (1-setup-read-node.sh)'
                    : '2. Read Node Installation & High-Speed Streaming (1-setup-read-node.sh)'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isZh
                    ? '通过并发分段流式下载管线以极致网速下载 Snapchain 数据库快照。流式直接解压至 RocksDB 存储层，彻底消除几百 GB 压缩包重复占用的物理硬盘。启动 Snapchain 容器并持续轮询 http://127.0.0.1:3381/v1/info 直至完成网络同步。'
                    : 'Streams and downloads the large Snapchain database snapshot at maximum throughput using a concurrent chunk pipeline. Extracts on-the-fly directly to the RocksDB storage layer, eliminating duplicate multi-hundred-gigabyte archive files. Boots the Snapchain container and monitors http://127.0.0.1:3381/v1/info until synced.'}
                </p>
              </div>
              <div className="bg-slate-100 rounded-lg p-2.5 font-mono text-[11px] text-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
                <code className="break-all select-all">
                  curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash
                </code>
                <button
                  onClick={() =>
                    handleCopySnippet(
                      'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash',
                      's2'
                    )
                  }
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold shrink-0"
                >
                  {copiedSnippet === 's2' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/*  */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="space-y-1">
                <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-100 text-emerald-800">
                  Stage 3
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isZh
                    ? '3. Web 客户端、数据索引器与 Cloudflare SSL 自动化隧道 (2-create-client.sh)'
                    : '3. Web Client, Data Indexer & Cloudflare SSL Tunnel (2-create-client.sh)'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isZh
                    ? '在隔离 Docker 容器中构建并启动高性能 Next.js Web 客户端与快速索引层。全自动配置零配置 Cloudflare Edge 隧道（https://*.trycloudflare.com），自带权威 SSL 证书，无需配置域名或端口映射即可直接通过手机和电脑浏览器安全访问。'
                    : 'Builds and launches the Next.js web client and fast-indexing layer in isolated Docker containers. Automatically configures a zero-config Cloudflare Edge Tunnel (https://*.trycloudflare.com) with valid SSL certificates for immediate browser and mobile access.'}
                </p>
              </div>
              <div className="bg-slate-100 rounded-lg p-2.5 font-mono text-[11px] text-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
                <code className="break-all select-all">
                  curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash
                </code>
                <button
                  onClick={() =>
                    handleCopySnippet(
                      'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash',
                      's3'
                    )
                  }
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold shrink-0"
                >
                  {copiedSnippet === 's3' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/*  */}
        <section id="features" className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isZh ? '核心特性与技术优势' : 'Key Features & Capabilities'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isZh
                ? '专为高可靠性、极低资源占用与零第三方依赖而深度工程化。'
                : 'Engineered for maximum reliability, minimal resource footprint, and zero operational dependencies.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <span className="font-bold text-slate-900 text-sm block">💾 {isZh ? '极低存储需求 (600 GB - 750 GB)' : 'Minimal Storage (600 GB - 750 GB)'}</span>
              <p className="text-slate-600">
                {isZh
                  ? '可在低至 600 GB 至 750 GB 的硬盘上完全稳定运行。内存辅助流式解压管道直接在传输时填充 RocksDB 分区，将峰值空间占用从 1.4 TB+ 骤降至 ~500–600 GB。'
                  : 'Fully operational on drives as low as 600 GB to 750 GB. The memory-assisted streaming pipeline directly populates RocksDB partitions on-the-fly, reducing peak storage requirements from 1.4 TB+ down to ~500–600 GB.'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <span className="font-bold text-slate-900 text-sm block">⚙️ {isZh ? '低配硬件自适应调优' : 'Ultra-Optimized Low-Spec Hardware'}</span>
              <p className="text-slate-600">
                {isZh
                  ? '具备硬件自适应检测矩阵，即使在仅有 1 核 vCPU 和 3 GB 内存的超低配云服务器上也能平稳持久运行。'
                  : 'Engineered with adaptive hardware matrix detection, running smoothly on constrained cloud servers with as little as 1 vCPU core and 3 GB RAM.'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <span className="font-bold text-slate-900 text-sm block">⚡ {isZh ? '极速快照同步与启动' : 'Blazing Fast Snapshot & Boot Time'}</span>
              <p className="text-slate-600">
                {isZh
                  ? '多段并发网络流式传输技术，在低配服务器上耗时不到 3 小时，在中高配服务器上不到 1 小时即可完成快照摄取与全节点就绪。'
                  : 'Complete snapshot ingestion and node readiness in under 3 hours on low-end servers and under 1 hour on mid/high-end servers via multi-chunk concurrent streaming.'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <span className="font-bold text-slate-900 text-sm block">🔒 {isZh ? '全自动即时 SSL 域名' : 'Instant Automated SSL Domain'}</span>
              <p className="text-slate-600">
                {isZh
                  ? '无需任何 API Token、无需购买独立域名或配置复杂的 DNS 解析，脚本自建 Cloudflare 隧道并生成权威 HTTPS 网址。'
                  : 'Generates a live Cloudflare Tunnel with valid HTTPS certificates completely automatically, requiring zero API tokens, zero manual DNS records, and zero router port forwarding.'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <span className="font-bold text-slate-900 text-sm block">🔑 {isZh ? '完整客户端功能与无Gas密钥' : 'Full Protocol Parity & Gasless Keys'}</span>
              <p className="text-slate-600">
                {isZh
                  ? '发布带图片附件与链接的 Cast、查看链上托管钱包资产余额、浏览时间流、点赞/转发/关注，并通过 EIP-712 链下签名授权无 Gas 密钥（Engine V16），无需支付 OP ETH。'
                  : 'Publish casts with media embeds, inspect live custody wallet balances, browse chronological feeds, perform likes/recasts/follows, and issue gasless EIP-712 app signers (Engine V16) without OP ETH.'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <span className="font-bold text-slate-900 text-sm block">📱 {isZh ? '100% 响应式与社区过滤引擎' : '100% Responsive & Community Filtering'}</span>
              <p className="text-slate-600">
                {isZh
                  ? '自由包含或排除来自特定客户端（如 Warpcast、Supercast）的内容，定制专属的去中心化纯净社区。完美适配手机、平板与桌面端。'
                  : 'Filter out or isolate casts by client origin (e.g. exclude Warpcast marketing). Designed for seamless, responsive navigation across smartphones, tablets, and desktop workstations.'}
              </p>
            </div>
          </div>
        </section>

        {/*  */}
        <section id="benchmarks" className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isZh ? '云主机实测基准与硬件成本' : 'Tested Server Benchmarks & Hosting Providers'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isZh
                ? '本套件在多种不同层级的真实硬件配置下进行了严苛的基准测试：'
                : 'This suite has been rigorously tested and benchmarked across diverse real-world hardware profiles:'}
            </p>
          </div>

          <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold font-mono uppercase text-[11px]">
                <tr>
                  <th className="p-4">{isZh ? '服务器配置级别' : 'Server Profile'}</th>
                  <th className="p-4">{isZh ? '核心硬件规格' : 'Hardware Specs'}</th>
                  <th className="p-4">{isZh ? '预估月成本' : 'Monthly Cost'}</th>
                  <th className="p-4">{isZh ? '同步与启动耗时' : 'Sync & Launch Time'}</th>
                  <th className="p-4">{isZh ? '状态' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 font-sans">{isZh ? '入门低配 (Low-End)' : 'Low-End Entry Tier'}</td>
                  <td className="p-4">1 vCPU, 3 GB RAM, 750 GB HDD</td>
                  <td className="p-4 font-bold text-emerald-700">~$6 / month</td>
                  <td className="p-4">~3 hours</td>
                  <td className="p-4 text-emerald-700 font-bold">✅ Verified</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 font-sans">{isZh ? '平衡中配 (Balanced Mid)' : 'Balanced Mid Tier'}</td>
                  <td className="p-4">2 vCPU, 4 GB RAM, 600 GB SSD</td>
                  <td className="p-4 font-bold text-emerald-700">~$15 / month</td>
                  <td className="p-4">~3 hours</td>
                  <td className="p-4 text-emerald-700 font-bold">✅ Verified</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-900 font-sans">{isZh ? '高性能 (High-Performance)' : 'High-Performance Tier'}</td>
                  <td className="p-4">4 vCPU, 12 GB RAM, 600 GB SSD/NVMe</td>
                  <td className="p-4 font-bold text-emerald-700">~$60 / month</td>
                  <td className="p-4">~1 - 2 hours</td>
                  <td className="p-4 text-emerald-700 font-bold">✅ Verified</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 text-xs shadow-xs">
            <h4 className="font-bold text-slate-900">{isZh ? '推荐云服务器服务商：' : 'Recommended VPS Providers'}</h4>
            <p className="text-slate-600 leading-relaxed">
              {isZh
                ? '可在任何供应商的 Ubuntu 22.04+ VPS 上运行。已在 Hetzner (高性价比欧洲机房)、InterServer (低成本大容量存储)、Cloudzy (全球低延迟 KVM) 上经过独立实机测试。同时全面兼容 AWS EC2 (m5.xlarge 或定制 EBS)、DigitalOcean、Vultr 与 OVH。'
                : 'You can provision an Ubuntu 22.04+ VPS on any provider of your choice. Real-world verification tests were successfully performed on Hetzner (cost-effective storage servers), InterServer, and Cloudzy. Also fully compatible with AWS EC2 (m5.xlarge or custom EBS), DigitalOcean, Vultr, and OVH.'}
            </p>
          </div>
        </section>

        {/*  */}
        <section id="architecture" className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isZh ? '系统拓扑架构与协议原语' : 'System Architecture & Protocol Mechanics'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isZh
                ? '从自主客户端到本地独立只读节点，再到去中心化验证者网络的完整数据流转机制。'
                : 'How data flows from your sovereign client through your standalone read node and into the decentralized validator network.'}
            </p>
          </div>

          {/*  */}
          <div className="bg-slate-950 text-purple-200 rounded-xl p-5 font-mono text-xs shadow-inner overflow-x-auto leading-tight">
<pre className="select-all">
{`┌─────────────────────────────────────────────────────────────────────────────┐
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
└─────────────────────────────────────────────────────────────────────────────┘`}
</pre>
          </div>

          <div className="space-y-4 text-xs leading-relaxed">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm">
                {isZh ? '1. 为什么只读节点可以接受写入请求？' : '1. Why Read Nodes Accept Writes'}
              </h3>
              <p className="text-slate-600">
                {isZh
                  ? '在 Snapchain 架构中，只读节点是对等的 P2P 写入中继站。客户端向 POST /v1/submitMessage 发送消息时：只读节点首先在本地校验 Ed25519 签名与存储配额，将消息暂存入本地内存池 (mempool)，随后通过 libp2p (:3382) 向全网验证者节点广播，最终被打包进新区块。'
                  : 'In Farcaster Snapchain, read nodes are full participants in the peer-to-peer gossip mesh. When a client submits a message to POST /v1/submitMessage: the read node verifies the Ed25519 signature and FID permissions locally, admits the message into its local mempool, and broadcasts it across libp2p (:3382) to validator nodes for inclusion in the next block.'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm">
                {isZh ? '2. 无 Gas 签名密钥 (Snapchain Engine V16)' : '2. Gasless App Key Cryptography (Engine V16)'}
              </h3>
              <p className="text-slate-600">
                {isZh
                  ? '应用密钥无需发起 Optimism 链上交易：(1) 客户端生成 Ed25519 密钥对；(2) 以太坊托管地址对 KeyAddBody 结构体进行 EIP-712 链下签名；(3) Ed25519 私钥签名信封证明所有权 (Proof of Possession)；(4) 生成的 KEY_ADD 消息直接被只读节点接收并同步，消耗 0 点 Gas。'
                  : 'App keys (signers) are authorized without blockchain transactions: (1) Client generates an Ed25519 keypair; (2) The Ethereum custody address signs an off-chain KeyAddBody EIP-712 struct; (3) The Ed25519 private key signs the message for Proof of Possession (PoP); (4) The resulting KEY_ADD is accepted directly with zero Optimism transaction fees.'}
              </p>
            </div>

            <div className="bg-amber-50/60 border border-amber-300 rounded-2xl p-5 space-y-2 border-l-4 border-l-amber-500">
              <h3 className="font-bold text-amber-950 text-sm">
                {isZh ? '3. 开发者安全哲学 (类比 Unix rm 命令)' : '3. Developer Security Guidance (Unix rm Analogy)'}
              </h3>
              <p className="text-amber-900">
                {isZh
                  ? '正如在 Unix 终端中输入 rm -rf 一样，需要输入助记词的开发者工具仅限用于开发者测试账户。切勿在本地开发环境中输入存放核心资产或高净值域名的冷钱包！'
                  : 'Like entering rm -rf in Unix, developer software taking a mnemonic seed phrase is intended strictly for developer test accounts. Never enter your cold-storage keys. Dedicated test accounts isolate operational risk while preserving cryptographic authenticity.'}
              </p>
            </div>
          </div>
        </section>

        {/*  */}
        <section id="api" className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isZh ? '主权 REST API 完整接口文档' : 'Sovereign REST API Documentation'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isZh
                ? '套件在 http://localhost:3000/api/...（及 Cloudflare 公网 HTTPS 域名）暴露了完整的无依赖 RESTful API 引擎：'
                : 'The client suite exposes a comprehensive, zero-dependency RESTful API engine on http://localhost:3000/api/... (and over your Cloudflare HTTPS domain).'}
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">GET</span>
                <span className="font-bold text-slate-900 text-xs">/api/node/status</span>
              </div>
              <p className="text-slate-600 font-sans text-xs">Live health check, ping latency, peer count, synchronization state, and processed message count from the local Snapchain node.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">GET</span>
                <span className="font-bold text-slate-900 text-xs">/api/feed</span>
              </div>
              <p className="text-slate-600 font-sans text-xs">Retrieve chronological or personalized protocol casts with granular client attribution filtering (mode, limit, source, viewerFid, exclude_client_fids).</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">POST</span>
                <span className="font-bold text-slate-900 text-xs">/api/casts</span>
                <span className="text-slate-400 font-sans text-[11px]">& GET /api/casts/:hash</span>
              </div>
              <p className="text-slate-600 font-sans text-xs">Publish a new cast, quote cast, or thread reply directly to the read node mempool via signed binary Protobuf. GET fetches ordered reply trees.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">POST</span>
                <span className="font-bold text-slate-900 text-xs">/api/reactions</span>
              </div>
              <p className="text-slate-600 font-sans text-xs">Submit or retract likes and recasts to the protocol mempool (type: &apos;like&apos; | &apos;recast&apos;, isRemove: boolean).</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">POST</span>
                <span className="font-bold text-slate-900 text-xs">/api/links</span>
              </div>
              <p className="text-slate-600 font-sans text-xs">Follow or unfollow users via protocol-level LinkAdd / LinkRemove messages.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">GET</span>
                <span className="font-bold text-slate-900 text-xs">/api/users/:id</span>
                <span className="text-slate-400 font-sans text-[11px]">& /api/users/:id/casts & /api/users/search</span>
              </div>
              <p className="text-slate-600 font-sans text-xs">Fetch user profile metadata, bio, follower count, and custody address by numeric FID or username. Retrieve chronological user casts.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">GET</span>
                <span className="font-bold text-slate-900 text-xs">/api/wallet/tokens?fid=...</span>
              </div>
              <p className="text-slate-600 font-sans text-xs">Query live on-chain token holdings, balances, and USD valuation across Ethereum and Base networks.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">POST</span>
                <span className="font-bold text-slate-900 text-xs">/api/upload</span>
              </div>
              <p className="text-slate-600 font-sans text-xs">Upload images for cast embeds with server-side magic byte verification (supports JPEG, PNG, GIF, WebP up to 10 MB).</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">POST</span>
                <span className="font-bold text-slate-900 text-xs">/api/auth/login</span>
              </div>
              <p className="text-slate-600 font-sans text-xs">Authenticate using your 24-word recovery phrase. Automatically derives custody address and registers a gasless Ed25519 app signer via EIP-712 without OP ETH.</p>
            </div>
          </div>
        </section>

        {/*  */}
        <section id="video" className="space-y-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isZh ? '59 秒竖屏演示分镜脚本' : '59-Second Vertical Video Storyboard'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isZh
                ? '专为 X、Farcaster 及移动端短视频信息流定制的快节奏技术展示。'
                : 'Engineered for fast-paced short-form video demonstration across X, Farcaster, and mobile video feeds.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono text-xs">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
              <span className="text-[10px] text-purple-700 font-bold block">00:00 - 00:08</span>
              <h4 className="font-bold text-slate-900 font-sans text-xs">Scene 1: The Problem</h4>
              <p className="text-[11px] text-slate-600 font-sans">&quot;How do you run your own sovereign Farcaster node and client with zero API keys in under 60 seconds?&quot;</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
              <span className="text-[10px] text-purple-700 font-bold block">00:08 - 00:22</span>
              <h4 className="font-bold text-slate-900 font-sans text-xs">Scene 2: 1-Command Setup</h4>
              <p className="text-[11px] text-slate-600 font-sans">&quot;Run one terminal command: it configures compute, streams Snapchain, and boots your client. Done.&quot;</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
              <span className="text-[10px] text-purple-700 font-bold block">00:22 - 00:36</span>
              <h4 className="font-bold text-slate-900 font-sans text-xs">Scene 3: Gasless Keys</h4>
              <p className="text-[11px] text-slate-600 font-sans">&quot;Zero Optimism gas required. App keys are authorized off-chain via EIP-712 custody signatures.&quot;</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
              <span className="text-[10px] text-purple-700 font-bold block">00:36 - 00:48</span>
              <h4 className="font-bold text-slate-900 font-sans text-xs">Scene 4: Client Filtering</h4>
              <p className="text-[11px] text-slate-600 font-sans">&quot;Filter out Warpcast or Supercast with a single click to curate your own autonomous community.&quot;</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
              <span className="text-[10px] text-purple-700 font-bold block">00:48 - 00:59</span>
              <h4 className="font-bold text-slate-900 font-sans text-xs">Scene 5: Open Source</h4>
              <p className="text-[11px] text-slate-600 font-sans">&quot;Fully open-source under MIT license. 100% reproducible by independent node operators.&quot;</p>
            </div>
          </div>
        </section>

        {/*  */}
        <section id="voucher" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isZh ? '同行独立验证与真人背书清单' : 'Peer Verification & Human Voucher Checklist'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isZh
                ? '社区测试者与节点运维人员可在 3 分钟内独立复现并公开发布背书 Cast：'
                : 'A 3-minute reproducible checklist for peer reviewers and node operators to verify and endorse on Farcaster:'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-purple-700 font-bold font-sans">Step 1: Run Quickstart</span>
              <p className="text-slate-600 font-sans text-[11px]">Run script 0 on clean Ubuntu/AWS box. Confirm Docker boots.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-purple-700 font-bold font-sans">Step 2: Check Node Health</span>
              <p className="text-slate-600 font-sans text-[11px]">Run curl http://127.0.0.1:3381/v1/info and confirm HTTP 200 OK.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-purple-700 font-bold font-sans">Step 3: Issue Gasless Key</span>
              <p className="text-slate-600 font-sans text-[11px]">Authorize an EIP-712 signer with zero OP ETH via client UI.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-purple-700 font-bold font-sans">Step 4: Endorse Cast</span>
              <p className="text-slate-600 font-sans text-[11px]">Publish your endorsement cast on Farcaster referencing author @mohammad98.</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2">
            <span className="text-xs font-semibold text-slate-800">
              {isZh ? '背书 Cast 模板样例（点击复制）：' : 'Sample Endorsement Cast Template (Click to Copy):'}
            </span>
            <div className="bg-slate-100 rounded-xl p-3 border border-slate-300 flex items-center justify-between gap-3 text-xs font-mono">
              <p className="text-slate-800 select-all break-all">
                Verified @mohammad98&apos;s Farcaster Snapchain Suite on a clean Ubuntu VPS. 3 commands booted the node on :3381 and launched the sovereign client with gasless EIP-712 signers. https://github.com/mohammadma98/farcaster-snapchain-node-client
              </p>
              <button
                onClick={() =>
                  handleCopySnippet(
                    "Verified @mohammad98's Farcaster Snapchain Suite on a clean Ubuntu VPS. 3 commands booted the node on :3381 and launched the sovereign client with gasless EIP-712 signers. https://github.com/mohammadma98/farcaster-snapchain-node-client",
                    'vch'
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shrink-0"
              >
                {copiedSnippet === 'vch' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/*  */}
      <footer className="border-t border-slate-200 bg-white py-10 px-4 sm:px-6 text-xs text-slate-500 mt-16">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-purple-700 text-white font-bold text-xs">FC</span>
            <span className="font-bold text-slate-800">Farcaster Snapchain Suite</span>
            <span>· Released under MIT License</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <a href="https://github.com/mohammadma98/farcaster-snapchain-node-client" target="_blank" rel="noopener noreferrer" className="hover:text-purple-700 transition-colors">GitHub Repository</a>
            <a href="https://snapchain.farcaster.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-purple-700 transition-colors">Snapchain Docs</a>
            <a href="https://docs.farcaster.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-purple-700 transition-colors">Protocol Specs</a>
            <a href="https://farcaster.xyz/mohammad98" target="_blank" rel="noopener noreferrer" className="hover:text-purple-700 transition-colors">Author (@mohammad98)</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
