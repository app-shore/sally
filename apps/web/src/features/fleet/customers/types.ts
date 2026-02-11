export interface Customer {
  id: number;
  customer_id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface CustomerCreate {
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}
