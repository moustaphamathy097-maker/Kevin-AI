import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  Menu,
  MessageSquarePlus,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  Attachment,
  ChatMessage,
  Conversation,
  FocusPreset,
  GroundingSource,
  ReasoningMode,
} from './types';
import { InstructionsModal } from './components/InstructionsModal';
import { KevinMark } from './components/KevinMark';
import { MessageItem } from './components/MessageItem';
import { PromptComposer } from './components/PromptComposer';
import { Sidebar } from './components/Sidebar';

const STORAGE_KEY = 'kevin_ai_conversations_v1';
const THEME_KEY = 'kevin_ai_theme_v1';

const STARTER_PROMPTS: { title: string; subtitle: string; prompt: string }[] = [
  {
    title: 'Architecture review',
    subtitle: 'Compare trade-offs and spot bottlenecks in a technical design.',
    prompt:
      'Help me design a resilient, low-latency notification pipeline. Outline the core components, queue semantics, and failure recovery trade-offs.',
  },
  {
    title: 'Research synthesis',
    subtitle: 'Structure complex topics into clear comparisons and takeaways.',
    prompt:
      'Compare SQLite, PostgreSQL, and DuckDB for an analytics-heavy web product. Break down concurrency, indexing, and operational complexity.',
  },
  {
    title: 'Draft and refine',
    subtitle: 'Turn rough notes into clear, persuasive memos or documentation.',
    prompt:
      'Help me write a crisp 1-page engineering RFC template that forces clear problem framing, non-goals, and measurable rollout criteria.',
  },
  {
    title: 'Debug and refactor',
    subtitle: 'Untangle tricky edge cases, race conditions, or TypeScript types.',
    prompt:
      'Walk me through common async race conditions in React data fetching and show a clean pattern using AbortController and state cleanup.',
  },
];

function createConversation(): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: 'New conversation',
    messages: [],
    createdAt: now,
    updatedAt: now,
    preset: 'general',
    customInstructions: '',
  };
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createConversation()];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createConversation()];
    }
    return parsed;
  } catch {
    return [createConversation()];
  }
}

function getInitialTheme(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  } catch {
    return false;
  }
}

function isTextFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true;
  const textExts = [
    '.txt',
    '.md',
    '.csv',
    '.json',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.css',
    '.html',
    '.xml',
    '.yaml',
    '.yml',
    '.sql',
  ];
  return textExts.some((ext) => file.name.toLowerCase().endsWith(ext));
}

async function readFileAsAttachment(file: File): Promise<Attachment | null> {
  if (file.size > 10 * 1024 * 1024) {
    return null;
  }

  if (file.type.startsWith('image/')) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const base64 = dataUrl.split(',')[1] || '';
    return {
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: file.type,
      size: file.size,
      data: base64,
      kind: 'image',
    };
  }

  if (isTextFile(file)) {
    const text = await file.text();
    return {
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: file.type || 'text/plain',
      size: file.size,
      data: text.slice(0, 100_000),
      kind: 'text',
    };
  }

  if (file.type === 'application/pdf') {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const base64 = dataUrl.split(',')[1] || '';
    return {
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: file.type,
      size: file.size,
      data: base64,
      kind: 'document',
    };
  }

  return null;
}

