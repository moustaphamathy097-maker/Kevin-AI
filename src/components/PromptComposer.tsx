import React, { useRef, useState } from 'react';
import {
  ArrowUp,
  FileText,
  Globe,
  Paperclip,
  Square,
  X,
} from 'lucide-react';
import type { Attachment, ReasoningMode } from '../types';

interface PromptComposerProps {
  input: string;
  attachments: Attachment[];
  mode: ReasoningMode;
  webSearch: boolean;
  isStreaming: boolean;
  onInputChange: (val: string) => void;
  onAddAttachments: (files: FileList | File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onModeChange: (mode: ReasoningMode) => void;
  onWebSearchToggle: () => void;
  onSend: () => void;
  onStop: () => void;
}

const MODES: { id: ReasoningMode; label: string }[] = [
  { id: 'fast', label: 'Fast' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'deep', label: 'Deep' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PromptComposer: React.FC<PromptComposerProps> = ({
  input,
  attachments,
  mode,
  webSearch,
  isStreaming,
  onInputChange,
  onAddAttachments,
  onRemoveAttachment,
  onModeChange,
  onWebSearchToggle,
  onSend,
  onStop,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isStreaming;

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    adjustHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSend();
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.files;
    if (items && items.length > 0) {
      e.preventDefault();
      onAddAttachments(items);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      onAddAttachments(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative rounded-2xl border bg-white transition-colors shadow-xs dark:bg-zinc-900 ${
        isDragging
          ? 'border-blue-600 ring-2 ring-blue-600/20 dark:border-blue-500'
          : 'border-zinc-200 focus-within:border-zinc-400 dark:border-zinc-800 dark:focus-within:border-zinc-600'
      }`}
    >
      {/* Attachments preview strip */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-zinc-100 px-3.5 pt-3 pb-2.5 dark:border-zinc-800/80">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 pr-7 dark:border-zinc-800 dark:bg-zinc-950"
            >
              {att.kind === 'image' ? (
                <img
                  src={`data:${att.mimeType};base64,${att.data}`}
                  alt={att.name}
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <FileText className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="max-w-[140px] truncate text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  {att.name}
                </div>
                <div className="text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500">
                  {formatBytes(att.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveAttachment(att.id)}
                className="absolute right-1.5 top-1.5 rounded-md p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label={`Remove ${att.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Text input */}
      <div className="px-4 pt-3.5 pb-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Message Kevin AI…"
          aria-label="Message Kevin AI"
          className="max-h-[220px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </div>

      {/* Bottom toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.csv,.json,.ts,.tsx,.js,.jsx,.py,.css,.html"
            onChange={(e) => {
              if (e.target.files) {
                onAddAttachments(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 whitespace-nowrap shrink-0"
            title="Attach image, PDF, or text file"
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Attach</span>
          </button>

          <button
            type="button"
            onClick={onWebSearchToggle}
            aria-pressed={webSearch}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 ${
              webSearch
                ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/25 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-500/30'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
            title="Ground responses with Google Search"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Web search</span>
          </button>

          <div
            className="flex items-center rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/80"
            role="group"
            aria-label="Reasoning depth"
          >
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModeChange(m.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-950 dark:text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSend();
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                }
              }}
              disabled={!canSend}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:bg-zinc-200 disabled:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
              aria-label="Send message"
              title="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
