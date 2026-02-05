'use client';

import { QuestionCard } from './QuestionCard';
import { ScrollReveal } from './ScrollReveal';
import { Badge } from '@/shared/components/ui/badge';

export function AskSallySection() {
  return (
    <section className="py-32 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight text-center mb-12">
            Ask SALLY Anything
          </h2>
          <p className="text-xl text-muted-foreground text-center max-w-3xl mx-auto mb-20">
            Dispatchers and drivers get instant answers about routes, compliance, and operations
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Dispatcher Question 1 */}
          <QuestionCard
            question="Is Route #1247 on track?"
            userType="dispatcher"
            visual={
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                  <span className="text-sm font-medium text-foreground">Stop 3 of 7</span>
                  <Badge className="bg-green-500 dark:bg-green-600 text-white">On Track</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current ETA:</span>
                  <span className="font-semibold text-foreground">3:45 PM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Planned ETA:</span>
                  <span className="font-semibold text-foreground">3:45 PM</span>
                </div>
              </div>
            }
          />

          {/* Dispatcher Question 2 */}
          <QuestionCard
            question="Why was Route #1832 re-planned?"
            userType="dispatcher"
            visual={
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-sm font-semibold text-foreground mb-2">Dock delay detected</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• 3hr actual vs 1hr planned</div>
                    <div>• HOS shortfall: 0.5 hours</div>
                  </div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-xs font-semibold text-green-700 dark:text-green-400">
                    ✓ Route re-planned to maintain compliance
                  </div>
                </div>
              </div>
            }
          />

          {/* Dispatcher Question 3 */}
          <QuestionCard
            question="Which drivers are approaching HOS limits?"
            userType="dispatcher"
            visual={
              <div className="space-y-2">
                <div className="p-2 bg-background rounded border border-border">
                  <div className="text-sm font-medium text-foreground">John Smith</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">2.5 hours remaining</span>
                    <Badge className="bg-yellow-500 dark:bg-yellow-600 text-white text-xs">Alert</Badge>
                  </div>
                </div>
                <div className="p-2 bg-background rounded border border-border">
                  <div className="text-sm font-medium text-foreground">Jane Doe</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">5.0 hours remaining</span>
                    <Badge className="bg-green-500 dark:bg-green-600 text-white text-xs">On Track</Badge>
                  </div>
                </div>
                <div className="p-2 bg-background rounded border border-border">
                  <div className="text-sm font-medium text-foreground">Bob Wilson</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">7.2 hours remaining</span>
                    <Badge className="bg-green-500 dark:bg-green-600 text-white text-xs">On Track</Badge>
                  </div>
                </div>
              </div>
            }
          />

          {/* Driver Question 1 */}
          <QuestionCard
            question="Where should I take my 10-hour break?"
            userType="driver"
            visual={
              <div className="space-y-3">
                {/* Simplified map visual */}
                <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-border relative overflow-hidden">
                  {/* Current location dot */}
                  <div className="absolute left-8 top-12 w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full" />
                  {/* Route line */}
                  <svg className="absolute inset-0" viewBox="0 0 200 96">
                    <path
                      d="M 32 48 Q 80 40, 140 52"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-gray-400 dark:text-gray-600"
                      strokeDasharray="4 4"
                    />
                  </svg>
                  {/* Rest stop marker */}
                  <div className="absolute right-12 top-14">
                    <div className="w-6 h-6 bg-gray-600 dark:bg-gray-400 rounded-full border-2 border-white dark:border-black flex items-center justify-center">
                      <div className="text-white dark:text-black text-xs font-bold">+</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">Love&apos;s Travel Stop - Exit 47</div>
                  <div className="text-xs text-muted-foreground">Optimal timing: 2.3 hours from now</div>
                </div>
              </div>
            }
          />

          {/* Driver Question 2 */}
          <QuestionCard
            question="Can I make my next appointment on time?"
            userType="driver"
            visual={
              <div className="space-y-4">
                {/* Timeline visual */}
                <div className="relative pt-2">
                  {/* Timeline line */}
                  <div className="absolute top-2 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-700" />

                  {/* Current position */}
                  <div className="relative flex items-center">
                    <div className="absolute left-0 -mt-1">
                      <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full" />
                      <div className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">Now</div>
                    </div>

                    {/* Appointment time */}
                    <div className="absolute right-0 -mt-1">
                      <div className="w-3 h-3 bg-black dark:bg-white rounded-full" />
                      <div className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">Appt</div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Remaining drive time:</span>
                    <span className="font-semibold text-foreground">3.5 hours</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Time until appointment:</span>
                    <span className="font-semibold text-foreground">4.7 hours</span>
                  </div>
                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 text-center">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Yes - 1.2 hours buffer
                    </span>
                  </div>
                </div>
              </div>
            }
          />

          {/* Driver Question 3 */}
          <QuestionCard
            question="What's my next stop after this delivery?"
            userType="driver"
            visual={
              <div className="space-y-3">
                <div className="p-4 bg-background rounded-lg border-2 border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-sm font-semibold text-foreground">Next Stop</div>
                    <Badge className="bg-blue-500 dark:bg-blue-600 text-white text-xs">Delivery</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Address</div>
                      <div className="font-medium text-foreground">Walmart DC - Columbus, OH</div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">ETA:</span>
                      <span className="font-semibold text-foreground">Today 6:45 PM</span>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-400 text-center">
                  ℹ️ Dock opens at 6:00 PM
                </div>
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}
