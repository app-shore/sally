/**
 * Standard Weather data format for SALLY
 * All weather adapters must transform vendor-specific formats to this structure
 */
export interface WeatherData {
  location: {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
  };
  current: {
    temperature_f: number;
    feels_like_f: number;
    conditions: string; // e.g., 'clear', 'cloudy', 'rain', 'snow', 'fog'
    wind_speed_mph: number;
    wind_direction: string; // e.g., 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'
    visibility_miles: number;
    precipitation_inches?: number;
    humidity_percent: number;
  };
  forecast?: Array<{
    datetime: string; // ISO 8601
    temperature_f: number;
    conditions: string;
    precipitation_chance_percent: number;
  }>;
  alerts?: Array<{
    severity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'EXTREME';
    event: string; // e.g., 'Winter Storm Warning', 'Flood Watch'
    description: string;
    start_time: string;
    end_time: string;
  }>;
  road_conditions?: 'GOOD' | 'FAIR' | 'POOR' | 'HAZARDOUS';
  last_updated: string;
  data_source: string;
}

/**
 * Interface that all Weather adapters must implement
 */
export interface IWeatherAdapter {
  /**
   * Get current weather for a location
   * @param apiKey - Encrypted API key or credentials
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   * @returns Current weather data
   */
  getCurrentWeather(
    apiKey: string,
    latitude: number,
    longitude: number,
  ): Promise<WeatherData>;

  /**
   * Get weather forecast along a route
   * @param apiKey - Encrypted API key or credentials
   * @param waypoints - Array of [lat, lon] coordinates along route
   * @returns Weather data for each waypoint
   */
  getRouteForecast(
    apiKey: string,
    waypoints: Array<{ latitude: number; longitude: number }>,
  ): Promise<WeatherData[]>;

  /**
   * Test if credentials are valid and connection works
   * @param apiKey - Encrypted API key or credentials
   * @returns true if connection successful
   */
  testConnection(apiKey: string): Promise<boolean>;
}
