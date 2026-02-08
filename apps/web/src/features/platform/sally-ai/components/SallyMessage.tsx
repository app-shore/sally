'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/shared/components/ui/badge';
import type { ChatMessage } from '../engine/types';
import { RichCardRenderer } from './cards/RichCardRenderer';

export function SallyMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[90%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message bubble */}
        <div
          className={`rounded-lg px-3 py-2 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-foreground border border-border'
          }`}
        >
          {/* Input mode indicator for voice */}
          {isUser && message.inputMode === 'voice' && (
            <span className="text-[10px] opacity-60 block mb-0.5">
              <svg className="inline w-3 h-3 mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
              Voice
            </span>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Rich card */}
        {message.card && (
          <div className="w-full">
            <RichCardRenderer card={message.card} />
          </div>
        )}

        {/* Action result */}
        {message.action && (
          <Badge
            variant="outline"
            className={message.action.success
              ? 'text-green-600 dark:text-green-400 border-green-300 dark:border-green-700'
              : 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700'
            }
          >
            {message.action.success ? '\u2713' : '\u2717'} {message.action.message}
          </Badge>
        )}

        {/* Timestamp */}
        <p className={`text-[10px] px-1 ${isUser ? 'text-right' : 'text-left'} text-muted-foreground`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}
