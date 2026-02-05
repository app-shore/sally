/**
 * Tests for integrations API client
 */

import { triggerSync, syncFleet } from '../integrations';
import { apiClient } from '@/shared/lib/api';

// Mock the apiClient
jest.mock('@/shared/lib/api', () => ({
  apiClient: jest.fn(),
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe('Integrations API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerSync', () => {
    it('should call POST /integrations/:id/sync', async () => {
      const mockResponse = {
        success: true,
        message: 'Sync completed successfully',
        records_processed: 10,
        records_created: 5,
        records_updated: 5,
      };

      mockApiClient.mockResolvedValue(mockResponse);

      const result = await triggerSync('integration-1');

      expect(mockApiClient).toHaveBeenCalledWith(
        '/integrations/integration-1/sync',
        { method: 'POST' }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors from API', async () => {
      const mockError = new Error('Failed to sync integration');
      mockApiClient.mockRejectedValue(mockError);

      await expect(triggerSync('integration-1')).rejects.toThrow('Failed to sync integration');
    });
  });

  describe('syncFleet', () => {
    it('should call POST /fleet/sync', async () => {
      const mockResponse = {
        message: 'Fleet sync completed successfully',
      };

      mockApiClient.mockResolvedValue(mockResponse);

      const result = await syncFleet();

      expect(mockApiClient).toHaveBeenCalledWith(
        '/fleet/sync',
        { method: 'POST' }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors from API', async () => {
      const mockError = new Error('Failed to sync fleet');
      mockApiClient.mockRejectedValue(mockError);

      await expect(syncFleet()).rejects.toThrow('Failed to sync fleet');
    });
  });
});
