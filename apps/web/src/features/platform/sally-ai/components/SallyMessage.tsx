'use client';

import { motion } from 'framer-motion';
import type { ChatMessage } from '../engine/types';
import { RichCardRenderer } from './cards/RichCardRenderer';

function VoiceWaveform() {
  return (
    <span className="inline-flex items-center gap-[2px] h-3 align-middle mr-1">
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.span
          key={i}
          className="w-[2px] bg-current rounded-full"
          animate={{ height: ['5px', '11px', '5px'] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay }}
        />
      ))}
    </span>
  );
}

export function SallyMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 16 : -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Message content */}
        {isUser ? (
          /* User: frosted glass pill */
          <div className="backdrop-blur-sm bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl px-4 py-2.5">
            {message.inputMode === 'voice' && (
              <span className="text-[10px] text-muted-foreground block mb-0.5">
                <VoiceWaveform />
                voice
              </span>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{message.content}</p>
          </div>
        ) : (
          /* Sally: accent line, no bubble */
          <div className="relative pl-4">
            <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-gray-300 dark:bg-gray-700" />
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{message.content}</p>
          </div>
        )}

        {/* Rich card */}
        {message.card && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`w-full ${!isUser ? 'pl-4' : ''}`}
          >
            <RichCardRenderer card={message.card} />
          </motion.div>
        )}

        {/* Action result — inline, no badge */}
        {message.action && (
          <div className={`flex items-center gap-1.5 text-xs ${!isUser ? 'pl-4' : ''}`}>
            {message.action.success ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                <span className="text-green-600 dark:text-green-400">{message.action.message}</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                <span className="text-red-600 dark:text-red-400">{message.action.message}</span>
              </>
            )}
          </div>
        )}

        {/* Timestamp — visible on hover */}
        <p className={`text-[10px] px-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isUser ? 'text-right' : 'text-left'} ${!isUser ? 'pl-4' : ''}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}
