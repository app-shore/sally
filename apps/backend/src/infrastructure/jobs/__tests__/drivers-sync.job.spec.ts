import { Test } from '@nestjs/testing';
import { DriversSyncJob } from '../drivers-sync.job';
import { PrismaService } from '../../database/prisma.service';
import { TmsSyncService } from '../../../domains/integrations/sync/tms-sync.service';
import { EldSyncService } from '../../../domains/integrations/sync/eld-sync.service';

describe('DriversSyncJob', () => {
  let job: DriversSyncJob;
  let prisma: { integrationConfig: { findMany: jest.Mock } };
  let tmsSyncService: { syncDrivers: jest.Mock };
  let eldSyncService: { syncDrivers: jest.Mock };

  beforeEach(async () => {
    prisma = { integrationConfig: { findMany: jest.fn() } };
    tmsSyncService = { syncDrivers: jest.fn() };
    eldSyncService = { syncDrivers: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        DriversSyncJob,
        { provide: PrismaService, useValue: prisma },
        { provide: TmsSyncService, useValue: tmsSyncService },
        { provide: EldSyncService, useValue: eldSyncService },
      ],
    }).compile();

    job = module.get(DriversSyncJob);
  });

  it('should sync TMS first then ELD', async () => {
    const callOrder: string[] = [];

    prisma.integrationConfig.findMany
      .mockResolvedValueOnce([
        { id: 1, integrationId: 'tms-1', tenantId: 10, vendor: 'MCLEOD_TMS' },
      ])
      .mockResolvedValueOnce([
        { id: 2, integrationId: 'eld-1', tenantId: 10, vendor: 'SAMSARA_ELD' },
      ]);

    tmsSyncService.syncDrivers.mockImplementation(async () => {
      callOrder.push('tms');
    });
    eldSyncService.syncDrivers.mockImplementation(async () => {
      callOrder.push('eld');
    });

    await job.syncDrivers();

    expect(callOrder).toEqual(['tms', 'eld']);
    expect(tmsSyncService.syncDrivers).toHaveBeenCalledWith(1);
    expect(eldSyncService.syncDrivers).toHaveBeenCalledWith(2);
  });

  it('should continue ELD sync even if TMS fails', async () => {
    prisma.integrationConfig.findMany
      .mockResolvedValueOnce([
        { id: 1, integrationId: 'tms-1', tenantId: 10, vendor: 'MCLEOD_TMS' },
      ])
      .mockResolvedValueOnce([
        { id: 2, integrationId: 'eld-1', tenantId: 10, vendor: 'SAMSARA_ELD' },
      ]);

    tmsSyncService.syncDrivers.mockRejectedValue(new Error('TMS API timeout'));
    eldSyncService.syncDrivers.mockResolvedValue(undefined);

    await job.syncDrivers();

    expect(eldSyncService.syncDrivers).toHaveBeenCalledWith(2);
  });

  it('should continue syncing remaining integrations if one ELD fails', async () => {
    prisma.integrationConfig.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 1, integrationId: 'eld-1', tenantId: 10, vendor: 'SAMSARA_ELD' },
        { id: 2, integrationId: 'eld-2', tenantId: 20, vendor: 'SAMSARA_ELD' },
      ]);

    eldSyncService.syncDrivers
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce(undefined);

    await job.syncDrivers();

    expect(eldSyncService.syncDrivers).toHaveBeenCalledTimes(2);
  });

  it('should handle empty integrations gracefully', async () => {
    prisma.integrationConfig.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await job.syncDrivers();

    expect(tmsSyncService.syncDrivers).not.toHaveBeenCalled();
    expect(eldSyncService.syncDrivers).not.toHaveBeenCalled();
  });
});
