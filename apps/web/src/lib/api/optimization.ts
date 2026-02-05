/**
 * @deprecated This file is deprecated. Import from specific feature modules instead:
 * - '@/features/routing/optimization' for REST optimization
 * - '@/features/routing/hos-compliance' for HOS validation
 * This re-export is provided for backwards compatibility during migration.
 */

export { optimizationApi, optimization } from '@/features/routing/optimization/api';
export { hosComplianceApi, hosRules } from '@/features/routing/hos-compliance/api';

// Prediction is not migrated yet, keeping it here
import { apiClient } from '@/shared/lib/api';

export const prediction = {
  estimate: async (data: {
    remaining_distance_miles: number;
    destination: string;
    appointment_time?: string;
    current_location?: string;
    average_speed_mph?: number;
  }) => {
    return apiClient('/prediction/estimate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
