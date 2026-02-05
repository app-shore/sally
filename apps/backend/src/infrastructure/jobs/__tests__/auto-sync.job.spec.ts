import { Test, TestingModule } from '@nestjs/testing';
import { AutoSyncJob } from '../auto-sync.job';
import { SyncService } from '../../services/sync/sync.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('AutoSyncJob', () => {
  let job: AutoSyncJob;
  let syncService: SyncService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoSyncJob,
        {
          provide: SyncService,
          useValue: {
            syncIntegration: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            integrationConfig: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    job = module.get<AutoSyncJob>(AutoSyncJob);
    syncService = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleAutoSync', () => {
    it('should sync integrations that are due', async () => {
      const now = new Date();
      const tmsLastSync = new Date(now.getTime() - 61 * 60 * 1000); // 61 minutes ago
      const eldLastSync = new Date(now.getTime() - 6 * 60 * 1000); // 6 minutes ago

      const mockIntegrations = [
        {
          id: 1,
          vendor: 'PROJECT44_TMS',
          syncIntervalSeconds: 3600, // 1 hour
          lastSyncAt: tmsLastSync,
        },
        {
          id: 2,
          vendor: 'SAMSARA_ELD',
          syncIntervalSeconds: 300, // 5 minutes
          lastSyncAt: eldLastSync,
        },
      ];

      jest
        .spyOn(prisma.integrationConfig, 'findMany')
        .mockResolvedValue(mockIntegrations as any);
      jest.spyOn(syncService, 'syncIntegration').mockResolvedValue();

      await job.handleAutoSync();

      // Both should be synced (61 min > 60 min, 6 min > 5 min)
      expect(syncService.syncIntegration).toHaveBeenCalledWith(1);
      expect(syncService.syncIntegration).toHaveBeenCalledWith(2);
    });

    it('should skip integrations that are not due', async () => {
      const now = new Date();
      const recentSync = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago

      const mockIntegrations = [
        {
          id: 1,
          vendor: 'SAMSARA_ELD',
          syncIntervalSeconds: 300, // 5 minutes
          lastSyncAt: recentSync,
        },
      ];

      jest
        .spyOn(prisma.integrationConfig, 'findMany')
        .mockResolvedValue(mockIntegrations as any);
      jest.spyOn(syncService, 'syncIntegration').mockResolvedValue();

      await job.handleAutoSync();

      // Should not sync (2 min < 5 min)
      expect(syncService.syncIntegration).not.toHaveBeenCalled();
    });

    it('should sync integrations that have never been synced', async () => {
      const mockIntegrations = [
        {
          id: 1,
          vendor: 'PROJECT44_TMS',
          syncIntervalSeconds: 3600,
          lastSyncAt: null,
        },
      ];

      jest
        .spyOn(prisma.integrationConfig, 'findMany')
        .mockResolvedValue(mockIntegrations as any);
      jest.spyOn(syncService, 'syncIntegration').mockResolvedValue();

      await job.handleAutoSync();

      expect(syncService.syncIntegration).toHaveBeenCalledWith(1);
    });

    it('should handle sync errors gracefully', async () => {
      const mockIntegrations = [
        {
          id: 1,
          vendor: 'PROJECT44_TMS',
          syncIntervalSeconds: 3600,
          lastSyncAt: null,
        },
      ];

      jest
        .spyOn(prisma.integrationConfig, 'findMany')
        .mockResolvedValue(mockIntegrations as any);
      jest
        .spyOn(syncService, 'syncIntegration')
        .mockRejectedValue(new Error('Sync failed'));

      const loggerSpy = jest.spyOn(job['logger'], 'error');

      await job.handleAutoSync();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-sync failed'),
        expect.any(Error),
      );
    });
  });
});
