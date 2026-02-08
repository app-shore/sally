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
    <div className="border-t border-border bg-background p-3 space-y-2">
      {/* Interim transcript preview */}
      <AnimatePresence>
        {interimTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-muted-foreground italic px-1"
          >
            {interimTranscript}...
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        {/* Mic button */}
        {showMic && (
          <Button
            type="button"
            variant={isListening ? 'default' : 'outline'}
            size="icon"
            onClick={handleMicToggle}
            disabled={isThinking}
            className="shrink-0 h-9 w-9"
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isListening ? (
                <rect x="6" y="6" width="12" height="12" rx="2" />
              ) : (
                <>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                </>
              )}
            </svg>
          </Button>
        )}

        {/* Text input */}
        <Textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Ask Sally anything...'}
          className="min-h-[36px] max-h-[120px] resize-none text-sm"
          disabled={isThinking || isListening}
          rows={1}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || isThinking}
          className="shrink-0 h-9 w-9"
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
