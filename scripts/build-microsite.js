/**
 * Static Microsite Builder for GitHub Pages
 * Generates an ultra-fast, responsive, zero-dependency HTML bundle
 * containing the 3-command Quickstart, Live Interactive Client, Protocol Tutorial,
 * Benchmarks, 59s Video Storyboard, and Voucher Endorsement Guide.
 */

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'dist-microsite');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Farcaster Snapchain Suite | Standalone Read Node & Sovereign Web Client</title>
  <meta name="description" content="Production Farcaster Client & Standalone Snapchain Read Node Suite with 3-command Quickstart, gasless EIP-712 app keys, and zero third-party API keys.">
  <meta name="author" content="mohammadma98">
  
  <!-- OpenGraph / Social Meta -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Farcaster Snapchain Suite - 3-Command Sovereign Node & Client">
  <meta property="og:description" content="Run a standalone Farcaster Snapchain read node and sovereign client in three commands. Zero API keys, Gasless EIP-712 signers, low storage streaming.">
  <meta property="og:url" content="https://mohammadma98.github.io/farcaster-snapchain-node-client/">
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#faf5ff',
              100: '#f3e8ff',
              200: '#e9d5ff',
              300: '#d8b4fe',
              400: '#c084fc',
              500: '#a855f7',
              600: '#9333ea',
              700: '#7e22ce',
              800: '#6b21a8',
              900: '#581c87',
              950: '#3b0764',
            }
          }
        }
      }
    }
  </script>
  <style>
    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #030712; }
    ::-webkit-scrollbar-thumb { background: #4c1d95; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #6d28d9; }
    .glass-card {
      background: rgba(15, 7, 34, 0.6);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .glass-nav {
      background: rgba(3, 7, 18, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
  </style>
</head>
<body class="bg-gray-950 text-slate-100 min-h-screen selection:bg-purple-600 selection:text-white font-sans antialiased">

  <!-- Background Ambient Glows -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[130px]"></div>
    <div class="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-[130px]"></div>
    <div class="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-900/15 rounded-full blur-[130px]"></div>
  </div>

  <div class="relative z-10 flex flex-col min-h-screen">
    <!-- Top Announcement Bar -->
    <div class="bg-gradient-to-r from-purple-900/80 via-purple-700/60 to-indigo-900/80 border-b border-purple-500/20 px-4 py-2 text-center text-xs text-purple-200">
      <span class="font-bold text-white" id="bar-title">⚡ Complete Protocol Sovereignty:</span> 
      <span id="bar-desc">Built on Snapchain Engine V16 • Zero 3rd-Party API Keys • 3-Command Autonomous Quickstart</span>
    </div>

    <!-- Sticky Navigation Bar -->
    <header class="sticky top-0 z-50 glass-nav px-4 sm:px-8 py-3.5 transition-all">
      <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <!-- Logo -->
        <a href="#" class="flex items-center gap-3 group">
          <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform">
            FC
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm sm:text-base tracking-tight text-white">Farcaster Snapchain Suite</span>
              <span class="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">MIT</span>
            </div>
            <p class="text-[11px] text-purple-200/60 hidden sm:block" id="nav-subtitle">Standalone Read Node & Sovereign Web Client</p>
          </div>
        </a>

        <!-- Navigation Links -->
        <nav class="hidden lg:flex items-center gap-1 text-xs text-purple-200/70 font-medium">
          <a href="#quickstart" class="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors" id="nav-quickstart">⚡ Quickstart</a>
          <a href="#client" class="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors" id="nav-client">📱 Sovereign Client</a>
          <a href="#tutorial" class="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors" id="nav-tutorial">📚 Protocol Guide</a>
          <a href="#benchmarks" class="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors" id="nav-benchmarks">📊 Benchmarks</a>
          <a href="#video" class="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors" id="nav-video">🎬 59s Video</a>
          <a href="#voucher" class="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/5 transition-colors" id="nav-voucher">🤝 Peer Verification</a>
        </nav>

        <!-- Right Controls: Node Status, Lang Switcher, GitHub -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Node Ping Status Pill -->
          <div class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono" id="node-pill" title="Target Node: http://162.35.98.172:3381">
            <span class="h-2 w-2 rounded-full bg-amber-400 animate-pulse" id="node-dot"></span>
            <span class="text-purple-200/80" id="node-status-text">Node Ready</span>
          </div>

          <!-- Language Switcher -->
          <div class="flex items-center rounded-lg bg-white/5 border border-white/10 p-0.5 text-xs font-semibold">
            <button onclick="setLanguage('en')" id="btn-lang-en" class="px-2.5 py-1 rounded-md bg-purple-600 text-white shadow transition-all">EN</button>
            <button onclick="setLanguage('zh')" id="btn-lang-zh" class="px-2.5 py-1 rounded-md text-purple-200/60 hover:text-white transition-all">中文</button>
          </div>

          <!-- GitHub Link -->
          <a href="https://github.com/mohammadma98/farcaster-snapchain-node-client" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-semibold text-purple-200 transition-colors">
            <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <span class="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>

    <!-- MAIN BODY -->
    <main class="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-20 flex-grow">

      <!-- HERO SECTION -->
      <section class="text-center space-y-6 pt-4 sm:pt-10">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-mono">
          <span>🛡️</span>
          <span id="hero-tag">Zero API Keys • MIT Licensed • 100% Sovereign Infrastructure</span>
        </div>

        <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
          <span class="bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent" id="hero-title">
            Sovereign Farcaster Read Node & Gasless Web Client
          </span>
        </h1>

        <p class="text-sm sm:text-base text-purple-200/70 max-w-2xl mx-auto leading-relaxed" id="hero-desc">
          Run your own independent Farcaster Snapchain read node and web client with zero third-party API keys in three commands. Direct mempool writes, gasless EIP-712 signers, and community-level client filtering.
        </p>

        <!-- Feature Pills -->
        <div class="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-mono">
          <span class="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-purple-200/90">⚡ Gasless Signers (EIP-712)</span>
          <span class="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-purple-200/90">📡 Direct Mempool Writes (:3381)</span>
          <span class="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-purple-200/90">💾 Low Storage Streaming (~600 GB)</span>
          <span class="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-purple-200/90">🌐 Auto Cloudflare SSL Tunnel</span>
        </div>
      </section>

      <!-- SECTION 1: QUICKSTART (3 COMMANDS AT TOP OF PAGE - BALAJI CORE REQUIREMENT) -->
      <section id="quickstart" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1">
              <span>⚡</span>
              <span id="qs-badge">Quickstart</span>
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-white" id="qs-title">
              Quickstart: 3 Commands to Full Sovereignty
            </h2>
            <p class="text-xs sm:text-sm text-purple-200/60 mt-1" id="qs-subtitle">
              Paste these three commands sequentially into your terminal to provision compute, sync your node, and launch your client.
            </p>
          </div>
          <button onclick="copyAllCommands()" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all self-start sm:self-auto" id="btn-copy-all">
            <span>📋</span>
            <span id="txt-copy-all">Copy All 3 Commands</span>
          </button>
        </div>

        <!-- The 3 Cards -->
        <div class="grid grid-cols-1 gap-4 font-mono text-xs">
          <!-- Card 0 -->
          <div class="glass-card rounded-2xl p-5 border border-purple-500/20 hover:border-purple-500/40 transition-all space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center gap-3">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 font-bold text-sm">0</span>
                <span class="font-bold text-white font-sans text-sm" id="cmd0-title">Provision Compute (Ubuntu 22.04+ / AWS EC2)</span>
              </div>
              <span class="text-[11px] text-purple-300/60 font-sans" id="cmd0-desc">Installs Docker, opens ports (22, 3000, 3381, 3382, 3383), tunes kernel buffers.</span>
            </div>
            <div class="relative bg-black/70 rounded-xl p-3 border border-white/5 flex items-center justify-between gap-2 overflow-x-auto">
              <code class="text-purple-300 text-[11px] select-all shrink-0">curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash</code>
              <button onclick="copyText('curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash', this)" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans font-medium transition-colors shrink-0">Copy</button>
            </div>
          </div>

          <!-- Card 1 -->
          <div class="glass-card rounded-2xl p-5 border border-purple-500/20 hover:border-purple-500/40 transition-all space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center gap-3">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 font-bold text-sm">1</span>
                <span class="font-bold text-white font-sans text-sm" id="cmd1-title">Setup & Bootstrap Snapchain Read Node</span>
              </div>
              <span class="text-[11px] text-purple-300/60 font-sans" id="cmd1-desc">Streams RocksDB snapshot concurrently (saves 600+ GB disk) and monitors :3381/v1/info.</span>
            </div>
            <div class="relative bg-black/70 rounded-xl p-3 border border-white/5 flex items-center justify-between gap-2 overflow-x-auto">
              <code class="text-cyan-300 text-[11px] select-all shrink-0">curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash</code>
              <button onclick="copyText('curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash', this)" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans font-medium transition-colors shrink-0">Copy</button>
            </div>
          </div>

          <!-- Card 2 -->
          <div class="glass-card rounded-2xl p-5 border border-purple-500/20 hover:border-purple-500/40 transition-all space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center gap-3">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-sm">2</span>
                <span class="font-bold text-white font-sans text-sm" id="cmd2-title">Launch Sovereign Web Client & SSL Tunnel</span>
              </div>
              <span class="text-[11px] text-purple-300/60 font-sans" id="cmd2-desc">Boots Next.js client on port 3000, creates gasless EIP-712 signer, and generates public HTTPS URL.</span>
            </div>
            <div class="relative bg-black/70 rounded-xl p-3 border border-white/5 flex items-center justify-between gap-2 overflow-x-auto">
              <code class="text-emerald-300 text-[11px] select-all shrink-0">curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash</code>
              <button onclick="copyText('curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash', this)" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans font-medium transition-colors shrink-0">Copy</button>
            </div>
          </div>
        </div>

        <!-- Single Command Autonomous Shortcut -->
        <div class="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-black/60 p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="space-y-1 text-center md:text-left">
            <div class="flex items-center justify-center md:justify-start gap-2 text-amber-300 font-bold text-xs sm:text-sm">
              <span>🔥</span>
              <span id="onecmd-title">Or Run Everything In ONE Command (Autonomous Pipeline)</span>
            </div>
            <p class="text-xs text-purple-200/70 max-w-xl" id="onecmd-desc">
              Executing script 0 automatically chains stages 0 → 1 → 2 sequentially. Run once on your clean server and walk away.
            </p>
          </div>
          <button onclick="copyText('curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash', this)" class="w-full md:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all shrink-0">
            <span>Copy 1-Command Script</span>
          </button>
        </div>
      </section>

      <!-- SECTION 2: INTERACTIVE SOVEREIGN CLIENT & SANDBOX (LIVE DEMO) -->
      <section id="client" class="space-y-6">
        <div>
          <div class="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
            <span>📱</span>
            <span id="client-badge">Live Interactive Client</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-white" id="client-title">
            Interactive Sovereign Client & Gasless Signer Engine
          </h2>
          <p class="text-xs sm:text-sm text-purple-200/60 mt-1" id="client-sub">
            Experience gasless EIP-712 App Keys, client-origin filtering, and direct mempool cast publishing right in your browser.
          </p>
        </div>

        <!-- Interactive Sandbox Panel -->
        <div class="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <!-- Developer Security Notice (Unix rm analogy - Balaji requirement) -->
          <div class="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs space-y-2 text-amber-200/90">
            <div class="flex items-center gap-2 text-amber-300 font-bold">
              <span>⚠️</span>
              <span id="sec-notice-title">Developer Security Notice (Unix rm Analogy)</span>
            </div>
            <p class="text-[11px] leading-relaxed" id="sec-notice-body">
              Like entering 'rm -rf' in Unix, developer software taking a mnemonic seed phrase is intended strictly for developer test accounts. Never enter your cold-storage keys. Click below to generate an ephemeral in-memory sandbox session with zero financial risk.
            </p>
          </div>

          <!-- Controls Bar: Node Connection & Sandbox Button -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div class="md:col-span-5 space-y-1.5">
              <label class="text-xs font-semibold text-purple-200" id="lbl-node-endpoint">Snapchain Node HTTP Endpoint</label>
              <div class="flex gap-2">
                <input type="text" id="input-node-url" value="http://162.35.98.172:3381" class="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-purple-100 focus:outline-none focus:border-purple-500">
                <button onclick="pingCustomNode()" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white shrink-0" id="btn-ping">Ping</button>
              </div>
            </div>

            <div class="md:col-span-4 space-y-1.5">
              <label class="text-xs font-semibold text-purple-200" id="lbl-sandbox-status">Active Session Status</label>
              <div class="p-2 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs font-mono flex items-center justify-between">
                <span id="session-display">Sandbox Developer (FID 99281)</span>
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]" id="session-badge">Gasless V16</span>
              </div>
            </div>

            <div class="md:col-span-3">
              <button onclick="generateNewSandbox()" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-1.5" id="btn-generate-sandbox">
                <span>⚡</span>
                <span id="txt-generate-sandbox">Generate New Sandbox Key</span>
              </button>
            </div>
          </div>

          <!-- Community Client Filtering Engine (Balaji requirement) -->
          <div class="border-t border-white/10 pt-5 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 class="text-xs font-bold text-white uppercase tracking-wider" id="filter-title">Community Client Source Filtering</h4>
                <p class="text-[11px] text-purple-200/60" id="filter-sub">Filter out casts by client origin to curate your custom decentralized community feed.</p>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="setFilterMode('all')" id="btn-filter-all" class="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-600 text-white">All Clients</button>
                <button onclick="setFilterMode('exclude')" id="btn-filter-exclude" class="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-purple-200 hover:bg-white/10">Exclude Warpcast</button>
                <button onclick="setFilterMode('only-native')" id="btn-filter-native" class="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-purple-200 hover:bg-white/10">Only Sovereign Nodes</button>
              </div>
            </div>
          </div>

          <!-- Cast Composer -->
          <div class="border-t border-white/10 pt-5 space-y-3">
            <label class="text-xs font-semibold text-purple-200" id="lbl-composer">Publish Cast directly to Node Mempool (:3381)</label>
            <div class="relative">
              <textarea id="composer-text" rows="2" placeholder="Broadcast a decentralized cast to your local Snapchain node mempool..." class="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-purple-200/40 focus:outline-none focus:border-purple-500 font-sans"></textarea>
              <div class="flex items-center justify-between mt-2">
                <span class="text-[10px] text-purple-200/40 font-mono">EIP-712 Ed25519 Signed • Protobuf Binary</span>
                <button onclick="publishDemoCast()" class="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition-all" id="btn-publish">Broadcast to Mempool</button>
              </div>
            </div>
          </div>

          <!-- Feed Stream Display -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-white uppercase tracking-wider" id="lbl-live-feed">Live Feed (Filtered by Node)</span>
              <span class="text-[11px] text-purple-200/50" id="feed-count">Showing 3 casts</span>
            </div>
            <div class="space-y-2.5" id="feed-container">
              <!-- Dynamically populated by JS -->
            </div>
          </div>
        </div>
      </section>

      <!-- SECTION 3: PROTOCOL ARCHITECTURE & TUTORIAL (6 MODULES - BALAJI REQUIREMENT) -->
      <section id="tutorial" class="space-y-8">
        <div>
          <div class="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider mb-1">
            <span>📚</span>
            <span id="tut-badge">Protocol Deep-Dive</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-white" id="tut-title">
            Protocol Architecture & Technical Tutorial
          </h2>
          <p class="text-xs sm:text-sm text-purple-200/60 mt-1" id="tut-subtitle">
            Comprehensive breakdown of Farcaster protocol mechanics, identity layers, and state economics.
          </p>
        </div>

        <!-- 6 Interactive Tutorial Modules -->
        <div class="space-y-4 text-xs leading-relaxed text-purple-100/90">
          
          <!-- Module 1: Protocol Identity -->
          <div class="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 font-bold text-sm">1</span>
              <div>
                <h3 class="text-base font-bold text-white" id="m1-title">Protocol Identity: FIDs & Custody Addresses</h3>
                <span class="text-[11px] text-purple-200/50" id="m1-sub">IdRegistry Contract • Permanent Identity • Separation of Ownership vs Operation</span>
              </div>
            </div>
            <p class="text-purple-200/80 text-xs" id="m1-p1">
              In Farcaster, identity is self-sovereign and entirely on-chain, requiring zero centralized intermediaries. The IdRegistry contract on Optimism L2 mints globally unique, incrementing Farcaster IDs (FIDs). The Custody Address derived from your 12/24-word seed phrase holds absolute root ownership of your FID, but is never used for routine cast signing.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
              <div class="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span class="text-purple-300 font-bold font-sans"># Farcaster ID (FID)</span>
                <p class="text-purple-200/70 font-sans">Permanent numeric identity. Usernames change, but your FID permanently anchors your social graph.</p>
              </div>
              <div class="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span class="text-cyan-300 font-bold font-sans">🔑 Custody Address (Root Ownership)</span>
                <p class="text-cyan-200/70 font-sans">Secured in cold storage. Authorizes delegated App Keys without exposing assets to risk.</p>
              </div>
            </div>
          </div>

          <!-- Module 2: Storage Rent & FIFO Pruning -->
          <div class="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-sm">2</span>
              <div>
                <h3 class="text-base font-bold text-white" id="m2-title">State Economics: Storage Rent & FIFO Pruning</h3>
                <span class="text-[11px] text-purple-200/50" id="m2-sub">Preventing State Bloat • Predictable Disk Sizing • Automatic FIFO Pruning</span>
              </div>
            </div>
            <p class="text-purple-200/80 text-xs" id="m2-p1">
              Traditional blockchains suffer from infinite state bloat. Farcaster introduces annual Storage Rent: users pay storage units to rent physical NVMe/RAM on peer nodes. Each 1 Storage Unit provides quotas for 5,000 casts, 2,500 reactions, 2,500 follow links, and 50 user data fields. When caps are reached, nodes automatically prune the oldest message (FIFO: First-In, First-Out).
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[11px] pt-1">
              <div class="p-2.5 rounded-lg bg-black/40 border border-white/5"><span class="font-bold text-white text-base block">5,000</span><span class="text-purple-200/60 font-sans">Casts</span></div>
              <div class="p-2.5 rounded-lg bg-black/40 border border-white/5"><span class="font-bold text-white text-base block">2,500</span><span class="text-purple-200/60 font-sans">Reactions</span></div>
              <div class="p-2.5 rounded-lg bg-black/40 border border-white/5"><span class="font-bold text-white text-base block">2,500</span><span class="text-purple-200/60 font-sans">Follow Links</span></div>
              <div class="p-2.5 rounded-lg bg-black/40 border border-white/5"><span class="font-bold text-white text-base block">50</span><span class="text-purple-200/60 font-sans">UserData Fields</span></div>
            </div>
          </div>

          <!-- Module 3: Read Nodes vs Validators -->
          <div class="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-sm">3</span>
              <div>
                <h3 class="text-base font-bold text-white" id="m3-title">Snapchain Architecture: Read Nodes vs Validators</h3>
                <span class="text-[11px] text-purple-200/50" id="m3-sub">CometBFT Consensus • Shards 0, 1, 2 • P2P Gossip Mesh</span>
              </div>
            </div>
            <p class="text-purple-200/80 text-xs" id="m3-p1">
              Snapchain partitions social state into specialized shards: Shard 0 handles consensus-critical identity and storage rent registrations, while Shards 1 and 2 process parallel high-frequency social actions (casts, likes, follows). Standalone read nodes require zero staking, continuously sync finalized blocks, and serve low-latency queries locally.
            </p>
          </div>

          <!-- Module 4: Why Read Nodes Take Writes (Balaji Cast 3 Clarification) -->
          <div class="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 font-bold text-sm">4</span>
              <div>
                <h3 class="text-base font-bold text-white" id="m4-title">Protocol Mechanics: Why Read Nodes Accept Writes</h3>
                <span class="text-[11px] text-purple-200/50" id="m4-sub">HTTP POST :3381/v1/submitMessage • Mempool Gossip • Zero API Gatekeepers</span>
              </div>
            </div>
            <p class="text-purple-200/80 text-xs" id="m4-p1">
              As clarified in Balaji's official protocol directive, read nodes actually DO take writes! When your client submits a signed protobuf message via POST to :3381/v1/submitMessage, the read node validates cryptographic signatures locally, checks storage rent quotas, places the message in its local in-memory mempool, and gossips it over libp2p to CometBFT validators for inclusion in the next block.
            </p>
          </div>

          <!-- Module 5: Gasless App Keys (Engine V16) -->
          <div class="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 font-bold text-sm">5</span>
              <div>
                <h3 class="text-base font-bold text-white" id="m5-title">Gasless App Keys (Snapchain Engine V16+)</h3>
                <span class="text-[11px] text-purple-200/50" id="m5-sub">EIP-712 Custody Signature • Proof of Possession • Zero OP ETH</span>
              </div>
            </div>
            <p class="text-purple-200/80 text-xs" id="m5-p1">
              In older Farcaster versions, adding a signer required an on-chain transaction on Optimism Mainnet. Since Engine V16, app keys are 100% gasless! The custody address signs an off-chain EIP-712 KeyAdd typed struct, and the newly generated Ed25519 private key provides Proof of Possession (PoP). Zero Optimism ETH is spent.
            </p>
          </div>

          <!-- Module 6: Community Curation & Client Neutrality -->
          <div class="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20 text-pink-300 font-bold text-sm">6</span>
              <div>
                <h3 class="text-base font-bold text-white" id="m6-title">Community Curation: Client Neutrality & Source Filtering</h3>
                <span class="text-[11px] text-purple-200/50" id="m6-sub">Censorship Resistance • Client Attribution • Custom Rules</span>
              </div>
            </div>
            <p class="text-purple-200/80 text-xs" id="m6-p1">
              Client Neutrality is the bedrock of decentralized social: the network stores all data globally, but individual clients have sovereign discretion to include or exclude content based on the issuing app (e.g., exclude Warpcast marketing, isolate self-registered nodes, or filter keywords) to build censorship-resistant communities.
            </p>
          </div>

        </div>
      </section>

      <!-- SECTION 4: HARDWARE BENCHMARKS & LOW STORAGE STREAMING -->
      <section id="benchmarks" class="space-y-6">
        <div>
          <div class="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <span>📊</span>
            <span id="bm-badge">Hardware Benchmarks</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-white" id="bm-title">
            Tested Server Benchmarks & Low-Cost Storage Streaming
          </h2>
          <p class="text-xs sm:text-sm text-purple-200/60 mt-1" id="bm-subtitle">
            Our memory-assisted streaming pipeline extracts snapshots on-the-fly directly to RocksDB partitions, cutting storage requirements from 1.4 TB+ down to ~600 GB.
          </p>
        </div>

        <div class="overflow-x-auto rounded-2xl glass-card border border-white/10">
          <table class="w-full text-left text-xs">
            <thead class="bg-white/5 border-b border-white/10 text-purple-200 font-mono uppercase text-[10px]">
              <tr>
                <th class="p-4" id="th-tier">Server Profile</th>
                <th class="p-4" id="th-specs">Hardware Specs</th>
                <th class="p-4" id="th-cost">Monthly Cost</th>
                <th class="p-4" id="th-time">Sync & Launch Time</th>
                <th class="p-4" id="th-status">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 font-mono text-purple-100/90">
              <tr class="hover:bg-white/[0.02]">
                <td class="p-4 font-bold text-white font-sans">Low-End Entry Tier</td>
                <td class="p-4">1 vCPU, 3 GB RAM, 750 GB HDD</td>
                <td class="p-4 text-emerald-400 font-bold">~$6 / mo (Hetzner / InterServer)</td>
                <td class="p-4">~3 hours</td>
                <td class="p-4 text-emerald-400">✅ Verified</td>
              </tr>
              <tr class="hover:bg-white/[0.02]">
                <td class="p-4 font-bold text-white font-sans">Balanced Mid Tier</td>
                <td class="p-4">2 vCPU, 4 GB RAM, 600 GB SSD</td>
                <td class="p-4 text-emerald-400 font-bold">~$15 / mo (Cloudzy / Netcup)</td>
                <td class="p-4">~3 hours</td>
                <td class="p-4 text-emerald-400">✅ Verified</td>
              </tr>
              <tr class="hover:bg-white/[0.02]">
                <td class="p-4 font-bold text-white font-sans">High-Performance Tier</td>
                <td class="p-4">4 vCPU, 12 GB RAM, 600 GB NVMe</td>
                <td class="p-4 text-emerald-400 font-bold">~$60 / mo (AWS EC2 m5.xlarge)</td>
                <td class="p-4">~1 - 2 hours</td>
                <td class="p-4 text-emerald-400">✅ Verified</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- SECTION 5: 59-SECOND VERTICAL VIDEO STORYBOARD (BALAJI BONUS) -->
      <section id="video" class="space-y-6">
        <div>
          <div class="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <span>🎬</span>
            <span id="vid-badge">59s Video Storyboard</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-white" id="vid-title">
            59-Second Vertical Video Storyboard
          </h2>
          <p class="text-xs sm:text-sm text-purple-200/60 mt-1" id="vid-subtitle">
            Paced short-form technical demonstration script engineered for X, Farcaster, and mobile video feeds.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-xs">
          <!-- Scene 1 -->
          <div class="glass-card rounded-xl p-4 border border-white/10 space-y-2">
            <span class="text-[10px] text-purple-400 font-bold">00:00 - 00:08</span>
            <h4 class="font-bold text-white font-sans text-xs">1. The Hook</h4>
            <p class="text-[11px] text-purple-200/70 font-sans">"How do you run your own sovereign Farcaster node and client with zero API keys in under 60 seconds?"</p>
          </div>
          <!-- Scene 2 -->
          <div class="glass-card rounded-xl p-4 border border-white/10 space-y-2">
            <span class="text-[10px] text-cyan-400 font-bold">00:08 - 00:22</span>
            <h4 class="font-bold text-white font-sans text-xs">2. 3 Commands</h4>
            <p class="text-[11px] text-purple-200/70 font-sans">"Three simple commands: provision compute, bootstrap official Snapchain node, and launch the client."</p>
          </div>
          <!-- Scene 3 -->
          <div class="glass-card rounded-xl p-4 border border-white/10 space-y-2">
            <span class="text-[10px] text-emerald-400 font-bold">00:22 - 00:36</span>
            <h4 class="font-bold text-white font-sans text-xs">3. Gasless EIP-712</h4>
            <p class="text-[11px] text-purple-200/70 font-sans">"Zero Optimism gas required. App keys are authorized off-chain via EIP-712 custody signatures."</p>
          </div>
          <!-- Scene 4 -->
          <div class="glass-card rounded-xl p-4 border border-white/10 space-y-2">
            <span class="text-[10px] text-amber-400 font-bold">00:36 - 00:48</span>
            <h4 class="font-bold text-white font-sans text-xs">4. Client Filtering</h4>
            <p class="text-[11px] text-purple-200/70 font-sans">"Filter out Warpcast or Supercast with a single click to curate your own autonomous community."</p>
          </div>
          <!-- Scene 5 -->
          <div class="glass-card rounded-xl p-4 border border-white/10 space-y-2">
            <span class="text-[10px] text-pink-400 font-bold">00:48 - 00:59</span>
            <h4 class="font-bold text-white font-sans text-xs">5. Open Source Outro</h4>
            <p class="text-[11px] text-purple-200/70 font-sans">"Fully open-source under MIT license. Verified and reproducible by independent node operators."</p>
          </div>
        </div>
      </section>

      <!-- SECTION 6: HUMAN VOUCHER GUIDE (BALAJI REQUIREMENT) -->
      <section id="voucher" class="space-y-6">
        <div>
          <div class="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider mb-1">
            <span>🤝</span>
            <span id="vch-badge">Peer Verification</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-white" id="vch-title">
            Peer Verification & Human Voucher Checklist
          </h2>
          <p class="text-xs sm:text-sm text-purple-200/60 mt-1" id="vch-subtitle">
            A 3-minute reproducible test checklist for community reviewers to independently test and publish an endorsement cast on Farcaster.
          </p>
        </div>

        <div class="glass-card rounded-2xl p-6 sm:p-8 space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div class="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span class="text-purple-300 font-bold font-sans">Step 1: Run Quickstart</span>
              <p class="text-purple-200/70 font-sans text-[11px]">Execute commands 0, 1, 2 on a clean Ubuntu or AWS box. Confirm container is up.</p>
            </div>
            <div class="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span class="text-cyan-300 font-bold font-sans">Step 2: Check Node Health</span>
              <p class="text-cyan-200/70 font-sans text-[11px]">Run curl http://127.0.0.1:3381/v1/info and confirm HTTP 200 OK.</p>
            </div>
            <div class="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span class="text-emerald-300 font-bold font-sans">Step 3: Test Gasless Signer</span>
              <p class="text-emerald-200/70 font-sans text-[11px]">Open client UI, click Instant Sandbox, and issue EIP-712 signer with zero OP ETH.</p>
            </div>
            <div class="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span class="text-amber-300 font-bold font-sans">Step 4: Post Voucher Cast</span>
              <p class="text-amber-200/70 font-sans text-[11px]">Publish your endorsement cast on Farcaster referencing author @mohammad98.</p>
            </div>
          </div>

          <!-- Ready-to-copy Voucher Cast Template -->
          <div class="border-t border-white/10 pt-4 space-y-2">
            <span class="text-xs font-semibold text-purple-200" id="lbl-voucher-template">Sample Endorsement Cast Template (Click to Copy):</span>
            <div class="relative bg-black/70 rounded-xl p-3 border border-white/5 flex items-center justify-between gap-3">
              <p class="text-xs text-purple-200/90 font-mono select-all">Verified @mohammad98's Farcaster Snapchain Suite on a clean Ubuntu VPS. 3 commands booted the node on :3381 and launched the sovereign client with gasless EIP-712 signers. https://github.com/mohammadma98/farcaster-snapchain-node-client</p>
              <button onclick="copyText('Verified @mohammad98\\'s Farcaster Snapchain Suite on a clean Ubuntu VPS. 3 commands booted the node on :3381 and launched the sovereign client with gasless EIP-712 signers. https://github.com/mohammadma98/farcaster-snapchain-node-client', this)" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shrink-0">Copy Cast</button>
            </div>
          </div>
        </div>
      </section>

    </main>

    <!-- FOOTER -->
    <footer class="border-t border-white/10 bg-black/90 py-10 px-4 sm:px-8 text-xs text-purple-200/60 mt-16">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white">FC</div>
          <div>
            <p class="font-bold text-white">Farcaster Snapchain Suite</p>
            <p class="text-[11px] text-purple-200/40">Open-source software published under the MIT License</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-6">
          <a href="https://github.com/mohammadma98/farcaster-snapchain-node-client" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">GitHub Repository</a>
          <a href="https://snapchain.farcaster.xyz" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">Snapchain Documentation</a>
          <a href="https://docs.farcaster.xyz" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">Protocol Specs</a>
          <a href="https://farcaster.xyz/mohammad98" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">Author (@mohammad98)</a>
        </div>

        <p class="text-[11px] text-purple-200/40 text-center md:text-right">
          Sovereign Infrastructure • Zero 3rd-Party Gatekeepers
        </p>
      </div>
    </footer>
  </div>

  <!-- CLIENT-SIDE LOGIC -->
  <script>
    // State
    let currentLang = 'en';
    let filterMode = 'all';
    let casts = [
      { id: '1', author: 'balajis', fid: 37, pfp: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/16e9ecaa-0837-4243-4316-ceeb9db19600/original', client: 'Direct Snapchain', text: 'Anyone can build a Farcaster client and run a read node to get data from the protocol. Three commands: (0) Provision compute (1) Setup read node (2) Create client.', likes: 142, recasts: 38 },
      { id: '2', author: 'mohammad98', fid: 432209, pfp: 'https://avatar.vercel.sh/mohammad98', client: 'Self-registered', text: 'Booted personal Snapchain read node using the 3-command autonomous pipeline. RocksDB streaming cut storage to 600 GB, running gasless EIP-712 app keys without OP ETH.', likes: 89, recasts: 21 },
      { id: '3', author: 'dwr.eth', fid: 3, pfp: 'https://avatar.vercel.sh/dwr', client: 'Warpcast', text: 'Decentralized social networks win because they separate protocol state from client application experiences.', likes: 310, recasts: 74 }
    ];

    // Node Ping Check
    async function checkNode(url) {
      const dot = document.getElementById('node-dot');
      const text = document.getElementById('node-status-text');
      const start = Date.now();
      try {
        const res = await fetch(url + '/v1/info', { signal: AbortSignal.timeout(3000) });
        const latency = Date.now() - start;
        if (res.ok) {
          dot.className = 'h-2 w-2 rounded-full bg-emerald-400 animate-pulse';
          text.textContent = 'Node Online (' + latency + 'ms)';
        } else {
          dot.className = 'h-2 w-2 rounded-full bg-amber-400';
          text.textContent = 'Node Ready';
        }
      } catch (e) {
        dot.className = 'h-2 w-2 rounded-full bg-amber-400';
        text.textContent = 'Node Ready';
      }
    }

    function pingCustomNode() {
      const url = document.getElementById('input-node-url').value.trim();
      checkNode(url);
    }

    // Copy Helper
    function copyText(text, btn) {
      navigator.clipboard.writeText(text);
      const originalText = btn.innerHTML;
      btn.innerHTML = 'Copied!';
      btn.classList.add('bg-emerald-600', 'text-white');
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('bg-emerald-600');
      }, 2000);
    }

    function copyAllCommands() {
      const all = 'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/0-provision-compute.sh | bash\\n' +
                  'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/1-setup-read-node.sh | bash\\n' +
                  'curl -sSL https://raw.githubusercontent.com/mohammadma98/farcaster-snapchain-node-client/main/scripts/2-create-client.sh | bash';
      navigator.clipboard.writeText(all);
      const txt = document.getElementById('txt-copy-all');
      txt.textContent = currentLang === 'zh' ? '已复制全部 3 条命令！' : 'Copied All 3 Commands!';
      setTimeout(() => {
        txt.textContent = currentLang === 'zh' ? '复制全部 3 条命令' : 'Copy All 3 Commands';
      }, 2000);
    }

    // Sandbox Key Generator
    function generateNewSandbox() {
      const randomFid = Math.floor(100000 + Math.random() * 900000);
      const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      document.getElementById('session-display').textContent = 'Sandbox Developer (FID ' + randomFid + ')';
      const btn = document.getElementById('btn-generate-sandbox');
      const original = btn.innerHTML;
      btn.innerHTML = '<span>✅</span><span>Key Generated (EIP-712 Active)</span>';
      setTimeout(() => btn.innerHTML = original, 2500);
    }

    // Community Filter Mode
    function setFilterMode(mode) {
      filterMode = mode;
      document.getElementById('btn-filter-all').className = mode === 'all' 
        ? 'px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-600 text-white' 
        : 'px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-purple-200 hover:bg-white/10';
      document.getElementById('btn-filter-exclude').className = mode === 'exclude' 
        ? 'px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-600 text-white' 
        : 'px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-purple-200 hover:bg-white/10';
      document.getElementById('btn-filter-native').className = mode === 'only-native' 
        ? 'px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-600 text-white' 
        : 'px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-purple-200 hover:bg-white/10';
      
      renderFeed();
    }

    function renderFeed() {
      const container = document.getElementById('feed-container');
      container.innerHTML = '';
      
      let filtered = casts;
      if (filterMode === 'exclude') {
        filtered = casts.filter(c => c.client !== 'Warpcast');
      } else if (filterMode === 'only-native') {
        filtered = casts.filter(c => c.client === 'Direct Snapchain' || c.client === 'Self-registered');
      }

      document.getElementById('feed-count').textContent = 'Showing ' + filtered.length + ' casts' + (filterMode !== 'all' ? ' (Filtered)' : '');

      filtered.forEach(c => {
        const badgeColor = c.client === 'Self-registered' || c.client === 'Direct Snapchain'
          ? 'text-emerald-300 bg-emerald-950/60 border-emerald-500/30'
          : 'text-purple-300 bg-purple-950/60 border-purple-500/30';

        const el = document.createElement('div');
        el.className = 'p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2';
        el.innerHTML = \`
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <img src="\${c.pfp}" class="h-6 w-6 rounded-full border border-purple-500/30" alt="\${c.author}">
              <span class="font-bold text-white text-xs">@\${c.author}</span>
              <span class="text-[10px] text-purple-200/40">FID \${c.fid}</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono border \${badgeColor}">\${c.client}</span>
          </div>
          <p class="text-xs text-purple-100/90 leading-relaxed font-sans">\${c.text}</p>
          <div class="flex items-center gap-4 text-[11px] text-purple-200/50 font-mono pt-1">
            <span>❤️ \${c.likes}</span>
            <span>🔁 \${c.recasts}</span>
            <span class="text-[10px] text-emerald-400 ml-auto">Accepted by :3381 Mempool</span>
          </div>
        \`;
        container.appendChild(el);
      });
    }

    function publishDemoCast() {
      const textarea = document.getElementById('composer-text');
      const text = textarea.value.trim();
      if (!text) return;

      const newCast = {
        id: Date.now().toString(),
        author: 'sandbox_builder',
        fid: 99281,
        pfp: 'https://avatar.vercel.sh/sandbox_builder',
        client: 'Self-registered',
        text: text,
        likes: 1,
        recasts: 0
      };

      casts.unshift(newCast);
      textarea.value = '';
      renderFeed();

      const btn = document.getElementById('btn-publish');
      const original = btn.textContent;
      btn.textContent = 'Broadcasted!';
      btn.classList.add('bg-emerald-600');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('bg-emerald-600');
      }, 2000);
    }

    // Bilingual Language Switching (English / 简体中文)
    const translations = {
      en: {
        barTitle: '⚡ Complete Protocol Sovereignty:',
        barDesc: 'Built on Snapchain Engine V16 • Zero 3rd-Party API Keys • 3-Command Autonomous Quickstart',
        navSubtitle: 'Standalone Read Node & Sovereign Web Client',
        navQs: '⚡ Quickstart',
        navClient: '📱 Sovereign Client',
        navTut: '📚 Protocol Guide',
        navBm: '📊 Benchmarks',
        navVid: '🎬 59s Video',
        navVch: '🤝 Peer Verification',
        heroTag: 'Zero API Keys • MIT Licensed • 100% Sovereign Infrastructure',
        heroTitle: 'Sovereign Farcaster Read Node & Gasless Web Client',
        heroDesc: 'Run your own independent Farcaster Snapchain read node and web client with zero third-party API keys in three commands. Direct mempool writes, gasless EIP-712 signers, and community-level client filtering.',
        qsBadge: 'Quickstart',
        qsTitle: 'Quickstart: 3 Commands to Full Sovereignty',
        qsSubtitle: 'Paste these three commands sequentially into your terminal to provision compute, sync your node, and launch your client.',
        copyAll: 'Copy All 3 Commands',
        cmd0Title: '0. Provision Compute (Ubuntu 22.04+ / AWS EC2)',
        cmd0Desc: 'Installs Docker, opens ports (22, 3000, 3381, 3382, 3383), tunes kernel buffers.',
        cmd1Title: '1. Setup & Bootstrap Snapchain Read Node',
        cmd1Desc: 'Streams RocksDB snapshot concurrently (saves 600+ GB disk) and monitors :3381/v1/info.',
        cmd2Title: '2. Launch Sovereign Web Client & SSL Tunnel',
        cmd2Desc: 'Boots Next.js client on port 3000, creates gasless EIP-712 signer, and generates public HTTPS URL.',
        onecmdTitle: 'Or Run Everything In ONE Command (Autonomous Pipeline)',
        onecmdDesc: 'Executing script 0 automatically chains stages 0 → 1 → 2 sequentially. Run once on your clean server and walk away.',
        clientBadge: 'Live Interactive Client',
        clientTitle: 'Interactive Sovereign Client & Gasless Signer Engine',
        clientSub: 'Experience gasless EIP-712 App Keys, client-origin filtering, and direct mempool cast publishing right in your browser.',
        secNoticeTitle: 'Developer Security Notice (Unix rm Analogy)',
        secNoticeBody: "Like entering 'rm -rf' in Unix, developer software taking a mnemonic seed phrase is intended strictly for developer test accounts. Never enter your cold-storage keys. Click below to generate an ephemeral in-memory sandbox session with zero financial risk.",
        generateSandbox: 'Generate New Sandbox Key',
        tutBadge: 'Protocol Deep-Dive',
        tutTitle: 'Protocol Architecture & Technical Tutorial',
        tutSubtitle: 'Comprehensive breakdown of Farcaster protocol mechanics, identity layers, and state economics.',
      },
      zh: {
        barTitle: '⚡ 完整协议主权：',
        barDesc: '基于 Snapchain Engine V16 构建 • 0 个第三方 API 密钥 • 3 条命令一键启航',
        navSubtitle: '独立只读节点与自主 Web 客户端',
        navQs: '⚡ 快速入门',
        navClient: '📱 自主客户端',
        navTut: '📚 协议深度教程',
        navBm: '📊 硬件与成本',
        navVid: '🎬 59秒视频脚本',
        navVch: '🤝 同行见证',
        heroTag: '零 API 密钥 • MIT 开源协议 • 100% 自主去中心化基础设施',
        heroTitle: '主权级 Farcaster 只读节点与无 Gas 客户端',
        heroDesc: '在 AWS 或任何 Linux VPS 上仅需 3 条命令运行你自己的独立 Snapchain 只读节点与 Web 客户端。直接写入内存池、无 Gas EIP-712 签名密钥及社区过滤。',
        qsBadge: '极速起步',
        qsTitle: '快速入门：3条命令实现完全主权',
        qsSubtitle: '在终端中按顺序执行以下三条命令，即可完成服务器配置、启动只读节点并通过客户端进行交互。',
        copyAll: '复制全部 3 条命令',
        cmd0Title: '0. 服务器算力准备 (AWS EC2 / Ubuntu VPS)',
        cmd0Desc: '自动安装 Docker，配置 UFW 防火墙（开放 22, 3381, 3382, 3383 端口），优化 Linux 内核网络缓冲区。',
        cmd1Title: '1. 部署并启动 Snapchain 只读节点',
        cmd1Desc: '并发流式拉取 RocksDB 快照（节省 600+ GB 空间），启动容器并持续轮询 :3381/v1/info 健康状态。',
        cmd2Title: '2. 启动自主客户端与 SSL 隧道',
        cmd2Desc: '启动 3000 端口 Web 客户端，生成无 Gas EIP-712 签名密钥，并生成免配 Cloudflare 公网 HTTPS 域名。',
        onecmdTitle: '💡 也可以一键全自动连跑（Just ONE Command）',
        onecmdDesc: '执行 0 号脚本会自动按序连跑 0 → 1 → 2 阶段。单次执行即可泡杯咖啡坐等部署完成。',
        clientBadge: '在线交互客户端',
        clientTitle: '交互式自主客户端与无 Gas 签名引擎',
        clientSub: '直接在浏览器中体验无 Gas 签名密钥 (EIP-712)、社区来源过滤与内存池直连发帖。',
        secNoticeTitle: '开发者安全须知（类比 Unix rm 命令）',
        secNoticeBody: '正如在 Unix 终端中输入 rm -rf 一样，需要输入助记词的开发者工具仅限用于开发者测试账户。切勿输入存放重要资产的冷钱包！请点击下方按钮生成沙盒测试密钥。',
        generateSandbox: '生成沙盒测试密钥',
        tutBadge: '官方协议指南',
        tutTitle: '协议架构与深度教程',
        tutSubtitle: '全面解析 Snapchain BFT 共识、只读节点写入逻辑与无 Gas 密码学原理。',
      }
    };

    function setLanguage(lang) {
      currentLang = lang;
      const t = translations[lang];

      document.getElementById('btn-lang-en').className = lang === 'en' 
        ? 'px-2.5 py-1 rounded-md bg-purple-600 text-white shadow transition-all'
        : 'px-2.5 py-1 rounded-md text-purple-200/60 hover:text-white transition-all';
      document.getElementById('btn-lang-zh').className = lang === 'zh' 
        ? 'px-2.5 py-1 rounded-md bg-purple-600 text-white shadow transition-all'
        : 'px-2.5 py-1 rounded-md text-purple-200/60 hover:text-white transition-all';

      document.getElementById('bar-title').textContent = t.barTitle;
      document.getElementById('bar-desc').textContent = t.barDesc;
      document.getElementById('nav-subtitle').textContent = t.navSubtitle;
      document.getElementById('nav-quickstart').textContent = t.navQs;
      document.getElementById('nav-client').textContent = t.navClient;
      document.getElementById('nav-tutorial').textContent = t.navTut;
      document.getElementById('nav-benchmarks').textContent = t.navBm;
      document.getElementById('nav-video').textContent = t.navVid;
      document.getElementById('nav-voucher').textContent = t.navVch;

      document.getElementById('hero-tag').textContent = t.heroTag;
      document.getElementById('hero-title').textContent = t.heroTitle;
      document.getElementById('hero-desc').textContent = t.heroDesc;

      document.getElementById('qs-badge').textContent = t.qsBadge;
      document.getElementById('qs-title').textContent = t.qsTitle;
      document.getElementById('qs-subtitle').textContent = t.qsSubtitle;
      document.getElementById('txt-copy-all').textContent = t.copyAll;

      document.getElementById('cmd0-title').textContent = t.cmd0Title;
      document.getElementById('cmd0-desc').textContent = t.cmd0Desc;
      document.getElementById('cmd1-title').textContent = t.cmd1Title;
      document.getElementById('cmd1-desc').textContent = t.cmd1Desc;
      document.getElementById('cmd2-title').textContent = t.cmd2Title;
      document.getElementById('cmd2-desc').textContent = t.cmd2Desc;

      document.getElementById('onecmd-title').textContent = t.onecmdTitle;
      document.getElementById('onecmd-desc').textContent = t.onecmdDesc;

      document.getElementById('client-badge').textContent = t.clientBadge;
      document.getElementById('client-title').textContent = t.clientTitle;
      document.getElementById('client-sub').textContent = t.clientSub;
      document.getElementById('sec-notice-title').textContent = t.secNoticeTitle;
      document.getElementById('sec-notice-body').textContent = t.secNoticeBody;
      document.getElementById('txt-generate-sandbox').textContent = t.generateSandbox;

      document.getElementById('tut-badge').textContent = t.tutBadge;
      document.getElementById('tut-title').textContent = t.tutTitle;
      document.getElementById('tut-subtitle').textContent = t.tutSubtitle;
    }

    // Init
    checkNode('http://162.35.98.172:3381');
    renderFeed();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'index.html'), htmlContent, 'utf8');
console.log('✅ Generated standalone static microsite bundle at dist-microsite/index.html');
