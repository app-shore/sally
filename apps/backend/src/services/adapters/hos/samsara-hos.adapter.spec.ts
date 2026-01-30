import { SamsaraHOSAdapter } from './samsara-hos.adapter';

describe('SamsaraHOSAdapter - Real API', () => {
  let adapter: SamsaraHOSAdapter;
  const realApiKey = process.env.SAMSARA_API_KEY;

  beforeEach(() => {
    adapter = new SamsaraHOSAdapter();
  });

  it('should test connection with real API key', async () => {
    if (!realApiKey) {
      console.warn('Skipping real API test - SAMSARA_API_KEY not set');
      return;
    }

    const result = await adapter.testConnection(realApiKey);
    expect(result).toBe(true);
  }, 10000);

  it('should fetch driver HOS data from real API', async () => {
    if (!realApiKey) {
      console.warn('Skipping real API test - SAMSARA_API_KEY not set');
      return;
    }

    // Use a known test driver ID from your Samsara account
    const testDriverId = 'test-driver-id';
    const hosData = await adapter.getDriverHOS(realApiKey, testDriverId);

    expect(hosData).toBeDefined();
    expect(hosData.driver_id).toBe(testDriverId);
    expect(hosData.hours_driven).toBeGreaterThanOrEqual(0);
    expect(hosData.data_source).toBe('samsara_eld');
  }, 10000);
});
