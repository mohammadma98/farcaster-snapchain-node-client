'use client';

import React, { useState } from 'react';
import {
  Key,
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff,
  Clipboard,
  Check,
  ArrowRight,
  Loader2,
  Lock,
  Terminal,
} from 'lucide-react';
import { UserSession } from '@/lib/farcaster/types';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
  onCancel?: () => void;
  nodeUrl: string;
}

export function LoginPage({ onLoginSuccess, onCancel, nodeUrl }: LoginPageProps) {
  const [mnemonic, setMnemonic] = useState('');
  const [usernameOrFid, setUsernameOrFid] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDev, setIsGeneratingDev] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedDevMnemonic, setCopiedDevMnemonic] = useState(false);

  // Word count detection
  const words = mnemonic.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const isWordCountValid = wordCount === 12 || wordCount === 24;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setMnemonic(text.trim());
        setError(null);
      }
    } catch {
      // Clipboard permission denied
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mnemonic.trim()) {
      setError('Please enter your 12 or 24-word seed phrase.');
      return;
    }
    if (!isWordCountValid) {
      setError(`Detected ${wordCount} words. Seed phrase must have exactly 12 or 24 words.`);
      return;
    }
    if (!usernameOrFid.trim()) {
      setError('Please enter your Farcaster username (e.g. @mohammad98) or FID.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mnemonic: mnemonic.trim(),
          usernameOrFid: usernameOrFid.trim(),
          nodeUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        throw new Error(data.error || 'Failed to authenticate');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Login error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDevAccount = async () => {
    setIsGeneratingDev(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/sandbox?nodeUrl=${encodeURIComponent(nodeUrl)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        throw new Error(data.error || 'Failed to generate dev account');
      }

      setMnemonic(data.mnemonic);
      if (data.user?.username) {
        setUsernameOrFid(data.user.username);
      }
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize dev account');
    } finally {
      setIsGeneratingDev(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden text-gray-900 transition-all">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 p-6 text-white text-center relative">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-3 border border-white/20 shadow-inner">
          <Key className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Log In to Farcaster Client</h2>
        <p className="text-xs text-purple-100 mt-1">
          Direct cryptographic connection to your Snapchain Read Node
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Balaji Cast 3 Directive Security Warning */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3 text-amber-900">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed space-y-1">
            <span className="font-semibold block text-amber-950">
              Developer Security Notice (Unix rm policy)
            </span>
            <p className="text-amber-800">
              Entering a seed phrase in an open-source web client is intended for development and test accounts.
              Never paste your primary cold wallet mnemonic.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* 1-Click Sandbox Test Generator */}
        <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-950">Don't have a test mnemonic?</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-purple-200/70 text-purple-800 px-2 py-0.5 rounded-full">
              Instant
            </span>
          </div>
          <p className="text-xs text-purple-900/80 leading-relaxed">
            Generate a fresh 12-word cryptographic seed phrase and issue gasless app keys in 1 click.
          </p>
          <button
            type="button"
            onClick={handleGenerateDevAccount}
            disabled={isGeneratingDev || isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 text-xs shadow-sm transition-all disabled:opacity-50"
          >
            {isGeneratingDev ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating Cryptographic Keys...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Dev Test Account (1-Click)</span>
              </>
            )}
          </button>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-gray-200" />
          <span className="flex-shrink mx-4 text-xs font-medium text-gray-400 uppercase">Or Import Existing</span>
          <div className="flex-grow border-t border-gray-200" />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Mnemonic Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">
                12 or 24-Word Seed Phrase (Mnemonic)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePaste}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 hover:text-purple-700"
                >
                  <Clipboard className="h-3 w-3" />
                  <span>Paste</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMnemonic(!showMnemonic)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-700"
                >
                  {showMnemonic ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  <span>{showMnemonic ? 'Hide' : 'Show'}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={mnemonic}
                onChange={(e) => {
                  setMnemonic(e.target.value);
                  setError(null);
                }}
                placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
                rows={3}
                spellCheck={false}
                className={`w-full rounded-xl border p-3 text-xs font-mono transition-all resize-none outline-none focus:ring-2 focus:ring-purple-500 ${
                  wordCount > 0 && !isWordCountValid
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-gray-200 bg-gray-50 focus:bg-white'
                }`}
                style={!showMnemonic ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined}
              />
            </div>

            {/* Word count indicator */}
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>Supported: 12 or 24 words (BIP-39)</span>
              <span
                className={`font-semibold ${
                  isWordCountValid ? 'text-emerald-600' : wordCount > 0 ? 'text-amber-600' : 'text-gray-400'
                }`}
              >
                {wordCount} words detected
              </span>
            </div>
          </div>

          {/* Username or FID input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">
                Farcaster Username or FID <span className="text-purple-600 font-bold">*</span>
              </label>
              <span className="text-[10px] text-gray-400">e.g. @mohammad98 or 432209</span>
            </div>
            <input
              type="text"
              value={usernameOrFid}
              onChange={(e) => {
                setUsernameOrFid(e.target.value);
                setError(null);
              }}
              placeholder="e.g. mohammad98 or 432209"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading || !mnemonic.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-4 text-xs shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Issuing Gasless Ed25519 Signer via EIP-712...</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Log In with Seed Phrase</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </button>
        </form>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1"
          >
            Continue as Guest (Read-Only)
          </button>
        )}
      </div>
    </div>
  );
}
