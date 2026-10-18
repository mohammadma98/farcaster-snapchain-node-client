'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Activity,
  Layers,
  HeartHandshake,
  Smartphone,
  Globe,
  Github,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { Language, translations } from '../lib/translations';
import { QuickstartCard } from '../components/QuickstartCard';
import { ClientApp } from '../components/ClientApp';
import { NodeDiagnostics } from '../components/NodeDiagnostics';
import { TutorialContent } from '../components/TutorialContent';
import { VoucherGuide } from '../components/VoucherGuide';
import { VideoStoryboard } from '../components/VideoStoryboard';

export default function HomePage() {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'client' | 'diagnostics' | 'tutorial' | 'voucher' | 'video'>('client');
  const t = translations[lang];

  return (
    <div className="min-h-screen text-white">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-[#0c0a14]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white font-bold text-lg shadow-lg shadow-purple-600/30">
              🟣
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-white block">
                Farcaster Snapchain Suite
              </span>
              <span className="text-[10px] text-purple-300/60 block sm:inline">
                Standalone Read Node & Client
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Switcher Pill */}
            <button
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-950/40 px-3 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-900/50 transition-all shadow-sm"
              title="Toggle English / 简体中文"
            >
              <Globe className="h-3.5 w-3.5 text-purple-400" />
              <span>{lang === 'en' ? '中文' : 'English'}</span>
            </button>

            {/* GitHub Link */}
            <a
              href="https://github.com/mohammadma98/farcaster-snapchain-node-client"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-all"
            >
              <Github className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-3.5 py-1 text-xs font-semibold text-purple-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>{t.heroTag}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {t.title}
          </h1>

          <p className="text-sm sm:text-base text-purple-200/70 leading-relaxed">
            {t.heroDesc}
          </p>
        </div>

        {/* 3. The 3-Command Quickstart Box (Right at the Top as requested!) */}
        <section id="quickstart">
          <QuickstartCard lang={lang} />
        </section>

        {/* 4. Interactive Tabs Navigation */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab('client')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'client'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-purple-200/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>{lang === 'zh' ? '交互式客户端' : 'Interactive Client'}</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-purple-200/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>{lang === 'zh' ? '节点实时诊断' : 'Live Node Diagnostics'}</span>
          </button>

          <button
            onClick={() => setActiveTab('tutorial')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'tutorial'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-purple-200/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>{lang === 'zh' ? '底层协议教程' : 'Protocol Deep-Dive'}</span>
          </button>

          <button
            onClick={() => setActiveTab('voucher')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'voucher'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-purple-200/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <HeartHandshake className="h-4 w-4" />
            <span>{lang === 'zh' ? '见证人指南' : 'Voucher Guide'}</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'video'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-purple-200/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>{lang === 'zh' ? '59秒视频分镜' : '59s Video Storyboard'}</span>
          </button>
        </div>

        {/* 5. Active Tab Contents */}
        <section className="pt-2">
          {activeTab === 'client' && <ClientApp lang={lang} />}
          {activeTab === 'diagnostics' && <NodeDiagnostics lang={lang} />}
          {activeTab === 'tutorial' && <TutorialContent lang={lang} />}
          {activeTab === 'voucher' && <VoucherGuide lang={lang} />}
          {activeTab === 'video' && <VideoStoryboard lang={lang} />}
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="border-t border-white/10 bg-black/60 py-10 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-purple-200/50">
          <div className="flex items-center gap-2">
            <span>🟣 Farcaster Snapchain Suite</span>
            <span>•</span>
            <span className="text-purple-300">{t.openSourceNotice}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('voucher')}
              className="hover:text-purple-300 transition-colors"
            >
              {t.voucherGuideLink}
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className="hover:text-purple-300 transition-colors"
            >
              {t.videoScriptLink}
            </button>
            <a
              href="https://farcaster.xyz/balajis.eth/0x50184b62"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              <span>Balaji Cast</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
