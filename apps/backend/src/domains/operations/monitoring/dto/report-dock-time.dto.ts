import { z } from 'zod';

export const ReportDockTimeSchema = z.object({
  actualDockHours: z.number().min(0),
  notes: z.string().optional(),
});
export type ReportDockTimeDto = z.infer<typeof ReportDockTimeSchema>;
