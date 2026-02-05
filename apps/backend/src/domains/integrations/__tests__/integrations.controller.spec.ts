import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsController } from '../integrations.controller';
import { IntegrationsService } from '../integrations.service';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CredentialsService } from '../../../services/credentials/credentials.service';
import { IntegrationManagerService } from '../services/integration-manager.service';
import { SyncService } from '../../../services/sync/sync.service';

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
      jest
        .spyOn(service, 'triggerSync')
        .mockRejectedValue(new Error('Sync failed'));

      await expect(
        controller.triggerSync('test-integration-id'),
      ).rejects.toThrow('Sync failed');
    });
  });
});

describe('IntegrationsService - Credential Validation', () => {
  let service: IntegrationsService;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
    },
    integrationConfig: {
      create: jest.fn(),
    },
  };

  const mockCredentialsService = {
    encrypt: jest.fn((val) => `encrypted_${val}`),
  };

  const mockIntegrationManager = {};
  const mockSyncService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CredentialsService,
          useValue: mockCredentialsService,
        },
        {
          provide: IntegrationManagerService,
          useValue: mockIntegrationManager,
        },
        {
          provide: SyncService,
          useValue: mockSyncService,
        },
      ],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createIntegration - Credential Validation', () => {
    beforeEach(() => {
      mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 1 });
    });

    it('should reject unsupported vendor', async () => {
      const dto = {
        integration_type: 'TMS' as any,
        vendor: 'INVALID_VENDOR' as any,
        display_name: 'Test',
        credentials: {},
      };

      await expect(
        service.createIntegration('test-tenant', dto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createIntegration('test-tenant', dto),
      ).rejects.toThrow('Unsupported vendor: INVALID_VENDOR');
    });

    it('should reject missing required credentials', async () => {
      const dto = {
        integration_type: 'HOS_ELD' as any,
        vendor: 'SAMSARA_ELD' as any,
        display_name: 'Test Samsara',
        credentials: {}, // Missing apiToken
      };

      await expect(
        service.createIntegration('test-tenant', dto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createIntegration('test-tenant', dto),
      ).rejects.toThrow('Missing required credentials: apiToken');
    });

    it('should accept valid credentials', async () => {
      const dto = {
        integration_type: 'HOS_ELD' as any,
        vendor: 'SAMSARA_ELD' as any,
        display_name: 'Test Samsara',
        credentials: {
          apiToken: 'test-token-123',
        },
      };

      mockPrismaService.integrationConfig.create.mockResolvedValue({
        integrationId: 'int_123',
        integrationType: 'HOS_ELD',
        vendor: 'SAMSARA_ELD',
        displayName: 'Test Samsara',
        isEnabled: true,
        status: 'CONFIGURED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createIntegration('test-tenant', dto);
      expect(result).toBeDefined();
      expect(result.id).toBe('int_123');
    });
  });
});
