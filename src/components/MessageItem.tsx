import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import type { ChatMessage } from '../types';
import { KevinMark } from './KevinMark';
import { MarkdownMessage } from './MarkdownMessage';

interface MessageItemProps {
  message: ChatMessage;
  isStreaming: boolean;
  isLastAssistant: boolean;
  onEditUserMessage: (messageId: string, newContent: string) => void;
  onRegenerate: (assistantMessageId: string) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getHostname(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, '');
  } catch {
    return uri;
  }
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming,
  isLastAssistant,
  onEditUserMessage,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleSaveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setIsEditing(false);
    onEditUserMessage(message.id, trimmed);
  };

  if (message.role === 'user') {
    return (
      <div className="group flex flex-col items-end">
        <div className="max-w-[85%] sm:max-w-[78%]">
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap justify-end gap-2">
              {message.attachments.map((att) =>
                att.kind === 'image' ? (
                  <img
                    key={att.id}
                    src={`data:${att.mimeType};base64,${att.data}`}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="max-h-56 rounded-xl border border-zinc-200 object-cover dark:border-zinc-800"
                  />
                ) : (
                  <div
                    key={att.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="max-w-[180px] truncate font-medium">{att.name}</span>
                  </div>
                )
              )}
            </div>
          )}

          {isEditing ? (
            <div className="w-full min-w-[280px] sm:min-w-[420px] rounded-2xl border border-blue-600/50 bg-white p-3 dark:border-blue-500/50 dark:bg-zinc-900">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setDraft(message.content);
                  }
                }}
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-zinc-900 focus:outline-none dark:text-zinc-100"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDraft(message.content);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 whitespace-nowrap"
                >
                  Save & resend
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200/90 bg-zinc-100/90 px-4 py-3 text-[15px] leading-relaxed text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}

          {!isEditing && (
            <div className="mt-1.5 flex items-center justify-end gap-3 px-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <span className="text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500">
                {formatTime(message.createdAt)}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                aria-label="Copy prompt"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {!isStreaming && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(message.content);
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  aria-label="Edit prompt"
                >
                  <Pencil className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant (Kevin AI) message
  const modeLabel =
    message.mode === 'fast' ? 'Fast' : message.mode === 'deep' ? 'Deep' : 'Balanced';

  return (
    <div className="group flex items-start gap-3.5 sm:gap-4">
      <div className="mt-0.5 shrink-0">
        <KevinMark className="h-7 w-7" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-display font-semibold text-zinc-900 dark:text-zinc-100">
            Kevin
          </span>
          <span aria-hidden="true">·</span>
          <span>{modeLabel}</span>
          {message.webSearch && (
            <>
              <span aria-hidden="true">·</span>
              <span>Web search</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatTime(message.createdAt)}</span>
        </div>

        {message.isError ? (
          <div className="mt-1 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="space-y-2">
                <p>{message.content}</p>
                <button
                  type="button"
                  onClick={() => onRegenerate(message.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/50"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Try again</span>
                </button>
              </div>
            </div>
          </div>
        ) : message.content.length === 0 && isStreaming && isLastAssistant ? (
          <div className="flex items-center gap-2 py-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            <span>Thinking…</span>
          </div>
        ) : (
          <div className="relative">
            <MarkdownMessage content={message.content} />
            {isStreaming && isLastAssistant && (
              <span
                className="ml-1 inline-block h-4 w-1.5 translate-y-0.5 bg-blue-600 animate-pulse dark:bg-blue-400"
                aria-hidden="true"
              />
            )}
          </div>
        )}

        {/* Search grounding sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 border-t border-zinc-200/80 pt-3 dark:border-zinc-800/80">
            <div className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Sources
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {message.sources.map((source, idx) => (
                <a
                  key={source.uri}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                >
                  <span className="font-mono text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500">
                    [{idx + 1}]
                  </span>
                  <span className="max-w-[240px] truncate underline decoration-zinc-300 underline-offset-3 dark:decoration-zinc-700">
                    {source.title}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">
                    · {getHostname(source.uri)}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Message actions */}
        {!message.isError && (!isStreaming || !isLastAssistant) && message.content.length > 0 && (
          <div className="mt-2.5 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 whitespace-nowrap shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onRegenerate(message.id)}
              disabled={isStreaming}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Regenerate</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
