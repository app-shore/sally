// ── User Modes ──
export type UserMode = 'prospect' | 'dispatcher' | 'driver';

// ── Intent names by mode ──
export type ProspectIntent =
  | 'product_info'
  | 'pricing'
  | 'integration'
  | 'demo_request'
  | 'lead_capture'
  | 'general';

export type DispatcherIntent =
  | 'alert_query'
  | 'alert_ack'
  | 'driver_lookup'
  | 'route_query'
  | 'hos_check'
  | 'fleet_status'
  | 'add_note'
  | 'flag_driver'
  | 'general';

export type DriverIntent =
  | 'route_status'
  | 'hos_status'
  | 'eta_query'
  | 'delay_report'
  | 'arrival_report'
  | 'fuel_stop_report'
  | 'weather_query'
  | 'general';

export type Intent = ProspectIntent | DispatcherIntent | DriverIntent;

// ── Classified Intent ──
export interface ClassifiedIntent {
  intent: Intent;
  confidence: number;
  entities: Record<string, string>;
}

// ── Rich Cards ──
export type RichCardType =
  | 'alert'
  | 'alert_list'
  | 'driver'
  | 'route'
  | 'hos'
  | 'fleet'
  | 'lead_form';

export interface RichCard {
  type: RichCardType;
  data: Record<string, any>;
}

// ── Action Results ──
export interface ActionResult {
  type: string;
  success: boolean;
  message: string;
}

// ── Sally Response ──
export interface SallyResponse {
  text: string;
  card?: RichCard;
  followUp?: string;
  action?: ActionResult;
  speakText?: string;
}

// ── Mock Data Types ──
export interface MockDriver {
  id: string;
  name: string;
  status: 'driving' | 'at_dock' | 'resting' | 'off_duty';
  hos_remaining: number;
  vehicle: string;
  current_route: string | null;
}

export interface MockAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  driver: string | null;
  vehicle?: string;
  message: string;
  route: string;
}

export interface MockRoute {
  id: string;
  origin: string;
  destination: string;
  stops: number;
  eta: string;
  status: 'in_progress' | 'planned' | 'completed';
  driver: string | null;
}

export interface MockFleet {
  active_vehicles: number;
  active_routes: number;
  pending_alerts: number;
  drivers_available: number;
  drivers_driving: number;
  drivers_resting: number;
}
