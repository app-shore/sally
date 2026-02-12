export interface Customer {
  id: number;
  customer_id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
  portal_access_status?: 'NO_ACCESS' | 'INVITED' | 'ACTIVE' | 'DEACTIVATED';
  pending_invitation_id?: string | null;
}

export interface CustomerCreate {
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface CustomerInvite {
  email: string;
  first_name: string;
  last_name: string;
}

export interface CustomerInviteResponse {
  invitation_id: string;
  email: string;
  status: string;
  customer_id: string;
  expires_at: string;
}
