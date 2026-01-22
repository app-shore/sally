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

export interface FeasibilityAnalysis {
  feasible: boolean;
  limiting_factor?: string;
  shortfall_hours: number;
  total_drive_needed: number;
  total_on_duty_needed: number;
  drive_margin: number;
  duty_margin: number;
}

export interface OpportunityAnalysis {
  score: number;
  dock_score: number;
  hours_score: number;
  criticality_score: number;
  hours_gainable: number;
}

export interface CostAnalysis {
  dock_time_available: number;
  full_rest_extension_hours: number;
  partial_rest_extension_hours: number;
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
  confidence?: number;
  driver_can_decline?: boolean;
  hours_after_rest_drive?: number;
  hours_after_rest_duty?: number;
  feasibility_analysis?: FeasibilityAnalysis;
  opportunity_analysis?: OpportunityAnalysis;
  cost_analysis?: CostAnalysis;
}

export interface PredictionResult {
  estimated_drive_hours: number;
  estimated_arrival_time: string | null;
  is_high_demand: boolean;
  is_low_demand: boolean;
  confidence: number;
  reasoning: string;
}
