import { Test } from '@nestjs/testing';
import { LoadsSyncJob } from '../loads-sync.job';
import { PrismaService } from '../../database/prisma.service';
import { TmsSyncService } from '../../../domains/integrations/sync/tms-sync.service';

describe('LoadsSyncJob', () => {
  let job: LoadsSyncJob;
  let prisma: { integrationConfig: { findMany: jest.Mock } };
  let tmsSyncService: { syncLoads: jest.Mock };

  beforeEach(async () => {
    prisma = { integrationConfig: { findMany: jest.fn() } };
    tmsSyncService = { syncLoads: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        LoadsSyncJob,
        { provide: PrismaService, useValue: prisma },
        { provide: TmsSyncService, useValue: tmsSyncService },
      ],
    }).compile();

    job = module.get(LoadsSyncJob);
  });

  it('should sync loads from all active TMS integrations', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([
      { id: 1, integrationId: 'tms-1', tenantId: 10, vendor: 'MCLEOD_TMS' },
      { id: 2, integrationId: 'tms-2', tenantId: 20, vendor: 'PROJECT44_TMS' },
    ]);
    tmsSyncService.syncLoads.mockResolvedValue(undefined);

    await job.syncLoads();

    expect(prisma.integrationConfig.findMany).toHaveBeenCalledWith({
      where: {
        integrationType: 'TMS',
        isEnabled: true,
        status: 'ACTIVE',
      },
      select: { id: true, integrationId: true, tenantId: true, vendor: true },
    });
    expect(tmsSyncService.syncLoads).toHaveBeenCalledTimes(2);
    expect(tmsSyncService.syncLoads).toHaveBeenCalledWith(1);
    expect(tmsSyncService.syncLoads).toHaveBeenCalledWith(2);
  });

  it('should continue syncing if one integration fails', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([
      { id: 1, integrationId: 'tms-1', tenantId: 10, vendor: 'MCLEOD_TMS' },
      { id: 2, integrationId: 'tms-2', tenantId: 20, vendor: 'MCLEOD_TMS' },
    ]);
    tmsSyncService.syncLoads
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockResolvedValueOnce(undefined);

    await job.syncLoads();

    expect(tmsSyncService.syncLoads).toHaveBeenCalledTimes(2);
  });

  it('should do nothing when no active TMS integrations exist', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([]);

    await job.syncLoads();

    expect(tmsSyncService.syncLoads).not.toHaveBeenCalled();
  });
});
