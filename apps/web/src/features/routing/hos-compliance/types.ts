export interface HOSValidationRequest {
  driver_id: string;
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
}

export interface HOSValidationResponse {
  is_compliant: boolean;
  violations: string[];
  warnings: string[];
  drive_time_remaining: number;
  duty_time_remaining: number;
  time_until_break_required: number;
}
