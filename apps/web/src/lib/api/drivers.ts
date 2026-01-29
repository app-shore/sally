const API_BASE_URL = 'http://localhost:8000';

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  phone?: string;
  email?: string;
  current_hos?: {
    drive_remaining: number;
    shift_remaining: number;
    cycle_remaining: number;
    break_required: boolean;
  };
  created_at?: string;
  updated_at?: string;
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

export async function listDrivers(): Promise<Driver[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/drivers`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch drivers' }));
    throw new Error(error.detail || 'Failed to fetch drivers');
  }

  return response.json();
}

export async function getDriver(driverId: string): Promise<Driver> {
  const response = await fetch(`${API_BASE_URL}/api/v1/drivers/${driverId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch driver' }));
    throw new Error(error.detail || 'Failed to fetch driver');
  }

  return response.json();
}

export async function createDriver(data: CreateDriverRequest): Promise<Driver> {
  const response = await fetch(`${API_BASE_URL}/api/v1/drivers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create driver' }));
    throw new Error(error.detail || 'Failed to create driver');
  }

  return response.json();
}

export async function updateDriver(driverId: string, data: UpdateDriverRequest): Promise<Driver> {
  const response = await fetch(`${API_BASE_URL}/api/v1/drivers/${driverId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to update driver' }));
    throw new Error(error.detail || 'Failed to update driver');
  }

  return response.json();
}

export async function deleteDriver(driverId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/drivers/${driverId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to delete driver' }));
    throw new Error(error.detail || 'Failed to delete driver');
  }
}
