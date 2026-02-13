export interface Driver {
  id: string;
  driver_id: string;
  name: string;
  phone?: string;
  email?: string;
  cdl_class?: string;
  license_number?: string;
  license_state?: string;
  endorsements?: string[];
  status?: string;
  is_active?: boolean;
  // Profile enrichment fields
  hire_date?: string;
  medical_card_expiry?: string;
  home_terminal_city?: string;
  home_terminal_state?: string;
  home_terminal_timezone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  // HOS (from structured fields)
  current_hours_driven?: number;
  current_on_duty_time?: number;
  current_hours_since_break?: number;
  cycle_hours_used?: number;
  // HOS (from integration)
  current_hos?: {
    drive_remaining: number;
    shift_remaining: number;
    cycle_remaining: number;
    break_required: boolean;
  };
  // External sync metadata
  external_driver_id?: string;
  external_source?: string;
  sync_status?: string;
  hos_data_source?: string;
  hos_data_synced_at?: string;
  last_synced_at?: string;
  // Relations
  current_load?: {
    load_id: string;
    reference_number: string;
    status: string;
  } | null;
  // SALLY access status
  sally_access_status?: 'ACTIVE' | 'INVITED' | 'NO_ACCESS' | 'DEACTIVATED';
  linked_user_id?: string;
  pending_invitation_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDriverRequest {
  name: string;
  phone: string;
  email: string;
  cdl_class: string;
  license_number: string;
  license_state?: string;
  // Optional profile fields (from "More Details" section)
  endorsements?: string[];
  hire_date?: string;
  medical_card_expiry?: string;
  home_terminal_city?: string;
  home_terminal_state?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

export interface UpdateDriverRequest {
  name?: string;
  phone?: string;
  email?: string;
  cdl_class?: string;
  license_number?: string;
  license_state?: string;
  endorsements?: string[];
  hire_date?: string;
  medical_card_expiry?: string;
  home_terminal_city?: string;
  home_terminal_state?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

export interface DriverHOS {
  driver_id: string;
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
  duty_status: string;
  last_updated: string;
  data_source: string;
  cached?: boolean;
  stale?: boolean;
  cache_age_seconds?: number;
}

export interface ActivateAndInviteRequest {
  email?: string;
}

export interface ActivateAndInviteResponse {
  driver: Driver;
  invitation: {
    invitationId: string;
    email: string;
    status: string;
  };
}
