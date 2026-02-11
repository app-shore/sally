import { Test } from '@nestjs/testing';
import { VehiclesSyncJob } from '../vehicles-sync.job';
import { PrismaService } from '../../database/prisma.service';
import { TmsSyncService } from '../../../domains/integrations/sync/tms-sync.service';
import { EldSyncService } from '../../../domains/integrations/sync/eld-sync.service';

describe('VehiclesSyncJob', () => {
  let job: VehiclesSyncJob;
  let prisma: { integrationConfig: { findMany: jest.Mock } };
  let tmsSyncService: { syncVehicles: jest.Mock };
  let eldSyncService: { syncVehicles: jest.Mock };

  beforeEach(async () => {
    prisma = { integrationConfig: { findMany: jest.fn() } };
    tmsSyncService = { syncVehicles: jest.fn() };
    eldSyncService = { syncVehicles: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        VehiclesSyncJob,
        { provide: PrismaService, useValue: prisma },
        { provide: TmsSyncService, useValue: tmsSyncService },
        { provide: EldSyncService, useValue: eldSyncService },
      ],
    }).compile();

    job = module.get(VehiclesSyncJob);
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

    tmsSyncService.syncVehicles.mockImplementation(async () => {
      callOrder.push('tms');
    });
    eldSyncService.syncVehicles.mockImplementation(async () => {
      callOrder.push('eld');
    });

    await job.syncVehicles();

    expect(callOrder).toEqual(['tms', 'eld']);
    expect(tmsSyncService.syncVehicles).toHaveBeenCalledWith(1);
    expect(eldSyncService.syncVehicles).toHaveBeenCalledWith(2);
  });

  it('should continue syncing remaining integrations if one fails', async () => {
    prisma.integrationConfig.findMany
      .mockResolvedValueOnce([
        { id: 1, integrationId: 'tms-1', tenantId: 10, vendor: 'MCLEOD_TMS' },
        { id: 2, integrationId: 'tms-2', tenantId: 20, vendor: 'MCLEOD_TMS' },
      ])
      .mockResolvedValueOnce([]);

    tmsSyncService.syncVehicles
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockResolvedValueOnce(undefined);

    await job.syncVehicles();

    expect(tmsSyncService.syncVehicles).toHaveBeenCalledTimes(2);
  });

  it('should handle empty integrations gracefully', async () => {
    prisma.integrationConfig.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await job.syncVehicles();

    expect(tmsSyncService.syncVehicles).not.toHaveBeenCalled();
    expect(eldSyncService.syncVehicles).not.toHaveBeenCalled();
  });
});
