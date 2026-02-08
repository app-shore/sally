'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { useSallyStore } from '../store';
import { SallyOrb } from './SallyOrb';
import { SallyChat } from './SallyChat';
import { useSpeechSynthesis } from '../voice/use-speech-synthesis';
import { useEffect, useRef } from 'react';

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
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Strip container */}
      <div className="fixed right-0 top-0 h-full z-50 flex">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            /* Expanded strip */
            <motion.div
              key="expanded"
              initial={{ width: 48, opacity: 0.5 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 48, opacity: 0.5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="h-full bg-background border-l border-border flex flex-col w-full max-w-[100vw] sm:max-w-[360px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
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
                      className="h-7 w-7"
                      aria-label={isTTSEnabled ? 'Disable voice readback' : 'Enable voice readback'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

                  {/* Collapse button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={collapseStrip}
                    className="h-7 w-7"
                    aria-label="Collapse Sally"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Chat */}
              <SallyChat />
            </motion.div>
          ) : (
            /* Collapsed strip — just the orb */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-12 flex flex-col items-center pt-4 bg-background border-l border-border"
            >
              <SallyOrb state={orbState} size="sm" onClick={expandStrip} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
