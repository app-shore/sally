'use client';

import { motion } from 'framer-motion';
import type { UserMode } from '../engine/types';
import { PROSPECT_SUGGESTIONS, DISPATCHER_SUGGESTIONS, DRIVER_SUGGESTIONS } from '../engine/mock-data';

interface SallySuggestionsProps {
  mode: UserMode;
  onSelect: (text: string) => void;
}

function getSuggestions(mode: UserMode): string[] {
  switch (mode) {
    case 'prospect': return PROSPECT_SUGGESTIONS;
    case 'dispatcher': return DISPATCHER_SUGGESTIONS;
    case 'driver': return DRIVER_SUGGESTIONS;
  }
}

function SuggestionIcon({ text }: { text: string }) {
  const t = text.toLowerCase();

  // Alert / warning
  if (t.includes('alert') || t.includes('warning')) {
    return (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M6 1L10.5 9H1.5L6 1Z" /><path d="M6 4.5V6.5" /><circle cx="6" cy="8" r="0.3" fill="currentColor" />
      </svg>
    );
  }
  // Fleet / status
  if (t.includes('fleet') || t.includes('status') || t.includes('overview')) {
    return (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M2 10V6M6 10V2M10 10V4" />
      </svg>
    );
  }
  // Driver / find
  if (t.includes('driver') || t.includes('find')) {
    return (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="6" cy="4" r="2" /><path d="M3 11V9.5C3 8.67 3.67 8 4.5 8H7.5C8.33 8 9 8.67 9 9.5V11" />
      </svg>
    );
  }
  // Route / ETA / map
  if (t.includes('route') || t.includes('eta') || t.includes('map')) {
    return (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M6 10.5C6 10.5 10 7.5 10 5C10 2.79 8.21 1 6 1C3.79 1 2 2.79 2 5C2 7.5 6 10.5 6 10.5Z" /><circle cx="6" cy="5" r="1" />
      </svg>
    );
  }
  // HOS / break / rest
  if (t.includes('break') || t.includes('hos') || t.includes('rest') || t.includes('hours')) {
    return (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="6" cy="6" r="4.5" /><path d="M6 3.5V6L7.5 7.5" />
      </svg>
    );
  }
  // Delay / report
  if (t.includes('delay') || t.includes('report')) {
    return (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M1 11h10M3 8l3-6 3 6" />
      </svg>
    );
  }
  // Default: sparkle
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 1L7 5L11 6L7 7L6 11L5 7L1 6L5 5L6 1Z" />
    </svg>
  );
}

export function SallySuggestions({ mode, onSelect }: SallySuggestionsProps) {
  const suggestions = getSuggestions(mode);

  return (
    <div
      className="overflow-x-auto px-4 py-3"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      <div className="flex gap-2 min-w-max">
        {suggestions.map((text, i) => (
          <motion.button
            key={text}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => onSelect(text)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/40 rounded-xl text-xs text-foreground whitespace-nowrap shrink-0 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-colors"
          >
            <span className="text-muted-foreground">
              <SuggestionIcon text={text} />
            </span>
            {text}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
