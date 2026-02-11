export interface Driver {
  id: string;
  driver_id: string;  // The actual driver ID used in API calls
  name: string;
  license_number: string;
  phone?: string;
  email?: string;
  status?: string;
  is_active?: boolean;
  current_hos?: {
    drive_remaining: number;
    shift_remaining: number;
    cycle_remaining: number;
    break_required: boolean;
  };
  // External sync metadata
  external_driver_id?: string;
  external_source?: string;
  hos_data_source?: string;
  hos_data_synced_at?: string;
  hos_manual_override?: boolean;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
  // SALLY access status
  sally_access_status?: 'ACTIVE' | 'INVITED' | 'NO_ACCESS' | 'DEACTIVATED';
  linked_user_id?: string;
  pending_invitation_id?: string;
}

export interface CreateDriverRequest {
  name: string;
  license_number: string;
  phone?: string;
  email?: string;
}

export interface UpdateDriverRequest {
  name?: string;
  license_number?: string;
  phone?: string;
  email?: string;
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
