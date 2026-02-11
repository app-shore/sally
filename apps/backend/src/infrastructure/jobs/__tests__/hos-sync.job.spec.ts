import { Test } from '@nestjs/testing';
import { HosSyncJob } from '../hos-sync.job';
import { PrismaService } from '../../database/prisma.service';
import { IntegrationManagerService } from '../../../domains/integrations/services/integration-manager.service';

describe('HosSyncJob', () => {
  let job: HosSyncJob;
  let prisma: { integrationConfig: { findMany: jest.Mock } };
  let integrationManager: { syncAllDriversForTenant: jest.Mock };

  beforeEach(async () => {
    prisma = { integrationConfig: { findMany: jest.fn() } };
    integrationManager = { syncAllDriversForTenant: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        HosSyncJob,
        { provide: PrismaService, useValue: prisma },
        { provide: IntegrationManagerService, useValue: integrationManager },
      ],
    }).compile();

    job = module.get(HosSyncJob);
  });

  it('should sync HOS for all tenants with active ELD integrations', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([
      { id: 1, integrationId: 'eld-1', tenantId: 10, vendor: 'SAMSARA_ELD' },
      { id: 2, integrationId: 'eld-2', tenantId: 20, vendor: 'SAMSARA_ELD' },
    ]);
    integrationManager.syncAllDriversForTenant.mockResolvedValue(undefined);

    await job.syncHos();

    expect(integrationManager.syncAllDriversForTenant).toHaveBeenCalledTimes(2);
    expect(integrationManager.syncAllDriversForTenant).toHaveBeenCalledWith(10);
    expect(integrationManager.syncAllDriversForTenant).toHaveBeenCalledWith(20);
  });

  it('should deduplicate tenants with multiple ELD integrations', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([
      { id: 1, integrationId: 'eld-1', tenantId: 10, vendor: 'SAMSARA_ELD' },
      { id: 2, integrationId: 'eld-2', tenantId: 10, vendor: 'KEEPTRUCKIN_ELD' },
      { id: 3, integrationId: 'eld-3', tenantId: 20, vendor: 'SAMSARA_ELD' },
    ]);
    integrationManager.syncAllDriversForTenant.mockResolvedValue(undefined);

    await job.syncHos();

    // Tenant 10 should only be synced once despite having 2 ELD integrations
    expect(integrationManager.syncAllDriversForTenant).toHaveBeenCalledTimes(2);
    expect(integrationManager.syncAllDriversForTenant).toHaveBeenCalledWith(10);
    expect(integrationManager.syncAllDriversForTenant).toHaveBeenCalledWith(20);
  });

  it('should continue syncing if one tenant fails', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([
      { id: 1, integrationId: 'eld-1', tenantId: 10, vendor: 'SAMSARA_ELD' },
      { id: 2, integrationId: 'eld-2', tenantId: 20, vendor: 'SAMSARA_ELD' },
    ]);
    integrationManager.syncAllDriversForTenant
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce(undefined);

    await job.syncHos();

    expect(integrationManager.syncAllDriversForTenant).toHaveBeenCalledTimes(2);
  });

  it('should do nothing when no active ELD integrations exist', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([]);

    await job.syncHos();

    expect(integrationManager.syncAllDriversForTenant).not.toHaveBeenCalled();
  });
});
