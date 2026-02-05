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

          {/* Driver questions will be added in next step */}
        </div>
      </div>
    </section>
  );
}
