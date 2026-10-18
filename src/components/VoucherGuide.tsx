'use client';

import React from 'react';
import { UserCheck, CheckCircle, ExternalLink, ShieldCheck, HeartHandshake } from 'lucide-react';
import { Language } from '../lib/translations';

interface VoucherGuideProps {
  lang: Language;
}

export function VoucherGuide({ lang }: VoucherGuideProps) {
  const isZh = lang === 'zh';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
          <HeartHandshake className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">
            {isZh ? '同行验证与社区背书指南 (Peer Verification Guide)' : 'Peer Verification & Community Endorsement Guide'}
          </h3>
          <span className="text-xs text-purple-200/50">
            {isZh
              ? '由开源社区同行或节点操作者测试本套件并发表公开验证 Cast'
              : 'Reproducible verification steps for peer reviewers and node operators'}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 text-xs text-purple-200/90 leading-relaxed">
        {isZh
          ? '为确保开源软件的可重现性与密码学健壮性，欢迎社区开发者按照此 3 分钟清单对本地 Snapchain 只读节点与无 Gas 客户端进行独立复现测试并发表背书。'
          : 'To guarantee software reproducibility and cryptographic integrity, community developers and node operators can use this 3-minute checklist to independently verify and peer-review the local Snapchain read node and client.'}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{isZh ? '见证人 3 分钟极速验证步骤：' : '3-Minute Voucher Verification Checklist:'}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-2">
            <span className="text-purple-300 font-bold block">Step 1: Run Quickstart</span>
            <p className="text-purple-200/70 text-[11px]">
              {isZh
                ? '在 Linux 终端或 AWS 机器上执行 3 条快速启动脚本。确认 Docker 容器启动并且 :3381 响应健康检测。'
                : 'Execute the 3 commands on a clean Linux / AWS box. Verify the Docker container starts and :3381 returns node info.'}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-2">
            <span className="text-cyan-300 font-bold block">Step 2: Test Gasless Client</span>
            <p className="text-cyan-200/70 text-[11px]">
              {isZh
                ? '在客户端中点击“生成沙盒测试账户”，通过 EIP-712 生成无 Gas 签名密钥，确认无需 OP ETH。'
                : 'Open the client, click "Generate Sandbox Test Account", and issue a gasless app key with zero Optimism ETH.'}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-2">
            <span className="text-pink-300 font-bold block">Step 3: Test Client Filtering</span>
            <p className="text-pink-200/70 text-[11px]">
              {isZh
                ? '切换过滤模式（如排除 Warpcast 或仅保留 Supercast），验证自定义社区信息流过滤功能。'
                : 'Toggle client filters (e.g. Exclude Warpcast), verifying that custom community filtering behaves as specified.'}
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Cast Template */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-purple-300 block">
          {isZh ? '见证人推荐背书 Cast 模板：' : 'Recommended Voucher Cast Template on Farcaster:'}
        </span>
        <div className="rounded-xl border border-purple-500/20 bg-black/90 p-4 font-mono text-xs text-purple-200 select-all leading-relaxed">
          I just tested out the sovereign Farcaster Snapchain Read Node & Client suite by @mohammadma98.
          <br /><br />
          Tested on an AWS Ubuntu box:
          <br />
          1. 3-command setup worked cleanly out-of-the-box (zero API keys).
          <br />
          2. Gasless signers generated flawlessly via EIP-712 without OP gas.
          <br />
          3. Client filtering (excluding Warpcast / custom feeds) works as advertised.
          <br />
          4. Full bilingual docs (EN + 中文) and responsive UI.
          <br /><br />
          Vouching for this build! 🫡💜
          <br />
          https://github.com/mohammadma98/farcaster-snapchain-node-client
        </div>
      </div>
    </div>
  );
}
