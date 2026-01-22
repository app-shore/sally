/**
 * Engine-related TypeScript types
 */

export type RestRecommendation = "full_rest" | "partial_rest" | "no_rest";
export type ComplianceStatus = "compliant" | "non_compliant" | "warning";

export interface ComplianceCheck {
  rule_name: string;
  is_compliant: boolean;
  current_value: number;
  limit_value: number;
  remaining: number;
  message: string;
}

export interface HOSCheckResult {
  status: ComplianceStatus;
  is_compliant: boolean;
  checks: ComplianceCheck[];
  warnings: string[];
  violations: string[];
  hours_remaining_to_drive: number;
  hours_remaining_on_duty: number;
  break_required: boolean;
  rest_required: boolean;
}

export interface OptimizationResult {
  recommendation: RestRecommendation;
  recommended_duration_hours: number | null;
  reasoning: string;
  is_compliant: boolean;
  compliance_details: string;
  hours_remaining_to_drive: number;
  hours_remaining_on_duty: number;
  post_load_drive_feasible: boolean;
}

export interface PredictionResult {
  estimated_drive_hours: number;
  estimated_arrival_time: string | null;
  is_high_demand: boolean;
  is_low_demand: boolean;
  confidence: number;
  reasoning: string;
}
