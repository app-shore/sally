export interface CustomerLoad {
  load_id: string;
  load_number: string;
  status: string;
  customer_name: string;
  estimated_delivery?: string;
  origin_city?: string;
  origin_state?: string;
  destination_city?: string;
  destination_state?: string;
  tracking_token?: string;
  created_at: string;
}