const PRESET_LABEL: Record<FocusPreset, string> = {
  general: 'General',
  engineering: 'Engineering',
  editorial: 'Editorial',
  research: 'Research',
};

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string>(() => conversations[0]?.id ?? '');
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mode, setMode] = useState<ReasoningMode>('balanced');
  const [webSearch, setWebSearch] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(getInitialTheme);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId]
  );

  useEffect(() => {
    if (!activeConversation && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [activeConversation, conversations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // Ignore quota errors on very large image histories
    }
  }, [conversations]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 120;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottom(!nearBottom && el.scrollHeight > el.clientHeight + 200);
  };

  const handleNewChat = useCallback(() => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    const existingEmpty = conversations.find((c) => c.messages.length === 0);
    if (existingEmpty) {
      setActiveId(existingEmpty.id);
      setInput('');
      setAttachments([]);
      return;
    }
    const fresh = createConversation();
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setInput('');
    setAttachments([]);
  }, [conversations, isStreaming]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNewChat]);

  const handleAddAttachments = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, Math.max(0, 4 - attachments.length));
    if (list.length === 0) {
      setAttachmentNotice('Up to 4 attachments can be included per message.');
      setTimeout(() => setAttachmentNotice(null), 3500);
      return;
    }

    const added: Attachment[] = [];
    let skipped = false;
    for (const file of list) {
      const parsed = await readFileAsAttachment(file);
      if (parsed) {
        added.push(parsed);
      } else {
        skipped = true;
      }
    }

    if (skipped) {
      setAttachmentNotice('Some files were skipped (supported: images, PDF, or text under 10 MB).');
      setTimeout(() => setAttachmentNotice(null), 4000);
    }

    if (added.length > 0) {
      setAttachments((prev) => [...prev, ...added]);
    }
  };

  const autoGenerateTitle = async (convId: string, firstPrompt: string) => {
    try {
      const res = await fetch('/api/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: firstPrompt }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { title?: string };
      if (data.title) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: data.title! } : c))
        );
      }
    } catch {
      // Keep fallback title
    }
  };

  const streamAssistantReply = async (
    convId: string,
    historyForApi: ChatMessage[],
    assistantMsgId: string,
    preset: FocusPreset,
    customInstructions: string,
    shouldAutoTitle: boolean,
    firstPromptText: string
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);
    isNearBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom('smooth'));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          webSearch,
          preset,
          customInstructions,
          messages: historyForApi.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        let errText = 'Unable to connect to Kevin AI.';
        try {
          const errJson = (await response.json()) as { error?: string };
          if (errJson.error) errText = errJson.error;
        } catch {
          // Use fallback
        }
        throw new Error(errText);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          const lines = rawEvent.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr += line.slice(5).trim();
            }
          }

          if (!dataStr) continue;

          const payload = JSON.parse(dataStr) as {
            text?: string;
            sources?: GroundingSource[];
            message?: string;
          };

          if (eventType === 'chunk' && payload.text) {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== convId) return c;
                return {
                  ...c,
                  updatedAt: Date.now(),
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: m.content + payload.text } : m
                  ),
                };
              })
            );
            if (isNearBottomRef.current) {
              requestAnimationFrame(() => scrollToBottom('auto'));
            }
          } else if (eventType === 'sources' && payload.sources) {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== convId) return c;
                return {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, sources: payload.sources } : m
                  ),
                };
              })
            );
          } else if (eventType === 'error') {
            throw new Error(payload.message || 'An error occurred while generating a response.');
          }
        }
      }

      if (shouldAutoTitle && firstPromptText.trim()) {
        void autoGenerateTitle(convId, firstPromptText);
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Something went wrong while generating a response.';
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, content: message, isError: true } : m
            ),
          };
        })
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async (overridePrompt?: string) => {
    if (!activeConversation || isStreaming) return;
    const text = (overridePrompt ?? input).trim();
    const currentAttachments = overridePrompt ? [] : attachments;

    if (!text && currentAttachments.length === 0) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      createdAt: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      mode,
      webSearch,
    };

    const isFirstTurn = activeConversation.messages.length === 0;
    const nextHistory = [...activeConversation.messages, userMsg];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              title: isFirstTurn ? text.slice(0, 42) || 'Image analysis' : c.title,
              updatedAt: Date.now(),
              messages: [...nextHistory, assistantMsg],
            }
          : c
      )
    );

    if (!overridePrompt) {
      setInput('');
      setAttachments([]);
    }

    await streamAssistantReply(
      activeConversation.id,
      nextHistory,
      assistantMsg.id,
      activeConversation.preset,
      activeConversation.customInstructions,
      isFirstTurn,
      text
    );
  };

  const handleEditUserMessage = async (messageId: string, newContent: string) => {
    if (!activeConversation || isStreaming) return;
    const idx = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    const editedUserMsg: ChatMessage = {
      ...activeConversation.messages[idx],
      content: newContent,
      createdAt: Date.now(),
    };

    const truncatedHistory = [...activeConversation.messages.slice(0, idx), editedUserMsg];
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      mode,
      webSearch,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              updatedAt: Date.now(),
              messages: [...truncatedHistory, assistantMsg],
            }
          : c
      )
    );

    await streamAssistantReply(
      activeConversation.id,
      truncatedHistory,
      assistantMsg.id,
      activeConversation.preset,
      activeConversation.customInstructions,
      idx === 0,
      newContent
    );
  };

  const handleRegenerate = async (assistantMessageId: string) => {
    if (!activeConversation || isStreaming) return;
    const idx = activeConversation.messages.findIndex((m) => m.id === assistantMessageId);
    if (idx <= 0) return;

    const historyUpToUser = activeConversation.messages.slice(0, idx);
    const replacementAssistant: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      mode,
      webSearch,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              updatedAt: Date.now(),
              messages: [...historyUpToUser, replacementAssistant],
            }
          : c
      )
    );

    await streamAssistantReply(
      activeConversation.id,
      historyUpToUser,
      replacementAssistant.id,
      activeConversation.preset,
      activeConversation.customInstructions,
      false,
      ''
    );
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const handleRenameConversation = (id: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fresh = createConversation();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) {
        setActiveId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleSaveInstructions = (preset: FocusPreset, customInstructions: string) => {
    if (!activeConversation) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, preset, customInstructions }
          : c
      )
    );
  };

  const lastAssistantId = useMemo(() => {
    if (!activeConversation) return null;
    for (let i = activeConversation.messages.length - 1; i >= 0; i--) {
      if (activeConversation.messages[i].role === 'assistant') {
        return activeConversation.messages[i].id;
      }
    }
    return null;
  }, [activeConversation]);

  const hasCustomInstructions =
    activeConversation &&
    (activeConversation.preset !== 'general' ||
      activeConversation.customInstructions.trim().length > 0);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Sidebar
        conversations={conversations}
        activeId={activeConversation?.id ?? ''}
        isOpenMobile={isMobileSidebarOpen}
        isDark={isDark}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSelect={(id) => {
          if (isStreaming) {
            abortControllerRef.current?.abort();
            setIsStreaming(false);
          }
          setActiveId(id);
        }}
        onNewChat={handleNewChat}
        onRename={handleRenameConversation}
        onDelete={handleDeleteConversation}
        onToggleTheme={() => setIsDark((d) => !d)}
        onOpenInstructions={() => setIsInstructionsOpen(true)}
      />

      {/* Main Workspace */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200/80 px-4 sm:px-6 dark:border-zinc-800/80">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              aria-label="Open conversations"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {activeConversation?.title || 'New conversation'}
              </h1>
              {hasCustomInstructions && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap shrink-0">
                    {PRESET_LABEL[activeConversation.preset]}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsInstructionsOpen(true)}
              className="hidden sm:inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Instructions</span>
            </button>

            <button
              type="button"
              onClick={handleNewChat}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 whitespace-nowrap shrink-0"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              <span>New chat</span>
            </button>
          </div>
        </header>

        {/* Scrollable Message Viewport */}
        <main
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-6"
        >
          {activeConversation && activeConversation.messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center py-12">
              <div className="mb-8">
                <div className="mb-4 inline-flex items-center gap-2.5">
                  <KevinMark className="h-8 w-8" />
                  <span className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Kevin AI
                  </span>
                </div>
                <h2
                  className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
                  style={{ textWrap: 'balance' }}
                >
                  What are we working on today?
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Ask a question, drop in code or images for review, or toggle Web search for live grounding.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => void handleSend(item.prompt)}
                    className="group rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-zinc-800/90 dark:bg-zinc-900/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <div className="font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {item.subtitle}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-8 py-8">
              {activeConversation?.messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming}
                  isLastAssistant={msg.id === lastAssistantId}
                  onEditUserMessage={handleEditUserMessage}
                  onRegenerate={handleRegenerate}
                />
              ))}
            </div>
          )}
        </main>

        {/* Scroll-to-bottom button */}
        {showScrollBottom && (
          <div className="pointer-events-none absolute bottom-32 left-0 right-0 flex justify-center">
            <button
              type="button"
              onClick={() => scrollToBottom('smooth')}
              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-md transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Scroll to latest message"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Composer Dock */}
        <footer className="shrink-0 bg-gradient-to-t from-white via-white to-white/80 px-4 pb-4 pt-2 sm:px-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950/80">
          <div className="mx-auto max-w-3xl">
            {attachmentNotice && (
              <div className="mb-2 text-xs text-amber-700 dark:text-amber-400">
                {attachmentNotice}
              </div>
            )}

            <PromptComposer
              input={input}
              attachments={attachments}
              mode={mode}
              webSearch={webSearch}
              isStreaming={isStreaming}
              onInputChange={setInput}
              onAddAttachments={handleAddAttachments}
              onRemoveAttachment={(id) =>
                setAttachments((prev) => prev.filter((a) => a.id !== id))
              }
              onModeChange={setMode}
              onWebSearchToggle={() => setWebSearch((w) => !w)}
              onSend={() => void handleSend()}
              onStop={handleStop}
            />

            <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
              Kevin AI can make mistakes. Verify critical code, facts, and citations.
            </p>
          </div>
        </footer>
      </div>

      {activeConversation && (
        <InstructionsModal
          isOpen={isInstructionsOpen}
          preset={activeConversation.preset}
          customInstructions={activeConversation.customInstructions}
          onClose={() => setIsInstructionsOpen(false)}
          onSave={handleSaveInstructions}
        />
      )}
    </div>
  );
}
