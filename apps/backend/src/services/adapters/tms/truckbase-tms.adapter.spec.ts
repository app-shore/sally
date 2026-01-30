import { TruckbaseTMSAdapter } from './truckbase-tms.adapter';

describe('TruckbaseTMSAdapter - Real API', () => {
  let adapter: TruckbaseTMSAdapter;
  const realApiKey = process.env.TRUCKBASE_API_KEY;
  const realApiSecret = process.env.TRUCKBASE_API_SECRET;

  beforeEach(() => {
    adapter = new TruckbaseTMSAdapter();
  });

  it('should test connection with real API credentials', async () => {
    if (!realApiKey || !realApiSecret) {
      console.warn('Skipping real API test - credentials not set');
      return;
    }

    const result = await adapter.testConnection(realApiKey, realApiSecret);
    expect(result).toBe(true);
  }, 10000);

  it('should fetch active loads from real API', async () => {
    if (!realApiKey || !realApiSecret) {
      console.warn('Skipping real API test - credentials not set');
      return;
    }

    const loads = await adapter.getActiveLoads(realApiKey, realApiSecret);

    expect(Array.isArray(loads)).toBe(true);
    if (loads.length > 0) {
      expect(loads[0]).toHaveProperty('load_id');
      expect(loads[0]).toHaveProperty('pickup_location');
      expect(loads[0]).toHaveProperty('delivery_location');
    }
  }, 10000);

  it('should fetch a single load by ID', async () => {
    if (!realApiKey || !realApiSecret) {
      console.warn('Skipping real API test - credentials not set');
      return;
    }

    // First get active loads to find a valid load ID
    const loads = await adapter.getActiveLoads(realApiKey, realApiSecret);

    if (loads.length === 0) {
      console.warn('No active loads to test single load fetch');
      return;
    }

    const loadId = loads[0].load_id;
    const load = await adapter.getLoad(realApiKey, realApiSecret, loadId);

    expect(load).toBeDefined();
    expect(load.load_id).toBe(loadId);
    expect(load.data_source).toBe('truckbase_tms');
  }, 10000);

  it('should handle API errors gracefully', async () => {
    const invalidApiKey = 'invalid-key';
    const invalidApiSecret = 'invalid-secret';

    await expect(
      adapter.testConnection(invalidApiKey, invalidApiSecret)
    ).resolves.toBe(false);
  }, 10000);
});
