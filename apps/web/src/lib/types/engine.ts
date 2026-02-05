/**
 * @deprecated This file is deprecated. Import from '@/features/routing/optimization' instead.
 * This re-export is provided for backwards compatibility during migration.
 */

export type {
  RestRecommendation,
  ComplianceStatus,
  ComplianceCheck,
  HOSCheckResult,
  FeasibilityAnalysis,
  OpportunityAnalysis,
  CostAnalysis,
  OptimizationResult,
} from '@/features/routing/optimization/types';

// PredictionResult is not migrated yet
export interface PredictionResult {
  estimated_drive_hours: number;
  estimated_arrival_time: string | null;
  is_high_demand: boolean;
  is_low_demand: boolean;
  confidence: number;
  reasoning: string;
}
