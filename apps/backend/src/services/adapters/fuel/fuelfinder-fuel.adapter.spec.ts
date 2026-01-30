import { FuelFinderAdapter } from './fuelfinder-fuel.adapter';

describe('FuelFinderAdapter - Real API', () => {
  let adapter: FuelFinderAdapter;
  const realApiKey = process.env.FUELFINDER_API_KEY;

  beforeEach(() => {
    adapter = new FuelFinderAdapter();
  });

  it('should find fuel stations near location', async () => {
    if (!realApiKey) {
      console.warn('Skipping real API test - FUELFINDER_API_KEY not set');
      return;
    }

    const stations = await adapter.findStations(realApiKey, {
      latitude: 33.4484,
      longitude: -112.074,
      radius_miles: 25,
      max_results: 5,
    });

    expect(Array.isArray(stations)).toBe(true);
    expect(stations.length).toBeGreaterThan(0);
    expect(stations[0]).toHaveProperty('station_id');
    expect(stations[0]).toHaveProperty('diesel_price');
  }, 10000);
});
