'use client';

import React, { useState } from 'react';
import {
  Key,
  ShieldAlert,
  Clipboard,
  ArrowRight,
  Loader2,
  Lock,
  X,
} from 'lucide-react';
import { UserSession } from '@/lib/farcaster/types';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
  onCancel?: () => void;
  nodeUrl: string;
}

export function LoginPage({ onLoginSuccess, onCancel, nodeUrl }: LoginPageProps) {
  const [mnemonic, setMnemonic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Word count detection
  const words = mnemonic.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  // Farcaster recovery phrases are 24 words standard (12 words supported for legacy/custom)
  const isWordCountValid = wordCount === 24 || wordCount === 12;

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
      setError('Please enter your 24-word Farcaster recovery phrase.');
      return;
    }
    if (!isWordCountValid) {
      setError(`Detected ${wordCount} words. Farcaster recovery phrases require 24 words (Warpcast standard).`);
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

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden text-gray-900 transition-all flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[88vh]">
      {/* Header Banner (Sticky/Shrink-0) */}
      <div className="shrink-0 bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 p-5 sm:p-6 text-white text-center relative">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 sm:hidden p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md mb-2.5 border border-white/20 shadow-inner">
          <Key className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Log In to Farcaster Client</h2>
        <p className="text-xs text-purple-100 mt-1">
          Direct cryptographic connection to your Snapchain Read Node
        </p>
      </div>

      {/* Scrollable Body Container */}
      <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 overscroll-contain">
        {/* Balaji Cast 3 Directive Security Warning */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 sm:p-4 flex gap-3 text-amber-900">
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

        {/* Form: 100% Pure Farcaster Standard (24-word recovery phrase, auto-detected on-chain FID) */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">
                24-Word Recovery Phrase (Farcaster Mnemonic)
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
                {mnemonic && (
                  <button
                    type="button"
                    onClick={() => setMnemonic('')}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={mnemonic}
                onChange={(e) => {
                  setMnemonic(e.target.value);
                  setError(null);
                }}
                placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24"
                rows={3}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                className={`w-full rounded-xl border p-3 text-xs font-mono transition-all resize-none outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 ${
                  wordCount > 0 && !isWordCountValid
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-gray-200 bg-gray-50 focus:bg-white'
                }`}
              />
            </div>

            {/* Word count and Auto-detection indicator */}
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>Standard: 24 words (Warpcast / BIP-39)</span>
              <span
                className={`font-semibold ${
                  wordCount === 24
                    ? 'text-emerald-600'
                    : wordCount === 12
                    ? 'text-indigo-600'
                    : wordCount > 0
                    ? 'text-amber-600'
                    : 'text-gray-400'
                }`}
              >
                {wordCount} words {wordCount === 24 ? '(Valid 24-Word Standard)' : wordCount === 12 ? '(12-Word Legacy)' : 'detected'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              Your FID, custody address, and gasless App Key are automatically resolved and authorized via EIP-712.
            </p>
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
                <span>Detecting FID & Authorizing Gasless Signer via EIP-712...</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Log In with Recovery Phrase</span>
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
