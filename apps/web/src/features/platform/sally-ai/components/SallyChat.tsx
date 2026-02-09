'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { useSallyStore } from '../store';
import { SallyMessage } from './SallyMessage';
import { SallySuggestions } from './SallySuggestions';
import { SallyInput } from './SallyInput';
import { SallyOrb } from './SallyOrb';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function SallyChat() {
  const {
    messages,
    orbState,
    userMode,
    pastConversations,
    isViewingHistory,
    viewedMessages,
    isLoadingHistory,
    sendMessage,
    clearSession,
    expandStrip,
    loadHistory,
    viewConversation,
    clearView,
  } = useSallyStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, viewedMessages]);

  // Re-show suggestions when conversation is cleared (new session)
  useEffect(() => {
    if (messages.length <= 1) {
      setShowSuggestions(true);
    }
  }, [messages.length]);

  // Load history on mount for non-prospect modes
  useEffect(() => {
    if (userMode !== 'prospect') {
      loadHistory();
    }
  }, [userMode, loadHistory]);

  const hasOnlyGreeting = messages.length <= 1;
  const displayMessages = isViewingHistory ? viewedMessages : messages;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages area with subtle dot grid */}
      <ScrollArea className="flex-1">
        <div className="relative">
          {/* Command center dot grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          <div className="relative p-4 space-y-4">
            {/* View-only banner */}
            {isViewingHistory && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearView}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                  Back
                </Button>
                <span className="text-[10px] text-muted-foreground">View-only</span>
              </motion.div>
            )}

            {/* Empty state: centered orb with "How can I help?" */}
            {!isViewingHistory && hasOnlyGreeting && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center py-10"
              >
                <div className="mb-4">
                  <SallyOrb state="idle" size="lg" />
                </div>
                <p className="text-sm text-muted-foreground">How can I help?</p>
              </motion.div>
            )}

            {/* Recent conversations (empty state, non-prospect) */}
            {!isViewingHistory && hasOnlyGreeting && userMode !== 'prospect' && pastConversations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 px-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Recent</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-1">
                  {pastConversations.slice(0, 5).map((conv, i) => (
                    <motion.div
                      key={conv.conversationId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => viewConversation(conv.conversationId)}
                        className="w-full flex items-center justify-between px-3 py-2 h-auto rounded-lg text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">
                            {conv.title || 'Untitled conversation'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {conv.messageCount} messages
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Loading history spinner */}
            {isLoadingHistory && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-[3px] h-6">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-[3px] bg-muted-foreground rounded-full"
                      animate={{ height: ['6px', '14px', '6px'] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {displayMessages.map(message => (
              <SallyMessage key={message.id} message={message} />
            ))}

            {/* Thinking: animated waveform */}
            <AnimatePresence>
              {!isViewingHistory && orbState === 'thinking' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="pl-4 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-gray-300 dark:bg-gray-700" />
                    <div className="flex items-center gap-[3px] h-6">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-[3px] bg-muted-foreground rounded-full"
                          animate={{ height: ['6px', '18px', '6px'] }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline "start new" — appears after a few exchanges */}
            {!isViewingHistory && messages.length >= 4 && orbState !== 'thinking' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="flex justify-center pt-2"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearSession();
                    expandStrip();
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground py-1 px-3 rounded-full h-auto"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  Start new conversation
                </Button>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Suggestions — hidden when viewing history */}
      {!isViewingHistory && (
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border"
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
      )}

      {/* Input area — hidden when viewing history */}
      {!isViewingHistory && (
        <div className="border-t border-border">
          <div className="flex items-center justify-end px-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(prev => !prev)}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
            >
              {/* Sparkle icon */}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 1L7 5L11 6L7 7L6 11L5 7L1 6L5 5L6 1Z" />
              </svg>
              {showSuggestions ? 'Hide quick actions' : 'Quick actions'}
            </Button>
          </div>
          <SallyInput />
        </div>
      )}
    </div>
  );
}
