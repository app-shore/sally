const API_BASE_URL = 'http://localhost:8000';

export interface DriverHOSData {
  driver_id: string;
  name: string;
  current_status: 'driving' | 'on_duty' | 'off_duty' | 'sleeper';
  status_since: string;
  drive_remaining: number;
  shift_remaining: number;
  cycle_remaining: number;
  break_required: boolean;
  next_break_due?: string;
  violations: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  last_updated: string;
}

export async function getDriverHOS(driverId: string): Promise<DriverHOSData> {
  const response = await fetch(`${API_BASE_URL}/api/v1/external/hos/${driverId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch HOS data' }));
    throw new Error(error.detail || 'Failed to fetch HOS data');
  }

  return response.json();
}

export interface FuelPrice {
  station_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  price_per_gallon: number;
  last_updated: string;
  amenities: string[];
}

export interface FuelPricesParams {
  latitude: number;
  longitude: number;
  radius_miles?: number;
}

export async function getFuelPrices(params: FuelPricesParams): Promise<FuelPrice[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/external/fuel-prices`);
  url.searchParams.append('latitude', params.latitude.toString());
  url.searchParams.append('longitude', params.longitude.toString());
  if (params.radius_miles) {
    url.searchParams.append('radius_miles', params.radius_miles.toString());
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch fuel prices' }));
    throw new Error(error.detail || 'Failed to fetch fuel prices');
  }

  return response.json();
}

export interface WeatherData {
  location: string;
  latitude: number;
  longitude: number;
  current_temp_f: number;
  conditions: string;
  wind_speed_mph: number;
  visibility_miles: number;
  precipitation_chance: number;
  alerts: Array<{
    type: string;
    severity: string;
    description: string;
    start_time: string;
    end_time: string;
  }>;
  forecast_6h: Array<{
    time: string;
    temp_f: number;
    conditions: string;
    precipitation_chance: number;
  }>;
  last_updated: string;
}

export interface WeatherParams {
  latitude: number;
  longitude: number;
}

export async function getWeather(params: WeatherParams): Promise<WeatherData> {
  const url = new URL(`${API_BASE_URL}/api/v1/external/weather`);
  url.searchParams.append('latitude', params.latitude.toString());
  url.searchParams.append('longitude', params.longitude.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch weather data' }));
    throw new Error(error.detail || 'Failed to fetch weather data');
  }

  return response.json();
}
