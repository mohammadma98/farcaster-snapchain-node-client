'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Image as ImageIcon,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Quote,
} from 'lucide-react';
import { FarcasterAvatar } from './FarcasterAvatar';
import { FarcasterCast } from '@/lib/farcaster/types';

export interface AttachedImage {
  id: string;
  file: File;
  previewUrl: string;
  catboxUrl?: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
}

interface ComposeCastModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl?: string;
    signerPrivateKey: string;
  } | null;
  onPublish: (
    text: string,
    embeds?: Array<{ url?: string; castId?: { fid: number; hash: string } }>
  ) => Promise<boolean>;
  quoteCast?: FarcasterCast | null;
  onClearQuote?: () => void;
  defaultNodeUrl?: string;
}

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_CHARS = 320;

export function ComposeCastModal({
  isOpen,
  onClose,
  session,
  onPublish,
  quoteCast,
  onClearQuote,
  defaultNodeUrl,
}: ComposeCastModalProps) {
  const [text, setText] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    } else {
      // Clear local states on close
      setText('');
      setErrorMessage(null);
      // Clean up object URLs
      attachedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setAttachedImages([]);
    }
  }, [isOpen]);

  // Handle single image upload to /api/upload (Catbox)
  const uploadImageFile = useCallback(async (attached: AttachedImage) => {
    try {
      const formData = new FormData();
      formData.append('file', attached.file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Upload to storage failed.');
      }

      setAttachedImages((prev) =>
        prev.map((item) =>
          item.id === attached.id
            ? { ...item, status: 'ready', catboxUrl: data.url, error: undefined }
            : item
        )
      );
    } catch (err: any) {
      setAttachedImages((prev) =>
        prev.map((item) =>
          item.id === attached.id
            ? {
                ...item,
                status: 'error',
                error: err.message || 'Failed to upload image to storage.',
              }
            : item
        )
      );
    }
  }, []);

  // Process incoming files from file picker, drag & drop, or paste
  const handleAddFiles = useCallback(
    (files: FileList | File[]) => {
      setErrorMessage(null);
      const incoming = Array.from(files).filter((file) =>
        file.type.startsWith('image/')
      );

      if (incoming.length === 0) return;

      const remainingSlots = MAX_IMAGES - attachedImages.length;
      if (remainingSlots <= 0) {
        setErrorMessage(`Maximum ${MAX_IMAGES} images allowed per cast.`);
        return;
      }

      const filesToAdd = incoming.slice(0, remainingSlots);
      if (incoming.length > remainingSlots) {
        setErrorMessage(
          `Added ${remainingSlots} image(s) (maximum ${MAX_IMAGES} images allowed).`
        );
      }

      const newEntries: AttachedImage[] = [];

      for (const file of filesToAdd) {
        if (file.size > MAX_IMAGE_BYTES) {
          setErrorMessage(`Image "${file.name}" exceeds 10 MB limit.`);
          continue;
        }

        const previewUrl = URL.createObjectURL(file);
        const entry: AttachedImage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl,
          status: 'uploading',
        };
        newEntries.push(entry);
      }

      if (newEntries.length === 0) return;

      setAttachedImages((prev) => [...prev, ...newEntries]);

      // Trigger parallel uploads
      newEntries.forEach((entry) => uploadImageFile(entry));
    },
    [attachedImages.length, uploadImageFile]
  );

  // Remove an image from the list
  const handleRemoveImage = (id: string) => {
    setAttachedImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // Retry a failed image upload
  const handleRetryUpload = (item: AttachedImage) => {
    setAttachedImages((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: 'uploading', error: undefined } : i
      )
    );
    uploadImageFile(item);
  };

  // Handle Clipboard Paste (Ctrl+V with image)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      handleAddFiles(imageFiles);
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Handle Submit
  const isAnyUploading = attachedImages.some((img) => img.status === 'uploading');
  const hasFailedUpload = attachedImages.some((img) => img.status === 'error');
  const isReadyToSubmit =
    !isPublishing &&
    !isAnyUploading &&
    !hasFailedUpload &&
    (text.trim().length > 0 || attachedImages.length > 0);

  const handleSubmit = async () => {
    if (!isReadyToSubmit) return;

    setIsPublishing(true);
    setErrorMessage(null);

    try {
      // Build embeds array
      const embeds: Array<{
        url?: string;
        castId?: { fid: number; hash: string };
      }> = [];

      // Add Quote Cast if present
      if (quoteCast) {
        embeds.push({
          castId: { fid: quoteCast.fid, hash: quoteCast.hash },
        });
      }

      // Add uploaded Catbox images
      for (const img of attachedImages) {
        if (img.catboxUrl) {
          embeds.push({ url: img.catboxUrl });
        }
      }

      const success = await onPublish(
        text.trim(),
        embeds.length > 0 ? embeds : undefined
      );

      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit cast to Snapchain node.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Keyboard shortcut: ESC to close, Ctrl+Enter to publish
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isPublishing) onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPublishing, isReadyToSubmit, text, attachedImages]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPublishing) onClose();
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border transition-all duration-200 overflow-hidden flex flex-col max-h-[90vh] ${
          isDragging ? 'border-purple-500 ring-4 ring-purple-500/20 scale-[1.01]' : 'border-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-purple-700/10 flex items-center justify-center text-purple-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {quoteCast ? 'Quote Cast' : 'New Cast'}
              </h3>
              <span className="text-[11px] text-slate-500">
                Broadcast via Snapchain Node
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isPublishing}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* User Identity Pill */}
          {session && (
            <div className="flex items-center gap-2.5">
              <FarcasterAvatar
                src={session.pfpUrl}
                alt={session.username}
                fid={session.fid}
                username={session.username}
                className="h-9 w-9 rounded-full object-cover border border-purple-200 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {session.displayName}
                </span>
                <span className="text-[11px] text-slate-500 block truncate font-mono">
                  @{session.username} • FID {session.fid}
                </span>
              </div>
            </div>
          )}

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={handlePaste}
              maxLength={MAX_CHARS}
              placeholder={
                session
                  ? `What's happening on Farcaster, @${session.username}?`
                  : 'Write your cast message...'
              }
              rows={4}
              className="w-full text-sm text-slate-900 placeholder:text-slate-400 border-none outline-none resize-none bg-transparent leading-relaxed"
            />
          </div>

          {/* Attached Images Grid (Max 3) */}
          {attachedImages.length > 0 && (
            <div
              className={`grid gap-2.5 rounded-2xl overflow-hidden p-1 bg-slate-50 border border-slate-200/80 ${
                attachedImages.length === 1
                  ? 'grid-cols-1'
                  : attachedImages.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              }`}
            >
              {attachedImages.map((img, idx) => (
                <div
                  key={img.id}
                  className="relative group rounded-xl overflow-hidden aspect-4/3 bg-slate-200 border border-slate-200/60 shadow-xs"
                >
                  <img
                    src={img.previewUrl}
                    alt={`Attachment ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Uploading Overlay */}
                  {img.status === 'uploading' && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1 p-2">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                      <span className="text-[10px] font-medium">Uploading...</span>
                    </div>
                  )}

                  {/* Error Overlay */}
                  {img.status === 'error' && (
                    <div className="absolute inset-0 bg-red-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1.5 p-2 text-center">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <span className="text-[10px] text-red-200 line-clamp-2">
                        {img.error || 'Upload error'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRetryUpload(img)}
                        className="flex items-center gap-1 text-[10px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-md font-semibold transition-colors"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-slate-900/75 hover:bg-slate-900 text-white flex items-center justify-center transition-opacity opacity-90 hover:opacity-100 shadow-md"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  {/* Image Counter Badge */}
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-900/60 text-[9px] font-mono text-white/90">
                    {idx + 1}/{attachedImages.length}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quote Cast Card Preview */}
          {quoteCast && (
            <div className="relative rounded-2xl border border-purple-200/80 bg-purple-50/40 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Quote className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-[11px] font-bold text-purple-900">
                    Quoting @{quoteCast.author?.username || 'user'}
                  </span>
                </div>
                {onClearQuote && (
                  <button
                    type="button"
                    onClick={onClearQuote}
                    className="h-5 w-5 rounded-full flex items-center justify-center text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition-colors"
                    title="Remove quote"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-700 line-clamp-2 italic">
                "{quoteCast.text}"
              </p>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer & Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleAddFiles(e.target.files);
                  e.target.value = ''; // Reset input
                }
              }}
            />

            {/* Media Upload Trigger Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPublishing || attachedImages.length >= MAX_IMAGES}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 hover:text-purple-700 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                attachedImages.length >= MAX_IMAGES
                  ? 'Maximum 3 images reached'
                  : 'Attach images (up to 3)'
              }
            >
              <ImageIcon className="h-4 w-4 text-purple-600" />
              <span>Image</span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-md">
                {attachedImages.length}/{MAX_IMAGES}
              </span>
            </button>

            <span className="text-[11px] text-slate-400 hidden sm:inline">
              or drag & drop images
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Character Counter */}
            <div className="flex items-center gap-1">
              <span
                className={`text-[11px] font-mono font-medium ${
                  text.length > 300
                    ? 'text-amber-600 font-bold'
                    : text.length >= MAX_CHARS
                    ? 'text-red-600 font-bold'
                    : 'text-slate-400'
                }`}
              >
                {text.length}/{MAX_CHARS}
              </span>
            </div>

            {/* Cast Publish Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isReadyToSubmit}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : isAnyUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Cast</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
