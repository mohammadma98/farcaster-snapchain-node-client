'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, Cpu, Server, Laptop } from 'lucide-react';
import { Language, translations } from '../lib/translations';

interface QuickstartCardProps {
  lang: Language;
}

export function QuickstartCard({ lang }: QuickstartCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const t = translations[lang];

  const commands = [
    {
      title: t.cmd0Title,
      desc: t.cmd0Desc,
      icon: Cpu,
      cmd: 'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash',
      details: 'Sets up Docker engine, opens ports 22, 3381 (HTTP), 3382 (gRPC), 3383 (gossip), tunes sysctl buffers.',
    },
    {
      title: t.cmd1Title,
      desc: t.cmd1Desc,
      icon: Server,
      cmd: 'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash',
      details: 'Fetches official Snapchain docker-compose & validators.toml, launches read node, and polls /v1/info.',
    },
    {
      title: t.cmd2Title,
      desc: t.cmd2Desc,
      icon: Laptop,
      cmd: 'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash',
      details: 'Boots the sovereign client, connects to http://127.0.0.1:3381, generates gasless app key, and launches UI.',
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    const all = commands.map(c => c.cmd).join('\n');
    navigator.clipboard.writeText(all);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-950/20 p-6 backdrop-blur-xl shadow-2xl">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">{t.quickstartTitle}</h2>
          </div>
          <p className="text-sm text-purple-200/70 max-w-2xl">{t.quickstartSub}</p>
        </div>

        <button
          onClick={handleCopyAll}
          className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-purple-600/30 active:scale-95 shrink-0"
        >
          {copiedAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span>{copiedAll ? t.copied : t.copyAll}</span>
        </button>
      </div>

      <div className="space-y-4">
        {commands.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className="rounded-xl border border-white/10 bg-black/40 p-4 transition-all hover:border-purple-500/40 hover:bg-black/60"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-sm text-white">{step.title}</span>
                </div>
                <button
                  onClick={() => handleCopy(step.cmd, idx)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-purple-200 hover:bg-white/10 transition-colors"
                >
                  {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedIndex === idx ? t.copied : 'Copy'}</span>
                </button>
              </div>

              <p className="text-xs text-purple-200/60 mb-3">{step.desc}</p>

              <div className="relative rounded-lg bg-black/90 p-3 font-mono text-xs text-purple-300 overflow-x-auto border border-purple-900/30">
                <code>{step.cmd}</code>
              </div>

              <div className="mt-2 text-[11px] text-purple-300/50 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400/50" />
                <span>{step.details}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
