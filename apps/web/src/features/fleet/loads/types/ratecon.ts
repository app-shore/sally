/** Extracted data from a parsed rate confirmation PDF */
export interface RateconData {
  load_number: string;
  po_number?: string;
  reference_numbers?: string[];

  broker_name: string;
  broker_mc?: string;
  broker_contact_name?: string;
  broker_contact_email?: string;
  broker_contact_phone?: string;

  equipment_type?: string;
  mode?: string;
  commodity?: string;
  weight_lbs?: number;
  pieces?: number;

  rate_total_usd: number;
  rate_details?: Array<{
    type: string;
    amount_usd: number;
  }>;

  stops: Array<{
    sequence: number;
    action_type: 'pickup' | 'delivery';
    facility_name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    appointment_date?: string;
    appointment_time?: string;
    contact_name?: string;
    contact_phone?: string;
    facility_hours?: string;
    pickup_number?: string;
    reference?: string;
  }>;

  special_instructions?: string;
}

/** Response from the parse-ratecon endpoint */
export interface ParseRateconResponse {
  success: boolean;
  data: RateconData;
}
