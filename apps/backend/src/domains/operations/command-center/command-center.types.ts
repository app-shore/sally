export interface ActiveRouteDto {
  route_id: string;
  plan_id: string;
  driver: {
    driver_id: string;
    name: string;
  };
  vehicle: {
    vehicle_id: string;
    identifier: string;
  };
  status: 'in_transit' | 'at_dock' | 'resting' | 'completed';
  progress: {
    completed_stops: number;
    total_stops: number;
    distance_completed_miles: number;
    total_distance_miles: number;
  };
  next_stop: {
    name: string;
    location: string;
    eta: string;
    appointment_window?: {
      start: string;
      end: string;
    };
  } | null;
  final_destination: {
    name: string;
    location: string;
    eta: string;
  };
  eta_status: 'on_time' | 'at_risk' | 'late';
  hos: {
    drive_hours_remaining: number;
    duty_hours_remaining: number;
    cycle_hours_remaining: number;
    break_hours_remaining: number;
    status: 'driving' | 'on_duty' | 'sleeper' | 'off_duty';
  };
  active_alert_count: number;
  started_at: string;
  updated_at: string;
}

export interface DriverHOSChipDto {
  driver_id: string;
  name: string;
  initials: string;
  drive_hours_remaining: number;
  duty_hours_remaining: number;
  status: 'driving' | 'on_duty' | 'sleeper' | 'off_duty';
  vehicle_id: string | null;
  active_route_id: string | null;
}

export interface CommandCenterOverviewDto {
  kpis: {
    active_routes: number;
    on_time_percentage: number;
    hos_violations: number;
    active_alerts: number;
    avg_response_time_minutes: number;
  };
  active_routes: ActiveRouteDto[];
  quick_action_counts: {
    unassigned_loads: number;
    available_drivers: number;
  };
  driver_hos_strip: DriverHOSChipDto[];
}

export interface ShiftNoteDto {
  note_id: string;
  content: string;
  created_by: {
    user_id: string;
    name: string;
  };
  created_at: string;
  expires_at: string;
  is_pinned: boolean;
}
