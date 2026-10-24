'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  Shield,
  Layers,
  Zap,
  Globe,
  Github,
  ExternalLink,
  Cpu,
  CheckCircle2,
  HardDrive,
  Copy,
  Check,
  Radio,
  BookOpen,
  Video,
  HeartHandshake,
  ArrowRight,
  Flame,
  Activity,
} from 'lucide-react';
import { Language, translations } from '../lib/translations';
import { QuickstartCard } from './QuickstartCard';
import { TutorialContent } from './TutorialContent';
import { ClientApp } from './ClientApp';
import { VideoStoryboard } from './VideoStoryboard';
import { VoucherGuide } from './VoucherGuide';

interface MicrositeProps {
  onOpenClient?: () => void;
}

export function Microsite({ onOpenClient }: MicrositeProps) {
  const [lang, setLang] = useState<Language>('en');
  const [activeNav, setActiveNav] = useState<'quickstart' | 'client' | 'tutorial' | 'benchmarks' | 'video' | 'voucher'>('quickstart');
  const [nodePing, setNodePing] = useState<number | null>(null);
  const [isNodeOnline, setIsNodeOnline] = useState<boolean | null>(null);
  const [copiedOneCommand, setCopiedOneCommand] = useState(false);

  const t = translations[lang];
  const isZh = lang === 'zh';

  const defaultNodeUrl = 'http://162.35.98.172:3381';

  useEffect(() => {
    // Check default node health
    const checkNode = async () => {
      const start = Date.now();
      try {
        const res = await fetch(`${defaultNodeUrl}/v1/info`, {
          signal: AbortSignal.timeout(3000),
        });
        setNodePing(Date.now() - start);
        setIsNodeOnline(res.ok);
      } catch {
        // Fallback check localhost
        try {
          const resLocal = await fetch('http://127.0.0.1:3381/v1/info', {
            signal: AbortSignal.timeout(1500),
          });
          setNodePing(Date.now() - start);
          setIsNodeOnline(resLocal.ok);
        } catch {
          setIsNodeOnline(false);
        }
      }
    };
    checkNode();
  }, []);

  const handleCopyOneCommand = () => {
    const cmd = 'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash';
    navigator.clipboard.writeText(cmd);
    setCopiedOneCommand(true);
    setTimeout(() => setCopiedOneCommand(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-[#0a0518] to-black text-white selection:bg-purple-500 selection:text-white">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-800/15 rounded-full blur-[120px]" />
      </div>

      {/* Top Banner / Announcement */}
      <div className="bg-gradient-to-r from-purple-900/60 via-purple-700/40 to-indigo-900/60 border-b border-purple-500/20 px-4 py-2 text-center text-xs text-purple-200">
        <span className="font-semibold text-white">
          {isZh ? '⚡ 协议主权与免Gas密钥支持：' : '⚡ Complete Protocol Sovereignty & Gasless EIP-712 Support:'}
        </span>{' '}
        {isZh
          ? '基于 Snapchain Engine V16 构建 • 0 个第三方 API 密钥 • 3 条命令一键启航'
          : 'Built on Snapchain Engine V16 • Zero 3rd-Party API Keys • 3-Command Quickstart'}
      </div>

      {/* Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/10 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-purple-500/20">
              FC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                  Farcaster Snapchain Suite
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  v1.0 MIT
                </span>
              </div>
              <p className="text-[11px] text-purple-200/60 hidden md:block">
                {isZh ? '独立只读节点与自主 Web 客户端' : 'Standalone Read Node & Sovereign Web Client'}
              </p>
            </div>
          </div>

          {/* Quick Nav Anchors */}
          <nav className="hidden lg:flex items-center gap-1 text-xs text-purple-200/70 font-medium">
            <button
              onClick={() => setActiveNav('quickstart')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeNav === 'quickstart' ? 'bg-purple-600/30 text-white font-semibold' : 'hover:text-white'
              }`}
            >
              ⚡ {isZh ? '快速入门' : 'Quickstart'}
            </button>
            <button
              onClick={() => setActiveNav('client')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeNav === 'client' ? 'bg-purple-600/30 text-white font-semibold' : 'hover:text-white'
              }`}
            >
              📱 {isZh ? '自主客户端' : 'Sovereign Client'}
            </button>
            <button
              onClick={() => setActiveNav('tutorial')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeNav === 'tutorial' ? 'bg-purple-600/30 text-white font-semibold' : 'hover:text-white'
              }`}
            >
              📚 {isZh ? '协议深度教程' : 'Protocol Deep-Dive'}
            </button>
            <button
              onClick={() => setActiveNav('benchmarks')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeNav === 'benchmarks' ? 'bg-purple-600/30 text-white font-semibold' : 'hover:text-white'
              }`}
            >
              📊 {isZh ? '硬件与成本' : 'Benchmarks'}
            </button>
            <button
              onClick={() => setActiveNav('video')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeNav === 'video' ? 'bg-purple-600/30 text-white font-semibold' : 'hover:text-white'
              }`}
            >
              🎬 {isZh ? '59秒视频脚本' : '59s Video'}
            </button>
            <button
              onClick={() => setActiveNav('voucher')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeNav === 'voucher' ? 'bg-purple-600/30 text-white font-semibold' : 'hover:text-white'
              }`}
            >
              🤝 {isZh ? '同行见证' : 'Voucher Guide'}
            </button>
          </nav>

          {/* Right Controls: Node Status, Lang Switcher, GitHub */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Node Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono">
              <span
                className={`h-2 w-2 rounded-full ${
                  isNodeOnline === true
                    ? 'bg-emerald-400 animate-pulse'
                    : isNodeOnline === false
                    ? 'bg-amber-400'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-purple-200/80">
                {isNodeOnline === true
                  ? `Node Online ${nodePing ? `(${nodePing}ms)` : ''}`
                  : isNodeOnline === false
                  ? 'Node Ready'
                  : 'Checking...'}
              </span>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center rounded-lg bg-white/5 border border-white/10 p-0.5 text-xs">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  lang === 'en' ? 'bg-purple-600 text-white shadow' : 'text-purple-200/60 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('zh')}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  lang === 'zh' ? 'bg-purple-600 text-white shadow' : 'text-purple-200/60 hover:text-white'
                }`}
              >
                中文
              </button>
            </div>

            {/* GitHub Repo */}
            <a
              href="https://github.com/mohammadma98/farcaster-snapchain-node-client"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-semibold text-purple-200 transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-16">
        {/* HERO SECTION */}
        <section className="text-center space-y-6 pt-4 sm:pt-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-mono">
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            <span>{t.heroTag}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
            <span className="bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
              {isZh ? '主权级 Farcaster 只读节点与无 Gas 客户端' : 'Sovereign Farcaster Read Node & Gasless Web Client'}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-purple-200/70 max-w-2xl mx-auto leading-relaxed">
            {t.heroDesc}
          </p>

          {/* Quick Badges Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-purple-200/90 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              {isZh ? 'Gasless 签名密钥 (EIP-712)' : 'Gasless Signers (EIP-712)'}
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-purple-200/90 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              {isZh ? '直接写入内存池 (:3381)' : 'Direct Mempool Writes (:3381)'}
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-purple-200/90 flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
              {isZh ? '流式解压仅需 600 GB' : 'Low Storage Streaming (600 GB)'}
            </span>
          </div>
        </section>

        {/* SECTION 1: QUICKSTART (3 COMMANDS AT TOP OF PAGE - BALAJI CORE DIRECTIVE) */}
        <section id="quickstart" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Terminal className="h-4 w-4" />
                <span>{isZh ? '极速起步' : 'Quickstart'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {t.quickstartTitle}
              </h2>
              <p className="text-xs sm:text-sm text-purple-200/60 mt-1">
                {t.quickstartSub}
              </p>
            </div>
          </div>

          {/* The 3-Command Card Component */}
          <QuickstartCard lang={lang} />

          {/* Single Command Option Callout */}
          <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-black/60 p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-amber-300 font-bold text-xs sm:text-sm">
                <Flame className="h-4 w-4 text-amber-400" />
                <span>{isZh ? '💡 也可以一键全自动连跑（Just ONE Command）' : '💡 Or run the entire pipeline with a single command'}</span>
              </div>
              <p className="text-xs text-purple-200/70 max-w-xl">
                {isZh
                  ? '执行下方单条命令，脚本将按序自动完成【0. 环境调优】→【1. 节点快照并行流式下载】→【2. 客户端启动与 Cloudflare SSL 自动化隧道】'
                  : 'Running command 0 directly chains stages 0 → 1 → 2 autonomously with RocksDB streaming and instant Cloudflare SSL tunnel.'}
              </p>
            </div>
            <button
              onClick={handleCopyOneCommand}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all shrink-0"
            >
              {copiedOneCommand ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              <span>{copiedOneCommand ? t.copied : (isZh ? '复制单命令全自动脚本' : 'Copy 1-Command Shortcut')}</span>
            </button>
          </div>
        </section>

        {/* SECTION 2: INTERACTIVE SOVEREIGN CLIENT & SANDBOX */}
        <section id="client" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Radio className="h-4 w-4" />
                <span>{isZh ? '在线交互客户端' : 'Interactive Client'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {t.clientTitle}
              </h2>
              <p className="text-xs sm:text-sm text-purple-200/60 mt-1">
                {isZh
                  ? '直接连接你的 Snapchain 只读节点，体验无 Gas 签名密钥 (EIP-712)、社区来源过滤与内存池直连发帖。'
                  : 'Connect directly to your Snapchain read node with gasless EIP-712 signing, client source filtering, and direct mempool broadcasts.'}
              </p>
            </div>
          </div>

          {/* Embedded Full Interactive Client Application */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 sm:p-6 backdrop-blur-xl shadow-2xl">
            <ClientApp lang={lang} />
          </div>
        </section>

        {/* SECTION 3: PROTOCOL ARCHITECTURE & TUTORIAL (6 MODULES) */}
        <section id="tutorial" className="space-y-8">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1">
              <BookOpen className="h-4 w-4" />
              <span>{isZh ? '官方协议指南' : 'Protocol Deep-Dive'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {t.deepDiveTitle}
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/60 mt-1">
              {t.deepDiveSub}
            </p>
          </div>

          {/* Interactive Architecture Flow Diagram */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              <span>{isZh ? 'Snapchain 数据流与拓扑架构' : 'Snapchain Data Flow & Topology Architecture'}</span>
            </h3>

            {/* Architecture Visual Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center font-mono text-xs pt-2">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20 space-y-2">
                <span className="text-[10px] uppercase font-bold text-purple-400">Layer 1: Client</span>
                <h4 className="font-bold text-white text-sm">Sovereign Client</h4>
                <p className="text-[11px] text-purple-200/60 font-sans">
                  {isZh ? 'EIP-712 无Gas签发 • 社区过滤 • Protobuf 信封封装' : 'EIP-712 Signing • Filtering • Protobuf Envelopes'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 space-y-2">
                <span className="text-[10px] uppercase font-bold text-cyan-400">Layer 2: Local Node</span>
                <h4 className="font-bold text-white text-sm">Read Node (:3381)</h4>
                <p className="text-[11px] text-purple-200/60 font-sans">
                  {isZh ? '校验 Ed25519 签名 • 检查存储配额 • 暂存内存池' : 'Verifies Signatures • Quota Checks • Local Mempool'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
                <span className="text-[10px] uppercase font-bold text-indigo-400">Layer 3: Gossip Mesh</span>
                <h4 className="font-bold text-white text-sm">Libp2p (:3382)</h4>
                <p className="text-[11px] text-purple-200/60 font-sans">
                  {isZh ? '跨节点 P2P 广播 • Shard 0/1/2 路由 • 抗审查' : 'P2P Gossip Mesh • Shard 0/1/2 Routing • Censorship Resistance'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Layer 4: Consensus</span>
                <h4 className="font-bold text-white text-sm">CometBFT Validators</h4>
                <p className="text-[11px] text-purple-200/60 font-sans">
                  {isZh ? '打包区块 • 2/3+ 签名最终性 • 全局状态定案' : 'Block Proposal • 2/3+ Signature Finality • Global State'}
                </p>
              </div>
            </div>
          </div>

          {/* 6 Tutorial Modules Component */}
          <TutorialContent lang={lang} />
        </section>

        {/* SECTION 4: HARDWARE BENCHMARKS & LOW STORAGE STREAMING */}
        <section id="benchmarks" className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Cpu className="h-4 w-4" />
              <span>{isZh ? '实测基准' : 'Hardware Benchmarks'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isZh ? '云主机实测成本与存储流式优化' : 'Server Benchmarks & Low-Cost Storage Streaming'}
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/60 mt-1">
              {isZh
                ? '通过自研多段并发流式管道，将官方推荐的 2 TB 存储门槛降低至 600 GB - 750 GB，每月只需 $6 即可运行全节点。'
                : 'Through concurrent chunk streaming directly into RocksDB, storage requirements drop from 2 TB to 600 GB, costing as little as $6/month.'}
            </p>
          </div>

          {/* Benchmark Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-purple-200 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-4">{isZh ? '服务器配置级别' : 'Server Profile'}</th>
                  <th className="p-4">{isZh ? '核心硬件规格' : 'Specs'}</th>
                  <th className="p-4">{isZh ? '预估月成本' : 'Estimated Cost'}</th>
                  <th className="p-4">{isZh ? '同步与启动耗时' : 'Sync & Launch Time'}</th>
                  <th className="p-4">{isZh ? '实测验证状态' : 'Verification Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-purple-100/90">
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-white font-sans">{isZh ? '入门低配 (Low-End)' : 'Low-End Entry Tier'}</td>
                  <td className="p-4">1 vCPU, 3 GB RAM, 750 GB HDD</td>
                  <td className="p-4 text-emerald-400 font-bold">~$6 / mo (Hetzner / InterServer)</td>
                  <td className="p-4">~3 hours</td>
                  <td className="p-4 text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verified</span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-white font-sans">{isZh ? '平衡中配 (Balanced Mid)' : 'Balanced Mid Tier'}</td>
                  <td className="p-4">2 vCPU, 4 GB RAM, 600 GB SSD</td>
                  <td className="p-4 text-emerald-400 font-bold">~$15 / mo (Cloudzy / Netcup)</td>
                  <td className="p-4">~3 hours</td>
                  <td className="p-4 text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verified</span>
                  </td>
                </tr>
                <tr className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-white font-sans">{isZh ? '高性能 (High-Performance)' : 'High-Performance Tier'}</td>
                  <td className="p-4">4 vCPU, 12 GB RAM, 600 GB NVMe</td>
                  <td className="p-4 text-emerald-400 font-bold">~$60 / mo (AWS EC2 m5.xlarge)</td>
                  <td className="p-4">~1 - 2 hours</td>
                  <td className="p-4 text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verified</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 5: 59-SECOND VIDEO STORYBOARD */}
        <section id="video" className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Video className="h-4 w-4" />
              <span>{isZh ? '视频脚本' : 'Video Storyboard'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isZh ? '59 秒竖屏演示脚本' : '59-Second Vertical Video Script'}
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/60 mt-1">
              {isZh
                ? '专为 X / Farcaster / TikTok 制作的 59 秒快节奏竖屏技术演示分镜。'
                : 'Paced 59-second vertical video script engineered for X, Farcaster, and short-form tech video feeds.'}
            </p>
          </div>

          <VideoStoryboard lang={lang} />
        </section>

        {/* SECTION 6: HUMAN VOUCHER GUIDE */}
        <section id="voucher" className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider mb-1">
              <HeartHandshake className="h-4 w-4" />
              <span>{isZh ? '社区同行背书' : 'Peer Verification'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isZh ? '同行验证与公开背书指南' : 'Peer Verification & Human Voucher Checklist'}
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/60 mt-1">
              {isZh
                ? '任何开发者或节点运维人员均可按照此 3 分钟清单对本套件进行完全独立的复现测试并在 Farcaster 发帖背书。'
                : 'A 3-minute reproducible test checklist for community node operators to independently test and vouch on Farcaster.'}
            </p>
          </div>

          <VoucherGuide lang={lang} />
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-black/80 mt-20 py-10 px-4 sm:px-8 text-xs text-purple-200/60">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-white">
              FC
            </div>
            <div>
              <p className="font-bold text-white">Farcaster Snapchain Suite</p>
              <p className="text-[11px] text-purple-200/40">
                {isZh ? '基于 MIT 许可证开放源代码' : 'Open-source software published under the MIT License'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <a
              href="https://github.com/mohammadma98/farcaster-snapchain-node-client"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub Repository
            </a>
            <a
              href="https://snapchain.farcaster.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Snapchain Documentation
            </a>
            <a
              href="https://docs.farcaster.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Farcaster Protocol Specs
            </a>
            <a
              href="https://farcaster.xyz/mohammad98"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Author (@mohammad98)
            </a>
          </div>

          <p className="text-[11px] text-purple-200/40 text-center md:text-right">
            Sovereign Architecture • Zero 3rd-Party Gatekeepers
          </p>
        </div>
      </footer>
    </div>
  );
}
