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

export function SallySuggestions({ mode, onSelect }: SallySuggestionsProps) {
  const suggestions = getSuggestions(mode);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-wrap gap-2 px-4 py-3 border-t border-border"
    >
      {suggestions.map((text, i) => (
        <motion.button
          key={text}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.05 }}
          onClick={() => onSelect(text)}
          className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
        >
          {text}
        </motion.button>
      ))}
    </motion.div>
  );
}
