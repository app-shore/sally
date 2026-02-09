import { z } from 'zod';

export const ReportDelaySchema = z.object({
  delayMinutes: z.number().min(1),
  reason: z.string().min(1).max(500),
});
export type ReportDelayDto = z.infer<typeof ReportDelaySchema>;
