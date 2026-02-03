import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from '../integrations.controller';
import { IntegrationsService } from '../integrations.service';

describe('IntegrationsController - Sync Endpoints', () => {
  let controller: IntegrationsController;
  let service: IntegrationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        {
          provide: IntegrationsService,
          useValue: {
            triggerSync: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IntegrationsController>(IntegrationsController);
    service = module.get<IntegrationsService>(IntegrationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /integrations/:integrationId/sync', () => {
    it('should trigger manual sync for integration', async () => {
      jest.spyOn(service, 'triggerSync').mockResolvedValue({
        success: true,
        message: 'Sync completed',
      });

      const result = await controller.triggerSync('test-integration-id');

      expect(service.triggerSync).toHaveBeenCalledWith('test-integration-id');
      expect(result).toEqual({ success: true, message: 'Sync completed' });
    });

    it('should return error if sync fails', async () => {
      jest.spyOn(service, 'triggerSync').mockRejectedValue(new Error('Sync failed'));

      await expect(controller.triggerSync('test-integration-id')).rejects.toThrow('Sync failed');
    });
  });
});
