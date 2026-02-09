'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useSallyStore } from '../store';
import { SallyMessage } from './SallyMessage';
import { SallySuggestions } from './SallySuggestions';
import { SallyInput } from './SallyInput';

export function SallyChat() {
  const { messages, orbState, userMode, sendMessage } = useSallyStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {messages.map(message => (
            <SallyMessage key={message.id} message={message} />
          ))}

          {/* Thinking indicator */}
          <AnimatePresence>
            {orbState === 'thinking' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="bg-card border border-border rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Suggestions */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <SallySuggestions
              mode={userMode}
              onSelect={(text) => {
                sendMessage(text, 'text');
                setShowSuggestions(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input with suggestions toggle */}
      <div className="border-t border-border">
        <div className="flex items-center px-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSuggestions(prev => !prev)}
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {showSuggestions ? 'Hide suggestions' : 'Suggestions'}
          </Button>
        </div>
        <SallyInput />
      </div>
    </div>
  );
}
