'use client';

import React from 'react';
import { Video, Clock, Smartphone, Play, Sparkles } from 'lucide-react';
import { Language } from '../lib/translations';

interface VideoStoryboardProps {
  lang: Language;
}

export function VideoStoryboard({ lang }: VideoStoryboardProps) {
  const isZh = lang === 'zh';

  const scenes = [
    {
      time: '00:00 - 00:08',
      title: isZh ? '第 1 幕：核心痛点与挑战' : 'Scene 1: The Problem & The Hook',
      visual: 'Dynamic title card demonstrating the decentralization trilemma, followed by terminal window opening.',
      voiceover: isZh
        ? '“如何只用 3 条命令，不买任何 API 密钥，在 60 秒内运行你自己的 Farcaster 节点？”'
        : '"How do you run your own sovereign Farcaster node and client with zero API keys in under 60 seconds?"',
    },
    {
      time: '00:08 - 00:22',
      title: isZh ? '第 2 幕：3 条命令极速启动' : 'Scene 2: The 3-Command Quickstart',
      visual: 'Screen capture of terminal running commands 0, 1, and 2. Docker container spins up, :3381 /v1/info returns green 200 OK.',
      voiceover: isZh
        ? '“执行三条一键脚本：初始化算力环境、拉取 Snapchain 官方镜像启动只读节点、启动自主客户端。搞定！”'
        : '"Three simple commands: provision compute, bootstrap the official Snapchain Docker node, and launch the client. Fully synchronized."',
    },
    {
      time: '00:22 - 00:36',
      title: isZh ? '第 3 幕：无 Gas 签名密钥 (EIP-712)' : 'Scene 3: Gasless App Keys',
      visual: 'Browser opens client. Click "Generate Sandbox Test Account". Click "Issue Gasless App Key". Shows EIP-712 signature generated instantly without spending OP ETH.',
      voiceover: isZh
        ? '“自 Snapchain V16 起，应用密钥完全无 Gas。通过 EIP-712 链下签名授权，无需消耗任何 Optimism ETH。”'
        : '"No Optimism gas required. Since Engine V16, app keys are authorized off-chain via EIP-712 custody signatures."',
    },
    {
      time: '00:36 - 00:48',
      title: isZh ? '第 4 幕：客户端过滤引擎' : 'Scene 4: Client Filtering Engine',
      visual: 'Toggle "Exclude Warpcast" filter. Feed instantly updates, filtering out Warpcast posts and highlighting native Snapchain messages.',
      voiceover: isZh
        ? '“支持自由包含或排除来自 Warpcast 或 Supercast 的内容，定制你自己的专属去中心化社区。”'
        : '"Filter out Warpcast or Supercast with a single click to curate your own autonomous community."',
    },
    {
      time: '00:48 - 00:59',
      title: isZh ? '第 5 幕：完全开源与见证' : 'Scene 5: Open Source & Outro',
      visual: 'Fast montage of GitHub repo (MIT license), live node health ping (green), and Chinese translation switcher.',
      voiceover: isZh
        ? '“完全开源，MIT 协议，全套中文与英文双语支持。链接在评论区，快来体验吧！”'
        : '"100% open-source under MIT, with full English and Chinese support. Code and tutorial in bio!"',
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">
            {isZh ? '59 秒竖屏演示视频分镜脚本' : '59-Second Vertical Video Storyboard'}
          </h3>
          <span className="text-xs text-purple-200/50">
            {isZh ? '针对 TikTok / YouTube Shorts / Farcaster 视频规范设计' : 'Designed for Farcaster, X, and YouTube Shorts (9:16 Vertical)'}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 text-xs text-purple-200/90 leading-relaxed flex items-center justify-between">
        <span>Total Duration: <strong>59 seconds</strong> • Aspect Ratio: <strong>9:16 (Vertical)</strong> • Audio: <strong>English Voiceover + Bilingual Subtitles</strong></span>
        <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">Ready to record</span>
      </div>

      <div className="space-y-4">
        {scenes.map((sc, idx) => (
          <div key={idx} className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300">{sc.title}</span>
              <span className="font-mono text-[11px] text-purple-200/50 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {sc.time}
              </span>
            </div>

            <div className="text-xs text-purple-200/80 font-mono bg-black/80 p-2.5 rounded-lg border border-white/5">
              <span className="text-cyan-400 block font-sans font-semibold mb-0.5">Visual Scene:</span>
              {sc.visual}
            </div>

            <div className="text-xs text-purple-100 italic bg-purple-950/30 p-2.5 rounded-lg border border-purple-500/10">
              <span className="text-purple-300 not-italic font-sans font-semibold block mb-0.5">Voiceover Script:</span>
              {sc.voiceover}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
