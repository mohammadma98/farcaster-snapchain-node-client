'use client';

import React, { useState } from 'react';
import {
  Key,
  ShieldAlert,
  Sparkles,
  Clipboard,
  Check,
  ArrowRight,
  Loader2,
  Lock,
  Terminal,
  HelpCircle,
  ChevronDown,
  X,
  Copy,
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
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingDev, setIsGeneratingDev] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDevPhrase, setGeneratedDevPhrase] = useState<string | null>(null);
  const [copiedDevMnemonic, setCopiedDevMnemonic] = useState(false);
  const [showAdvancedOverride, setShowAdvancedOverride] = useState(false);

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

  const handleCopyGenerated = async (phrase: string) => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopiedDevMnemonic(true);
      setTimeout(() => setCopiedDevMnemonic(false), 2500);
    } catch {
      // clipboard write failed
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
      const payload: {
        mnemonic: string;
        nodeUrl: string;
        usernameOrFid?: string;
      } = {
        mnemonic: mnemonic.trim(),
        nodeUrl,
      };

      // If developer specified manual override, include it
      if (usernameOrFid.trim()) {
        payload.usernameOrFid = usernameOrFid.trim();
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

      setGeneratedDevPhrase(data.mnemonic);
      setMnemonic(data.mnemonic);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize dev account');
    } finally {
      setIsGeneratingDev(false);
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

        {/* 1-Click Sandbox Test Generator (Offline Dev Mode) */}
        <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-950">Need a quick test account?</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full">
              Offline Sandbox
            </span>
          </div>
          <p className="text-xs text-purple-900/80 leading-relaxed">
            Generates a fresh 24-word cryptographic seed phrase and issues local gasless keys.
            Ideal for experimenting in the local sandbox simulator without needing an on-chain account.
          </p>

          {generatedDevPhrase ? (
            <div className="rounded-lg border border-purple-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-purple-900">Generated 24-Word Seed Phrase:</span>
                <button
                  type="button"
                  onClick={() => handleCopyGenerated(generatedDevPhrase)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-800"
                >
                  {copiedDevMnemonic ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedDevMnemonic ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] font-mono text-purple-950 break-words leading-relaxed bg-purple-50 p-2 rounded border border-purple-100">
                {generatedDevPhrase}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateDevAccount}
              disabled={isGeneratingDev || isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 text-xs shadow-sm transition-all disabled:opacity-50"
            >
              {isGeneratingDev ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating 24-Word Keys...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate Local Sandbox Account (1-Click)</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-gray-200" />
          <span className="flex-shrink mx-4 text-xs font-medium text-gray-400 uppercase">Or Import Existing Farcaster Account</span>
          <div className="flex-grow border-t border-gray-200" />
        </div>

        {/* Form: Farcaster Standard (24-word recovery phrase, auto-resolved FID) */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Mnemonic Textarea */}
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
            <p className="text-[11px] text-gray-400 leading-tight">
              FID, username, and profile are automatically detected from your custody address on the node.
            </p>
          </div>

          {/* Advanced / Manual Override (Optional Collapsible) */}
          <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
            <button
              type="button"
              onClick={() => setShowAdvancedOverride(!showAdvancedOverride)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-medium text-gray-500 hover:text-gray-800"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="h-3 w-3 text-gray-400" />
                <span>Advanced / Manual FID Override (Optional)</span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                  showAdvancedOverride ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showAdvancedOverride && (
              <div className="p-3 border-t border-gray-100 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-gray-600">
                    Custom FID or Username Override
                  </label>
                  <span className="text-[10px] text-gray-400">e.g. 432209 or @username</span>
                </div>
                <input
                  type="text"
                  value={usernameOrFid}
                  onChange={(e) => {
                    setUsernameOrFid(e.target.value);
                    setError(null);
                  }}
                  placeholder="Leave empty for 100% automatic resolution"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 focus:bg-white focus:border-purple-500 outline-none transition-all font-mono"
                />
                <p className="text-[10px] text-gray-400">
                  Only needed if testing on private nodes where automatic on-chain resolution is disabled.
                </p>
              </div>
            )}
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
                <span>Detecting FID & Issuing Gasless Signer via EIP-712...</span>
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