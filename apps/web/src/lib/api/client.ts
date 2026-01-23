/**
 * API client for FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: "An error occurred",
    }));
    throw new APIError(
      response.status,
      error.detail || `HTTP ${response.status}`,
      error
    );
  }

  return response.json();
}

export const api = {
  hos: {
    check: async (data: {
      driver_id: string;
      hours_driven: number;
      on_duty_time: number;
      hours_since_break: number;
    }) => {
      const response = await fetch(`${API_BASE_URL}/hos-rules/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },
  },

  optimization: {
    recommend: async (data: {
      driver_id: string;
      hours_driven: number;
      on_duty_time: number;
      hours_since_break: number;
      dock_duration_hours?: number;
      dock_location?: string;
      remaining_distance_miles?: number;
      destination?: string;
      appointment_time?: string;
      current_location?: string;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/optimization/recommend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      return handleResponse(response);
    },
  },

  prediction: {
    estimate: async (data: {
      remaining_distance_miles: number;
      destination: string;
      appointment_time?: string;
      current_location?: string;
      average_speed_mph?: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/prediction/estimate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      return handleResponse(response);
    },
  },
};
