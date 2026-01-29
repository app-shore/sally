'use client';

import { motion } from 'framer-motion';

interface ComparisonRowProps {
  feature: string;
  traditional: boolean;
  sally: boolean;
  delay?: number;
}

export function ComparisonRow({ feature, traditional, sally, delay = 0 }: ComparisonRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      className="border-b border-border last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
    >
      <td className="py-4 px-6 text-left text-sm font-medium text-foreground">
        {feature}
      </td>
      <td className="py-4 px-6 text-center">
        {traditional ? (
          <motion.svg
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: delay + 0.2, type: 'spring' }}
            className="w-5 h-5 mx-auto text-black dark:text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        ) : (
          <motion.svg
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: delay + 0.2, type: 'spring' }}
            className="w-5 h-5 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </motion.svg>
        )}
      </td>
      <td className="py-4 px-6 text-center">
        {sally ? (
          <motion.svg
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: delay + 0.3, type: 'spring' }}
            className="w-5 h-5 mx-auto text-black dark:text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        ) : (
          <motion.svg
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: delay + 0.3, type: 'spring' }}
            className="w-5 h-5 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </motion.svg>
        )}
      </td>
    </motion.tr>
  );
}

export function ComparisonTable() {
  const comparisons = [
    { feature: 'HOS-Aware Route Planning', traditional: false, sally: true },
    { feature: 'Automatic Rest Stop Insertion', traditional: false, sally: true },
    { feature: 'Automatic Fuel Stop Optimization', traditional: false, sally: true },
    { feature: 'Real-Time HOS Monitoring', traditional: false, sally: true },
    { feature: 'Proactive Violation Prevention', traditional: false, sally: true },
    { feature: 'Dynamic Route Updates', traditional: false, sally: true },
    { feature: 'Automated Dispatcher Alerts', traditional: false, sally: true },
    { feature: '14 Trigger Monitoring', traditional: false, sally: true },
    { feature: 'Driver & Dispatcher Views', traditional: false, sally: true },
    { feature: 'Zero HOS Violations', traditional: false, sally: true },
    { feature: 'Manual HOS Tracking', traditional: true, sally: false },
    { feature: 'Reactive Problem Solving', traditional: true, sally: false },
    { feature: 'Constant Driver Check-ins', traditional: true, sally: false },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="bg-card border border-border rounded-lg overflow-hidden shadow-card"
      >
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-border">
              <th className="py-4 px-6 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Feature
              </th>
              <th className="py-4 px-6 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">
                Traditional
              </th>
              <th className="py-4 px-6 text-center text-xs font-semibold text-black dark:text-white uppercase tracking-wider w-32 bg-black/5 dark:bg-white/5">
                SALLY
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((comparison, index) => (
              <ComparisonRow
                key={comparison.feature}
                feature={comparison.feature}
                traditional={comparison.traditional}
                sally={comparison.sally}
                delay={index * 0.05}
              />
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-8 text-center"
      >
        <p className="text-muted-foreground text-sm">
          Traditional routing treats drivers like trucks.{' '}
          <span className="font-semibold text-foreground">SALLY routes drivers, not trucks.</span>
        </p>
      </motion.div>
    </div>
  );
}
