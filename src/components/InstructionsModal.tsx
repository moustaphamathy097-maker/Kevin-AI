import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { FocusPreset } from '../types';

interface InstructionsModalProps {
  isOpen: boolean;
  preset: FocusPreset;
  customInstructions: string;
  onClose: () => void;
  onSave: (preset: FocusPreset, customInstructions: string) => void;
}

const PRESETS: { id: FocusPreset; label: string; description: string }[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Balanced, clear assistance across writing, analysis, and problem-solving.',
  },
  {
    id: 'engineering',
    label: 'Engineering',
    description: 'System design, clean production code, edge cases, and technical trade-offs.',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Crisp prose, structural clarity, tone refinement, and line editing.',
  },
  {
    id: 'research',
    label: 'Research',
    description: 'Structured synthesis, explicit assumptions, comparisons, and analytical rigor.',
  },
];

export const InstructionsModal: React.FC<InstructionsModalProps> = ({
  isOpen,
  preset,
  customInstructions,
  onClose,
  onSave,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<FocusPreset>(preset);
  const [instructions, setInstructions] = useState(customInstructions);

  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(preset);
      setInstructions(customInstructions);
    }
  }, [isOpen, preset, customInstructions]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedPreset, instructions.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="instructions-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="instructions-modal-title"
              className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              Conversation Instructions
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Choose how Kevin AI approaches responses in this thread.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close instructions"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Focus mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESETS.map((item) => {
                const active = selectedPreset === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPreset(item.id)}
                    className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      active
                        ? 'border-blue-600 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/30'
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.label}
                    </div>
                    <div className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {item.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="custom-instructions-input"
              className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2"
            >
              Custom preferences (optional)
            </label>
            <textarea
              id="custom-instructions-input"
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Prefer TypeScript over JavaScript, keep answers under 200 words, or format outputs as executive summaries."
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-950"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 whitespace-nowrap shrink-0"
            >
              Save instructions
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
