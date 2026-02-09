'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { useSallyStore } from '../store';
import { useSpeechRecognition } from '../voice/use-speech-recognition';

export function SallyInput() {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    orbState,
    isExpanded,
    isVoiceEnabled,
    interimTranscript,
    sendMessage,
    setOrbState,
    setMicActive,
    setInterimTranscript,
  } = useSallyStore();

  const { isListening, isSupported: sttSupported, transcript, interimTranscript: sttInterim, start: startSTT, stop: stopSTT } = useSpeechRecognition();

  const isThinking = orbState === 'thinking';
  const showMic = isVoiceEnabled && sttSupported;

  // Auto-focus when panel opens
  useEffect(() => {
    if (isExpanded) {
      // Small delay to let the panel animation start
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Auto-grow textarea to fit content
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  // Handle final transcript
  useEffect(() => {
    if (transcript) {
      sendMessage(transcript, 'voice');
      setMicActive(false);
    }
  }, [transcript, sendMessage, setMicActive]);

  // Sync interim transcript
  useEffect(() => {
    setInterimTranscript(sttInterim);
  }, [sttInterim, setInterimTranscript]);

  // Sync orb state with listening
  useEffect(() => {
    if (isListening) {
      setOrbState('listening');
    } else if (orbState === 'listening') {
      setOrbState('idle');
    }
  }, [isListening, orbState, setOrbState]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isThinking) return;
    sendMessage(text, 'text');
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    inputRef.current?.focus();
  }, [input, isThinking, sendMessage]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopSTT();
      setMicActive(false);
    } else {
      startSTT();
      setMicActive(true);
    }
  }, [isListening, startSTT, stopSTT, setMicActive]);

  return (
    <div className="p-3">
      {/* Frosted command bar */}
      <div className="rounded-2xl bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
        {/* Interim transcript inside the bar */}
        <AnimatePresence>
          {interimTranscript && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pt-2 text-xs text-muted-foreground italic truncate"
            >
              {interimTranscript}...
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-1 px-2 py-1.5">
          {/* Mic button */}
          {showMic && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleMicToggle}
              disabled={isThinking}
              className="shrink-0 h-9 w-9 rounded-full mb-0.5"
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                /* Animated waveform bars when listening */
                <span className="flex items-center gap-[2px]">
                  {[0, 0.1, 0.2].map((delay, i) => (
                    <motion.span
                      key={i}
                      className="w-[3px] bg-foreground rounded-full"
                      animate={{ height: ['8px', '16px', '8px'] }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut', delay }}
                    />
                  ))}
                </span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                </svg>
              )}
            </Button>
          )}

          {/* Text input — auto-grows up to 120px */}
          <Textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Ask Sally anything...'}
            className="min-h-[36px] max-h-[120px] resize-none text-sm bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 overflow-y-auto"
            disabled={isThinking || isListening}
            rows={1}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {/* Send button — rotates on hover */}
          <motion.div className="mb-0.5" whileHover={{ rotate: 45 }} transition={{ duration: 0.2 }}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
              className="shrink-0 h-9 w-9 rounded-full"
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
