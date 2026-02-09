'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { useSallyStore } from '../store';
import { SallyOrb } from './SallyOrb';
import { SallyChat } from './SallyChat';
import { useSpeechSynthesis } from '../voice/use-speech-synthesis';
import { useEffect, useRef, useCallback } from 'react';

export function SallyStrip() {
  const {
    isExpanded,
    orbState,
    userMode,
    isTTSEnabled,
    messages,
    expandStrip,
    collapseStrip,
    toggleTTS,
    setOrbState,
  } = useSallyStore();

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();
  const lastMessageRef = useRef<string | null>(null);

  // TTS: Speak new assistant messages
  useEffect(() => {
    if (!isTTSEnabled || !ttsSupported) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant') return;
    if (lastMsg.id === lastMessageRef.current) return;

    lastMessageRef.current = lastMsg.id;
    const textToSpeak = lastMsg.speakText || lastMsg.content;
    speak(textToSpeak);
  }, [messages, isTTSEnabled, ttsSupported, speak]);

  // Sync orb state with TTS
  useEffect(() => {
    if (isSpeaking) {
      setOrbState('speaking');
    } else if (orbState === 'speaking') {
      setOrbState('idle');
    }
  }, [isSpeaking, setOrbState, orbState]);

  // Keyboard shortcut: S to toggle (when not typing in an input)
  const handleToggle = useCallback(() => {
    if (isExpanded) {
      collapseStrip();
    } else {
      expandStrip();
    }
  }, [isExpanded, collapseStrip, expandStrip]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in inputs, textareas, or contenteditable
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = (e.target as HTMLElement).isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) return;

      // Escape closes the panel
      if (e.key === 'Escape' && isExpanded) {
        collapseStrip();
        return;
      }

      // S key toggles (no modifiers)
      if (e.key === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleToggle();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExpanded, collapseStrip, handleToggle]);

  const showTTSToggle = userMode !== 'prospect' && ttsSupported;

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={collapseStrip}
            className="fixed inset-0 bg-black/30 z-40 sm:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isExpanded ? (
          /* Expanded panel — pushes content on desktop, overlays on mobile */
          <motion.div
            key="expanded"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full z-50 w-full sm:w-[380px] bg-background border-l border-border flex flex-col"
          >
            {/* Header: left = identity + new chat, right = utility + dismiss */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <SallyOrb state={orbState} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-foreground">SALLY</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{userMode} mode</p>
                </div>

              </div>
              <div className="flex items-center gap-1">
                {/* TTS toggle */}
                {showTTSToggle && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      toggleTTS();
                      if (isSpeaking) stopSpeaking();
                    }}
                    className="h-8 w-8"
                    aria-label={isTTSEnabled ? 'Disable voice readback' : 'Enable voice readback'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {isTTSEnabled ? (
                        <>
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </>
                      ) : (
                        <>
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </>
                      )}
                    </svg>
                  </Button>
                )}

                {/* Keyboard hint */}
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">
                  esc
                </kbd>

                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={collapseStrip}
                  className="h-8 w-8"
                  aria-label="Close Sally (Esc)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </Button>
              </div>
            </div>

            {/* Chat */}
            <SallyChat />
          </motion.div>
        ) : (
          /* Floating orb — bottom-right corner with keyboard hint */
          <motion.div
            key="collapsed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 group"
          >
            <SallyOrb state={orbState} size="lg" onClick={expandStrip} />
            {/* Keyboard shortcut badge */}
            <div className="absolute -top-1 -left-1 hidden sm:flex items-center justify-center w-5 h-5 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              S
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
