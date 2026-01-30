import { OpenWeatherAdapter } from './openweather.adapter';

describe('OpenWeatherAdapter - Real API', () => {
  let adapter: OpenWeatherAdapter;
  const realApiKey = process.env.OPENWEATHER_API_KEY;

  beforeEach(() => {
    adapter = new OpenWeatherAdapter();
  });

  it('should get current weather from real API', async () => {
    if (!realApiKey) {
      console.warn('Skipping real API test - OPENWEATHER_API_KEY not set');
      return;
    }

    const weather = await adapter.getCurrentWeather(realApiKey, 33.4484, -112.074);

    expect(weather).toBeDefined();
    expect(weather.current.temperature_f).toBeGreaterThan(0);
    expect(weather.data_source).toBe('openweather');
  }, 10000);

  it('should test connection with real API key', async () => {
    if (!realApiKey) {
      console.warn('Skipping real API test - OPENWEATHER_API_KEY not set');
      return;
    }

    const result = await adapter.testConnection(realApiKey);
    expect(result).toBe(true);
  }, 10000);
});
