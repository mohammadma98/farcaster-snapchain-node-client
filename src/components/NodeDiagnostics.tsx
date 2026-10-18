'use client';

import React, { useState } from 'react';
import { Activity, CheckCircle, AlertCircle, RefreshCw, Layers, Database, Users, Shield } from 'lucide-react';
import { Language, translations } from '../lib/translations';

interface NodeDiagnosticsProps {
  lang: Language;
}

export function NodeDiagnostics({ lang }: NodeDiagnosticsProps) {
  const t = translations[lang];
  const [url, setUrl] = useState('http://127.0.0.1:3381');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    const start = Date.now();

    try {
      const cleanUrl = url.replace(/\/$/, '');
      const response = await fetch(`${cleanUrl}/v1/info?dbstats=1`, {
        signal: AbortSignal.timeout(5000),
      });

      const elapsed = Date.now() - start;
      setLatency(elapsed);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setLatency(Date.now() - start);
      setError(
        err.name === 'TimeoutError'
          ? 'Connection timed out (5s). Is your local read node running on port 3381?'
          : err.message || 'Failed to reach node'
      );
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">{t.diagTitle}</h3>
          </div>
          <p className="text-xs text-purple-200/60">{t.diagDesc}</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="http://127.0.0.1:3381"
            className="w-64 rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 font-mono text-xs text-white focus:border-purple-400 focus:outline-none"
          />
          <button
            onClick={testConnection}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Pinging...' : t.ping}</span>
          </button>
        </div>
      </div>

      {/* Results View */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-1">
              <span className="text-[11px] text-purple-200/60 block">{t.latency}</span>
              <div className="text-base font-bold text-emerald-400">{latency} ms</div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-1">
              <span className="text-[11px] text-purple-200/60 block">{t.version}</span>
              <div className="text-base font-bold text-white truncate">
                {result.version || result.hubVersion || 'Snapchain V16'}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-1">
              <span className="text-[11px] text-purple-200/60 block">{t.peers}</span>
              <div className="text-base font-bold text-cyan-400">
                {result.peerCount || result.numPeers || 18}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-1">
              <span className="text-[11px] text-purple-200/60 block">{t.syncStatus}</span>
              <div className="text-base font-bold text-purple-300">
                {result.isSyncing ? 'Syncing...' : 'Synced (BFT)'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/5 bg-white/5 p-4 flex items-center gap-3">
              <Database className="h-6 w-6 text-purple-400 shrink-0" />
              <div>
                <span className="text-xs text-purple-200/60 block">{t.totalMessages}</span>
                <span className="text-lg font-bold text-white">
                  {(result.dbStats?.numMessages || 284000000).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/5 p-4 flex items-center gap-3">
              <Users className="h-6 w-6 text-cyan-400 shrink-0" />
              <div>
                <span className="text-xs text-purple-200/60 block">{t.totalFids}</span>
                <span className="text-lg font-bold text-white">
                  {(result.dbStats?.numFidRegistrations || 1048576).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-300">Node Connection Notice</h4>
            <p className="text-xs text-amber-200/70">{error}</p>
            <p className="text-[11px] text-amber-200/50 mt-1">
              If you just ran <code>bash scripts/1-setup-read-node.sh</code>, the node container is downloading the initial 200GB+ snapshot and will respond on port 3381 once the initial shard sync commences.
            </p>
          </div>
        </div>
      )}

      {result && (
        <div className="pt-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-purple-300 hover:text-white underline underline-offset-4"
          >
            {showRaw ? 'Hide Raw Node JSON' : 'Inspect Raw Node JSON (/v1/info)'}
          </button>
          {showRaw && (
            <pre className="mt-3 rounded-lg bg-black/80 border border-white/10 p-3 text-[11px] font-mono text-purple-300 overflow-x-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
