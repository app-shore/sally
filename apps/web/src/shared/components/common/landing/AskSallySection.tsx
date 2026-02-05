'use client';

import { ScrollReveal } from './ScrollReveal';
import { Card } from '@/shared/components/ui/card';

export function AskSallySection() {
  // Chat conversation examples - designed to look like the real chat interface
  const chatExamples = [
    {
      userMessage: "Is Route #1247 on track?",
      sallyResponse: (
        <div className="space-y-2">
          <p className="text-sm">Route #1247 is <span className="font-semibold text-green-600 dark:text-green-400">on track</span>. Here's the status:</p>
          <div className="bg-background/50 dark:bg-background/30 rounded p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progress:</span>
              <span className="font-medium">Stop 3 of 7</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current ETA:</span>
              <span className="font-medium">3:45 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planned ETA:</span>
              <span className="font-medium">3:45 PM (no delay)</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      userMessage: "Where should I take my 10-hour break?",
      sallyResponse: (
        <div className="space-y-2">
          <p className="text-sm">Based on your current route and HOS limits, I recommend:</p>
          <div className="bg-background/50 dark:bg-background/30 rounded p-3 space-y-2 text-sm">
            <div className="font-semibold">Love's Travel Stop - Exit 47</div>
            <div className="text-muted-foreground text-xs">
              • Optimal timing: 2.3 hours from now<br />
              • Keeps you compliant with 11-hour drive limit<br />
              • Back on schedule after 10-hour break
            </div>
          </div>
        </div>
      ),
    },
    {
      userMessage: "Why was Route #1832 re-planned?",
      sallyResponse: (
        <div className="space-y-2">
          <p className="text-sm">Route #1832 was automatically re-planned due to:</p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-3 space-y-2 text-sm border border-yellow-200 dark:border-yellow-800">
            <div className="font-semibold text-yellow-900 dark:text-yellow-200">⚠️ Dock delay detected</div>
            <div className="text-xs text-muted-foreground">
              • 3hr actual vs 1hr planned<br />
              • Created 0.5 hour HOS shortfall<br />
              • Rest stop added to maintain compliance
            </div>
          </div>
          <p className="text-xs text-green-700 dark:text-green-400">✓ Route optimized - zero violations</p>
        </div>
      ),
    },
  ];

  return (
    <section className="py-32 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-center mb-12">
            Ask SALLY Anything
          </h2>
          <p className="text-xl text-muted-foreground text-center max-w-3xl mx-auto mb-4">
            Natural language interface for dispatchers and drivers
          </p>
          <p className="text-center text-muted-foreground mb-20">
            Just ask in plain English - SALLY understands context and provides instant answers
          </p>
        </ScrollReveal>

        {/* Chat Interface Visual */}
        <ScrollReveal delay={0.2}>
          <Card className="max-w-4xl mx-auto overflow-hidden shadow-xl">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200 px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-black flex items-center justify-center font-bold text-black dark:text-white">
                  S
                </div>
                <div>
                  <div className="font-semibold text-white dark:text-black">SALLY</div>
                  <div className="text-xs text-gray-300 dark:text-gray-700">Your Fleet Operations Assistant</div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="bg-background p-6 space-y-6 min-h-[500px] max-h-[600px] overflow-y-auto">
              {/* Welcome message */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex-shrink-0 flex items-center justify-center font-bold text-white dark:text-black text-sm">
                  S
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 inline-block max-w-[85%]">
                    <p className="text-sm">
                      Hi! I'm SALLY. I can help you with routes, HOS compliance, alerts, and fleet operations. What would you like to know?
                    </p>
                  </div>
                </div>
              </div>

              {/* Conversation examples */}
              {chatExamples.map((example, index) => (
                <div key={index} className="space-y-3">
                  {/* User message */}
                  <div className="flex gap-3 justify-end">
                    <div className="flex-1 flex justify-end">
                      <div className="bg-black dark:bg-white text-white dark:text-black rounded-2xl rounded-tr-none px-4 py-3 inline-block max-w-[80%]">
                        <p className="text-sm">{example.userMessage}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 flex items-center justify-center text-sm">
                      👤
                    </div>
                  </div>

                  {/* SALLY response */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex-shrink-0 flex items-center justify-center font-bold text-white dark:text-black text-sm">
                      S
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-none px-4 py-3 inline-block max-w-[85%]">
                        {example.sallyResponse}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input area (visual only) */}
            <div className="bg-background border-t border-border px-6 py-4">
              <div className="flex gap-3 items-center">
                <div className="flex-1 bg-muted rounded-full px-4 py-3 text-muted-foreground text-sm">
                  Type your question...
                </div>
                <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold">
                  →
                </div>
              </div>
            </div>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.4}>
          <p className="text-center text-muted-foreground mt-8 text-sm">
            This conversational interface is available to all dispatchers and drivers in the platform
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
