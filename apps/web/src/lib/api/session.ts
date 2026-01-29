const API_BASE_URL = 'http://localhost:8000';

export interface LoginRequest {
  user_type: 'dispatcher' | 'driver';
  user_id: string;
}

export interface LoginResponse {
  session_id: string;
  user_type: string;
  user_id: string;
  message: string;
}

export interface LogoutResponse {
  message: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/session/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(error.detail || 'Login failed');
  }

  return response.json();
}

export async function logout(sessionId: string): Promise<LogoutResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/session/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Logout failed' }));
    throw new Error(error.detail || 'Logout failed');
  }

  return response.json();
}
