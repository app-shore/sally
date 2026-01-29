import { z } from 'zod';

export const HOSCheckRequestSchema = z.object({
  driver_id: z.string().min(1),
  hours_driven: z.number().min(0).max(24),
  on_duty_time: z.number().min(0).max(24),
  hours_since_break: z.number().min(0).max(24),
  last_rest_period: z.number().min(0).optional(),
});

export type HOSCheckRequest = z.infer<typeof HOSCheckRequestSchema>;

export interface ComplianceCheck {
  rule_name: string;
  is_compliant: boolean;
  current_value: number;
  limit_value: number;
  remaining: number;
  message: string;
}

export interface HOSCheckResponse {
  status: string;
  is_compliant: boolean;
  checks: ComplianceCheck[];
  warnings: string[];
  violations: string[];
  hours_remaining_to_drive: number;
  hours_remaining_on_duty: number;
  break_required: boolean;
  rest_required: boolean;
}

export const OptimizationRequestSchema = z.object({
  driver_id: z.string().min(1),
  hours_driven: z.number().min(0).max(24),
  on_duty_time: z.number().min(0).max(24),
  hours_since_break: z.number().min(0).max(24),
  dock_duration_hours: z.number().min(0).optional(),
  dock_location: z.string().optional(),
  remaining_distance_miles: z.number().min(0).optional(),
  destination: z.string().optional(),
  appointment_time: z.string().datetime().optional(),
  upcoming_trips: z.array(z.object({
    drive_time: z.number().min(0).max(24),
    dock_time: z.number().min(0).max(24),
    location: z.string().optional(),
  })).optional(),
  current_location: z.string().optional(),
});

export type OptimizationRequest = z.infer<typeof OptimizationRequestSchema>;

export interface FeasibilityAnalysisResponse {
  feasible: boolean;
  limiting_factor: string | null;
  shortfall_hours: number;
  total_drive_needed: number;
  total_on_duty_needed: number;
  will_need_break: boolean;
  drive_margin: number;
  duty_margin: number;
}

export interface OpportunityAnalysisResponse {
  score: number;
  dock_score: number;
  hours_score: number;
  criticality_score: number;
  dock_time_available: number;
  hours_gainable: number;
}

export interface CostAnalysisResponse {
  full_rest_extension_hours: number;
  partial_rest_extension_hours: number;
  dock_time_available: number;
}

export interface OptimizationResponse {
  recommendation: string;
  recommended_duration_hours: number | null;
  reasoning: string;
  confidence: number;
  is_compliant: boolean;
  compliance_details: string;
  hours_remaining_to_drive: number;
  hours_remaining_on_duty: number;
  post_load_drive_feasible: boolean;
  driver_can_decline: boolean;
  feasibility_analysis: FeasibilityAnalysisResponse | null;
  opportunity_analysis: OpportunityAnalysisResponse | null;
  cost_analysis: CostAnalysisResponse | null;
  hours_after_rest_drive: number | null;
  hours_after_rest_duty: number | null;
}

export const PredictionRequestSchema = z.object({
  remaining_distance_miles: z.number().positive(),
  destination: z.string().min(1),
  appointment_time: z.string().datetime().optional(),
  current_location: z.string().optional(),
  average_speed_mph: z.number().positive().max(100).default(55.0),
});

export type PredictionRequest = z.infer<typeof PredictionRequestSchema>;

export interface PredictionResponse {
  estimated_drive_hours: number;
  estimated_arrival_time: string | null;
  is_high_demand: boolean;
  is_low_demand: boolean;
  confidence: number;
  reasoning: string;
}
