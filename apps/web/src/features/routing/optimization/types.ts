export type RestRecommendation = 'full_rest' | 'partial_rest' | 'no_rest';
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'warning';

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

export interface RestRecommendationRequest {
  driver_id: string;
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
  dock_duration_hours?: number;
  dock_location?: string;
  remaining_distance_miles?: number;
  destination?: string;
  appointment_time?: string;
  current_location?: string;
}

export interface RestRecommendationResponse {
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

// Alias for backwards compatibility
export type OptimizationResult = RestRecommendationResponse;
