import React, { useMemo, useState } from 'react';
import {
  Check,
  MessageSquarePlus,
  Moon,
  Pencil,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type { Conversation } from '../types';
import { KevinMark } from './KevinMark';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  isOpenMobile: boolean;
  isDark: boolean;
  onCloseMobile: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggleTheme: () => void;
  onOpenInstructions: () => void;
}

function getDateBucket(timestamp: number): string {
  const now = new Date();
  const target = new Date(timestamp);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfWeek = startOfToday - 6 * 86400000;

  if (target.getTime() >= startOfToday) return 'Today';
  if (target.getTime() >= startOfYesterday) return 'Yesterday';
  if (target.getTime() >= startOfWeek) return 'Previous 7 days';
  return 'Older';
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  isOpenMobile,
  isDark,
  onCloseMobile,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onToggleTheme,
  onOpenInstructions,
}) => {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Conversation[]>();
    for (const conv of filtered) {
      const bucket = getDateBucket(conv.updatedAt);
      const list = groups.get(bucket) ?? [];
      list.push(conv);
      groups.set(bucket, list);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditValue(conv.title);
  };

  const commitRename = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onRename(id, trimmed);
    }
    setEditingId(null);
  };

  const sidebarContent = (
    <aside className="flex h-full w-[272px] flex-col border-r border-zinc-200 bg-zinc-50/90 dark:border-zinc-800/90 dark:bg-zinc-950">
      {/* Brand + New chat */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <KevinMark className="h-6 w-6 shrink-0" />
          <span className="font-display text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
            Kevin AI
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
            title="New chat (⌘K)"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search conversations */}
      <div className="px-3 pb-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads..."
            aria-label="Search conversations"
            className="h-8 w-full rounded-lg border border-zinc-200/80 bg-white pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
          />
        </div>
      </div>

      {/* Conversation history */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-5">
        {grouped.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
            {query ? 'No matching threads' : 'No saved threads yet'}
          </div>
        ) : (
          grouped.map(([label, items]) => (
            <div key={label}>
              <div className="px-2 pb-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                {label}
              </div>
              <ul className="space-y-0.5">
                {items.map((conv) => {
                  const isActive = conv.id === activeId;
                  const isEditing = editingId === conv.id;

                  return (
                    <li key={conv.id}>
                      <div
                        className={`group flex items-center justify-between gap-1 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                          isActive
                            ? 'bg-zinc-200/70 font-medium text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-100'
                            : 'text-zinc-600 hover:bg-zinc-200/40 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex w-full items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename(conv.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              onBlur={() => commitRename(conv.id)}
                              className="w-full rounded bg-white px-1.5 py-0.5 text-[13px] text-zinc-900 outline-none ring-1 ring-blue-600 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                commitRename(conv.id);
                              }}
                              className="p-1 text-emerald-600 dark:text-emerald-400"
                              aria-label="Save title"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onSelect(conv.id);
                                onCloseMobile();
                              }}
                              className="flex-1 truncate text-left focus-visible:outline-none"
                            >
                              {conv.title}
                            </button>

                            <div
                              className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
                                isActive
                                  ? 'opacity-100'
                                  : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={(e) => startRename(conv, e)}
                                className="rounded p-1 text-zinc-400 hover:bg-zinc-300/60 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                                aria-label={`Rename ${conv.title}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(conv.id);
                                }}
                                className="rounded p-1 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                                aria-label={`Delete ${conv.title}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* Bottom workspace controls */}
      <div className="border-t border-zinc-200/80 p-3 space-y-1 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={() => {
            onOpenInstructions();
            onCloseMobile();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200/50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Instructions</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-200/50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          {isDark ? (
            <>
              <Sun className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Light mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Dark mode</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <div className="hidden lg:block h-full shrink-0">{sidebarContent}</div>

      {/* Mobile slide-over drawer */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 flex lg:hidden bg-zinc-950/40 backdrop-blur-[1px]"
          onClick={onCloseMobile}
        >
          <div className="h-full" onClick={(e) => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
