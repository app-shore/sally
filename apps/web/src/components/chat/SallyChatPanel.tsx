'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SallyChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: 'customer' | 'dispatcher' | 'driver'; // Context-aware chat experience
  isDocked?: boolean; // Whether panel is docked to the side
  onToggleDock?: () => void; // Toggle between docked and floating
}

// Context-aware suggested questions based on user type
const CUSTOMER_QUESTIONS = [
  "How does HOS-aware routing work?",
  "Can SALLY integrate with my TMS?",
  "What triggers does SALLY monitor?",
  "How much can I save with SALLY?",
  "Show me a route planning example",
];

const DISPATCHER_QUESTIONS = [
  "Create a route from Dallas to Houston",
  "Show me all critical alerts",
  "Find the best driver for Load-001",
  "Update route R-123 with 30min delay",
  "Add a new rest stop to route R-123",
];

const DRIVER_QUESTIONS = [
  "When is my next break?",
  "Show my current route status",
  "Report a 1 hour delay at pickup",
  "Find nearest fuel stop",
  "What's my ETA to next stop?",
];

export function SallyChatPanel({
  isOpen,
  onClose,
  userType = 'customer',
  isDocked = false,
  onToggleDock,
}: SallyChatPanelProps) {
  // Context-aware initial messages
  const getInitialMessage = (): string => {
    switch (userType) {
      case 'dispatcher':
        return "Hi! I'm SALLY. I can create routes, check alerts, find drivers, update plans, and manage your fleet. Just tell me what you need in plain English.";
      case 'driver':
        return "Hi! I'm SALLY. I can show your route status, find fuel stops, help you report delays, and answer questions about your trip. What do you need?";
      default: // customer
        return "Hi! I'm SALLY, your intelligent dispatch assistant. I can help you understand route planning, HOS compliance, cost savings, and how our platform works. What would you like to know?";
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: getInitialMessage(),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const response = generateResponse(text);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const generateResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();

    // Context-aware responses based on user type
    if (userType === 'dispatcher') {
      return generateDispatcherResponse(lowerQuestion);
    } else if (userType === 'driver') {
      return generateDriverResponse(lowerQuestion);
    } else {
      return generateCustomerResponse(lowerQuestion);
    }
  };

  const generateCustomerResponse = (lowerQuestion: string): string => {
    if (lowerQuestion.includes('hos') || lowerQuestion.includes('hours of service')) {
      return "SALLY's HOS-aware routing continuously monitors driver hours and automatically inserts rest stops before violations occur. Unlike traditional route planners that only optimize for distance, SALLY simulates HOS limits segment-by-segment and ensures 100% compliance. Every route is validated before dispatch.";
    } else if (lowerQuestion.includes('integrate') || lowerQuestion.includes('tms')) {
      return "Yes! SALLY integrates with major TMS platforms (McLeod, TMW, SAP TM), ELD/telematics systems (Samsara, KeepTruckin, Geotab), and external data sources for fuel prices, weather, and traffic. We provide REST APIs and webhooks for seamless integration.";
    } else if (lowerQuestion.includes('trigger') || lowerQuestion.includes('monitor')) {
      return "SALLY monitors 14 trigger types every 60 seconds across 5 categories: Proactive (HOS approaching, appointment risk), Reactive (HOS violation, driver not moving), External (weather, traffic), Operational (dock delays, fuel low, route deviation), and Compliance (rest stop skipped, break requirements). Dispatchers get instant alerts when intervention is needed.";
    } else if (lowerQuestion.includes('save') || lowerQuestion.includes('cost') || lowerQuestion.includes('roi')) {
      return "SALLY prevents HOS violations (avg $12,000 per violation), reduces admin time by 30-50%, and improves on-time delivery rates. For a 10-truck fleet, you could save hundreds of thousands annually from violation prevention alone, plus significant time savings on manual planning and compliance checks.";
    } else if (lowerQuestion.includes('example') || lowerQuestion.includes('route')) {
      return "Here's how SALLY works: You input origin, delivery stops, and destination. SALLY uses TSP optimization to sequence stops, simulates HOS for each segment, automatically inserts rest stops where needed, adds optimal fuel stops based on price and range, and delivers a fully compliant route in seconds. Then continuous monitoring begins.";
    } else if (lowerQuestion.includes('price') || lowerQuestion.includes('pricing')) {
      return "SALLY pricing is based on fleet size and features. Contact our sales team for a custom quote. We offer flexible plans starting with basic route planning up to full enterprise monitoring with API access. Most fleets see ROI within the first month from violation prevention alone.";
    } else if (lowerQuestion.includes('demo') || lowerQuestion.includes('trial')) {
      return "I can help you get started right now! Click 'Plan Your First Route' in the navigation to try our route planner, or I can schedule a live demo with our team where we'll walk through your specific use case. What works better for you?";
    } else {
      return "That's a great question! SALLY is a dispatch & driver coordination platform that provides HOS-aware route planning, continuous monitoring, and proactive alerts. We help fleets achieve zero violations while maximizing efficiency. Could you tell me more about what you're looking for? Or try asking about: routing, monitoring, integrations, cost savings, or scheduling a demo.";
    }
  };

  const generateDispatcherResponse = (lowerQuestion: string): string => {
    // Action-oriented responses - SALLY does the work
    if (lowerQuestion.includes('create') && (lowerQuestion.includes('route') || lowerQuestion.includes('plan'))) {
      return "I'd love to create a route for you! However, I need to be connected to the system API first (coming in next update). For now, you can create routes by going to the Dispatcher Dashboard → Create Plan tab. Tell me the origin, destination, and any stops, and I'll walk you through it.";
    } else if (lowerQuestion.includes('show') && lowerQuestion.includes('alert')) {
      return "I'd fetch your current alerts, but I need API access (coming soon). For now, check the Alerts tab in your Dispatcher Dashboard. You can filter by priority: 🔴 Critical (HOS violations), 🟠 High (approaching limits), 🟡 Medium (delays), 🔵 Low (info).";
    } else if (lowerQuestion.includes('find') && lowerQuestion.includes('driver')) {
      return "I can help find the best driver for a load! I'd normally check: (1) Current HOS availability, (2) Location proximity, (3) Vehicle compatibility, (4) Schedule conflicts. Once I'm connected to the API, just say 'Find driver for Load-001' and I'll give you ranked options.";
    } else if (lowerQuestion.includes('update') && lowerQuestion.includes('route')) {
      return "I can update routes for delays, weather, or changes! Tell me: (1) Route ID, (2) What changed (e.g., '30min delay at pickup'), and I'll recalculate the plan. API integration coming soon - for now, use Active Routes → Select Route → Update Plan.";
    } else if (lowerQuestion.includes('add') && (lowerQuestion.includes('rest') || lowerQuestion.includes('fuel'))) {
      return "I can insert rest or fuel stops into existing routes! Tell me the route ID and where you want to add it. Once API-connected, I'll automatically find the optimal location and update the driver's timeline. For now, use the route editor in Active Routes.";
    } else if (lowerQuestion.includes('driver') || lowerQuestion.includes('vehicle') || lowerQuestion.includes('load')) {
      return "I can manage your fleet! Commands like 'Add driver John Smith' or 'Update Vehicle-005 fuel to 80%' will work once I'm API-connected. For now, use the Configuration screen (gear icon) to manage drivers, vehicles, and loads.";
    } else {
      return "I'm your natural language interface to SALLY! Soon you'll be able to say things like: 'Create route from Dallas to Houston', 'Show critical alerts', 'Find best driver for Load-001', 'Update route R-123 with delay'. API integration coming in next update. What would you like to do?";
    }
  };

  const generateDriverResponse = (lowerQuestion: string): string => {
    // Action-oriented responses for drivers
    if (lowerQuestion.includes('break') || lowerQuestion.includes('rest') || lowerQuestion.includes('next')) {
      return "I'd show your next scheduled break from your active route, but I need API access (coming soon). For now, check your Driver View timeline - rest stops are marked with 🛏️. Your next break timing is calculated to keep you HOS-compliant.";
    } else if (lowerQuestion.includes('status') || lowerQuestion.includes('route')) {
      return "I'd pull up your current route status with real-time progress! Once API-connected, I can tell you: current segment, time to next stop, HOS hours remaining, and any updates from dispatch. For now, check your Driver View dashboard.";
    } else if (lowerQuestion.includes('delay') || lowerQuestion.includes('report')) {
      return "I can help you report delays! Tell me: 'Report 1 hour delay at pickup' or 'Dock taking 2 extra hours'. Once API-connected, I'll notify dispatch immediately and they'll adjust your route if needed. For now, call dispatch or use the Driver View → Report Issue button.";
    } else if (lowerQuestion.includes('fuel') || lowerQuestion.includes('find') || lowerQuestion.includes('nearest')) {
      return "I can find the nearest fuel stops with pricing! Once API-connected, I'll show: station name, distance, price per gallon, and amenities (parking, food, showers). For now, your next planned fuel stop is shown with ⛽ on your timeline.";
    } else if (lowerQuestion.includes('eta') || lowerQuestion.includes('arrival')) {
      return "I'd calculate your real-time ETA considering traffic, weather, and HOS! Once API-connected, just ask 'ETA to next stop?' or 'When do I arrive in Dallas?' For now, check your Driver View timeline for scheduled arrival times.";
    } else {
      return "I'm your driving assistant! Soon you'll be able to ask: 'When is my next break?', 'Find nearest fuel stop', 'Report 30min delay', 'What's my ETA?', 'Show route status'. API integration coming soon. What do you need?";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - only show when not docked */}
          {!isDocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
              onClick={onClose}
            />
          )}

          {/* Chat Panel */}
          <motion.div
            initial={{ x: isDocked ? 0 : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isDocked ? 0 : '100%' }}
            transition={isDocked ? {} : { type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed right-0 top-0 h-full w-full sm:w-[480px] bg-background shadow-2xl flex flex-col ${
              isDocked ? 'z-30' : 'z-50'
            }`}
          >
            {/* Header */}
            <div className="bg-black text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                    <path
                      d="M 16 8 Q 10 8, 10 12 Q 10 14, 13 15 Q 19 16, 19 19 Q 19 22, 16 22 Q 12 22, 10 19"
                      stroke="#fff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg">SALLY</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-300 dark:text-gray-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span>AI Assistant Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Dock/Undock button */}
                {onToggleDock && (
                  <button
                    onClick={onToggleDock}
                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                    title={isDocked ? 'Undock panel' : 'Dock panel to side'}
                  >
                    {isDocked ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {/* Undock icon - window with arrow pointing out */}
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 9l6 6m0-6l-6 6" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        {/* Dock icon - panel aligned to right */}
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M15 3v18" />
                      </svg>
                    )}
                  </button>
                )}
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                  title="Close chat"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-black text-white'
                        : 'bg-card text-foreground border border-border'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-gray-400 dark:text-gray-500' : 'text-muted-foreground'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-card text-foreground border border-border rounded-lg p-3">
                    <div className="flex gap-1">
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length === 1 && (
              <div className="p-4 bg-background border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Suggested questions:</p>
                <div className="flex flex-wrap gap-2">
                  {(userType === 'dispatcher'
                    ? DISPATCHER_QUESTIONS
                    : userType === 'driver'
                    ? DRIVER_QUESTIONS
                    : CUSTOMER_QUESTIONS
                  ).map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSend(question)}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 bg-background border-t border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about SALLY..."
                  className="flex-1 px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="bg-black hover:bg-gray-800 text-white px-6"
                >
                  Send
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                SALLY AI can make mistakes. Verify important information.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
