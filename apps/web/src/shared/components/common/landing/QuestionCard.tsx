'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';

interface QuestionCardProps {
  question: string;
  visual: ReactNode;
  userType: 'dispatcher' | 'driver';
}

export function QuestionCard({ question, visual, userType }: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className="h-full hover:shadow-card-hover transition-shadow duration-300">
        <CardHeader>
          <div className="flex items-start gap-3">
            {/* User type badge */}
            <div className={`px-2 py-1 rounded text-xs font-semibold ${
              userType === 'dispatcher'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
            }`}>
              {userType === 'dispatcher' ? 'Dispatcher' : 'Driver'}
            </div>
          </div>
          <CardTitle className="text-lg font-semibold text-foreground mt-2">
            {question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visual}
        </CardContent>
      </Card>
    </motion.div>
  );
}
