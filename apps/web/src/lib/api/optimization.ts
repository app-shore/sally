import { api } from '@/shared/lib/api';

export const optimization = {
  recommend: async (data: {
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
  }) => {
    return api.post('/rest/recommend', data);
  },
};

export const hosRules = {
  check: async (data: {
    driver_id: string;
    hours_driven: number;
    on_duty_time: number;
    hours_since_break: number;
  }) => {
    return api.post('/hos/validate', data);
  },
};

export const prediction = {
  estimate: async (data: {
    remaining_distance_miles: number;
    destination: string;
    appointment_time?: string;
    current_location?: string;
    average_speed_mph?: number;
  }) => {
    return api.post('/prediction/estimate', data);
  },
};
