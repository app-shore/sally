'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useSallyStore } from '../store';
import { SallyMessage } from './SallyMessage';
import { SallySuggestions } from './SallySuggestions';
import { SallyInput } from './SallyInput';

export function SallyChat() {
  const { messages, orbState, userMode, sendMessage } = useSallyStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showSuggestions = messages.length <= 1;

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
      {showSuggestions && (
        <SallySuggestions
          mode={userMode}
          onSelect={(text) => sendMessage(text, 'text')}
        />
      )}

      {/* Input */}
      <SallyInput />
    </div>
  );
}
