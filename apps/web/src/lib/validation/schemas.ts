/**
 * Zod validation schemas for forms
 */

import { z } from "zod";

export const driverInputSchema = z.object({
  driver_id: z.string().min(1, "Driver ID is required"),
  hours_driven: z
    .number()
    .min(0, "Hours driven must be positive")
    .max(24, "Hours driven cannot exceed 24"),
  on_duty_time: z
    .number()
    .min(0, "On-duty time must be positive")
    .max(24, "On-duty time cannot exceed 24"),
  hours_since_break: z
    .number()
    .min(0, "Hours since break must be positive")
    .max(24, "Hours since break cannot exceed 24"),
});

export const routeInputSchema = z.object({
  remaining_distance_miles: z.number().min(0).optional(),
  destination: z.string().optional(),
  appointment_time: z.string().optional(),
  current_location: z.string().optional(),
});

export const dockInputSchema = z.object({
  dock_duration_hours: z.number().min(0).optional(),
  dock_location: z.string().optional(),
});

export const engineInputSchema = driverInputSchema
  .merge(routeInputSchema)
  .merge(dockInputSchema);

export type DriverInputFormData = z.infer<typeof driverInputSchema>;
export type RouteInputFormData = z.infer<typeof routeInputSchema>;
export type DockInputFormData = z.infer<typeof dockInputSchema>;
export type EngineInputFormData = z.infer<typeof engineInputSchema>;
