import React from 'react';

interface KevinMarkProps {
  className?: string;
}

export const KevinMark: React.FC<KevinMarkProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="8"
        className="fill-zinc-900 dark:fill-zinc-100"
      />
      <path
        d="M11.5 9.5V22.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="text-zinc-50 dark:text-zinc-950"
      />
      <path
        d="M20.5 9.5L13.25 16L20.75 22.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-400 dark:text-blue-600"
      />
    </svg>
  );
};
