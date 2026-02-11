import { Test } from '@nestjs/testing';
import { SyncLogCleanupJob } from '../sync-log-cleanup.job';
import { PrismaService } from '../../database/prisma.service';

describe('SyncLogCleanupJob', () => {
  let job: SyncLogCleanupJob;
  let prisma: { integrationSyncLog: { deleteMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { integrationSyncLog: { deleteMany: jest.fn() } };

    const module = await Test.createTestingModule({
      providers: [
        SyncLogCleanupJob,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    job = module.get(SyncLogCleanupJob);
  });

  it('should delete sync logs older than 30 days', async () => {
    prisma.integrationSyncLog.deleteMany.mockResolvedValue({ count: 42 });

    await job.cleanupOldSyncLogs();

    const call = prisma.integrationSyncLog.deleteMany.mock.calls[0][0];
    expect(call.where.createdAt.lt).toBeInstanceOf(Date);

    // Verify the cutoff is approximately 30 days ago
    const cutoff = call.where.createdAt.lt as Date;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const diff = Date.now() - cutoff.getTime();
    expect(diff).toBeGreaterThan(thirtyDaysMs - 60000);
    expect(diff).toBeLessThan(thirtyDaysMs + 60000);
  });

  it('should handle errors gracefully', async () => {
    prisma.integrationSyncLog.deleteMany.mockRejectedValue(new Error('DB error'));

    await expect(job.cleanupOldSyncLogs()).resolves.not.toThrow();
  });
});
