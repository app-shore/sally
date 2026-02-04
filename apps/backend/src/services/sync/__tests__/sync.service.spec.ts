import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from '../sync.service';
import { TmsSyncService } from '../tms-sync.service';
import { EldSyncService } from '../eld-sync.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('SyncService', () => {
  let service: SyncService;
  let tmsSyncService: TmsSyncService;
  let eldSyncService: EldSyncService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: TmsSyncService,
          useValue: {
            syncVehicles: jest.fn(),
            syncDrivers: jest.fn(),
          },
        },
        {
          provide: EldSyncService,
          useValue: {
            syncVehicles: jest.fn(),
            syncDrivers: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            integrationConfig: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    tmsSyncService = module.get<TmsSyncService>(TmsSyncService);
    eldSyncService = module.get<EldSyncService>(EldSyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncIntegration', () => {
    it('should sync TMS integration', async () => {
      jest.spyOn(prisma.integrationConfig, 'findUnique').mockResolvedValue({
        id: 1,
        vendor: 'PROJECT44_TMS',
      } as any);

      await service.syncIntegration(1);

      expect(tmsSyncService.syncVehicles).toHaveBeenCalledWith(1);
      expect(tmsSyncService.syncDrivers).toHaveBeenCalledWith(1);
    });

    it('should sync ELD integration', async () => {
      jest.spyOn(prisma.integrationConfig, 'findUnique').mockResolvedValue({
        id: 2,
        vendor: 'SAMSARA_ELD',
      } as any);

      await service.syncIntegration(2);

      expect(eldSyncService.syncVehicles).toHaveBeenCalledWith(2);
      expect(eldSyncService.syncDrivers).toHaveBeenCalledWith(2);
    });

    it('should throw error for unsupported vendor', async () => {
      jest.spyOn(prisma.integrationConfig, 'findUnique').mockResolvedValue({
        id: 3,
        vendor: 'UNKNOWN_VENDOR',
      } as any);

      await expect(service.syncIntegration(3)).rejects.toThrow('Unsupported vendor');
    });
  });

  describe('syncFleet', () => {
    it('should sync both TMS and ELD in sequence', async () => {
      jest.spyOn(prisma.integrationConfig, 'findMany').mockResolvedValue([
        { id: 1, vendor: 'PROJECT44_TMS', isEnabled: true } as any,
        { id: 2, vendor: 'SAMSARA_ELD', isEnabled: true } as any,
      ]);

      jest.spyOn(prisma.integrationConfig, 'findUnique')
        .mockResolvedValueOnce({ id: 1, vendor: 'PROJECT44_TMS' } as any)
        .mockResolvedValueOnce({ id: 2, vendor: 'SAMSARA_ELD' } as any);

      jest.spyOn(tmsSyncService, 'syncVehicles').mockResolvedValue();
      jest.spyOn(tmsSyncService, 'syncDrivers').mockResolvedValue();
      jest.spyOn(eldSyncService, 'syncVehicles').mockResolvedValue();
      jest.spyOn(eldSyncService, 'syncDrivers').mockResolvedValue();

      await service.syncFleet(1);

      expect(tmsSyncService.syncVehicles).toHaveBeenCalledWith(1);
      expect(tmsSyncService.syncDrivers).toHaveBeenCalledWith(1);
      expect(eldSyncService.syncVehicles).toHaveBeenCalledWith(2);
      expect(eldSyncService.syncDrivers).toHaveBeenCalledWith(2);
    });

    it('should sync TMS before ELD', async () => {
      const callOrder: string[] = [];

      jest.spyOn(prisma.integrationConfig, 'findMany').mockResolvedValue([
        { id: 2, vendor: 'SAMSARA_ELD', isEnabled: true } as any,
        { id: 1, vendor: 'PROJECT44_TMS', isEnabled: true } as any,
      ]);

      jest.spyOn(prisma.integrationConfig, 'findUnique')
        .mockResolvedValueOnce({ id: 1, vendor: 'PROJECT44_TMS' } as any)
        .mockResolvedValueOnce({ id: 2, vendor: 'SAMSARA_ELD' } as any);

      jest.spyOn(tmsSyncService, 'syncVehicles').mockImplementation(async () => {
        callOrder.push('TMS');
      });
      jest.spyOn(tmsSyncService, 'syncDrivers').mockResolvedValue();
      jest.spyOn(eldSyncService, 'syncVehicles').mockImplementation(async () => {
        callOrder.push('ELD');
      });
      jest.spyOn(eldSyncService, 'syncDrivers').mockResolvedValue();

      await service.syncFleet(1);

      expect(callOrder).toEqual(['TMS', 'ELD']);
    });
  });
});
