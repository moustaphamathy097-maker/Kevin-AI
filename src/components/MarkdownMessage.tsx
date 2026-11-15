import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored if clipboard denied
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950 text-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/80 px-3.5 py-2 text-xs text-zinc-400">
        <span className="font-mono tracking-tight">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 whitespace-nowrap shrink-0"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono">
        <code>{value}</code>
      </pre>
    </div>
  );
};

interface MarkdownMessageProps {
  content: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  return (
    <div className="kevin-prose text-zinc-800 dark:text-zinc-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-3 hover:decoration-blue-600 dark:text-blue-400 dark:decoration-blue-400/30 dark:hover:decoration-blue-400"
              {...props}
            >
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-([\w-]+)/.exec(className || '');
            const text = String(children).replace(/\n$/, '');
            const isBlock = Boolean(match) || text.includes('\n');

            if (isBlock) {
              return <CodeBlock language={match?.[1] || 'text'} value={text} />;
            }

            return (
              <code
                className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[0.875em] font-mono text-zinc-900 dark:bg-zinc-800/90 dark:text-zinc-100"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
