import { Test } from '@nestjs/testing';
import { TelematicsSyncJob } from '../telematics-sync.job';
import { PrismaService } from '../../database/prisma.service';
import { AdapterFactoryService } from '../../../domains/integrations/adapters/adapter-factory.service';
import { CredentialsService } from '../../../domains/integrations/credentials/credentials.service';

describe('TelematicsSyncJob', () => {
  let job: TelematicsSyncJob;
  let prisma: {
    integrationConfig: { findMany: jest.Mock };
    vehicle: { findFirst: jest.Mock };
    vehicleTelematics: { upsert: jest.Mock };
  };
  let adapterFactory: { getELDAdapter: jest.Mock };
  let credentials: { decrypt: jest.Mock };

  const mockAdapter = {
    getVehicleLocations: jest.fn(),
  };

  beforeEach(async () => {
    mockAdapter.getVehicleLocations.mockReset();
    prisma = {
      integrationConfig: { findMany: jest.fn() },
      vehicle: { findFirst: jest.fn() },
      vehicleTelematics: { upsert: jest.fn() },
    };
    adapterFactory = { getELDAdapter: jest.fn() };
    credentials = { decrypt: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        TelematicsSyncJob,
        { provide: PrismaService, useValue: prisma },
        { provide: AdapterFactoryService, useValue: adapterFactory },
        { provide: CredentialsService, useValue: credentials },
      ],
    }).compile();

    job = module.get(TelematicsSyncJob);
  });

  it('should upsert telematics for matched vehicles', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([
      {
        id: 1,
        integrationId: 'eld-1',
        tenantId: 10,
        vendor: 'SAMSARA_ELD',
        credentials: { apiToken: 'encrypted-token' },
      },
    ]);
    credentials.decrypt.mockReturnValue('real-token');
    adapterFactory.getELDAdapter.mockReturnValue(mockAdapter);
    mockAdapter.getVehicleLocations.mockResolvedValue([
      {
        vehicleId: 'v1',
        vin: '1FUJGHDV9JLJY8062',
        latitude: 32.77,
        longitude: -96.80,
        speed: 60,
        heading: 180,
        odometer: 145000,
        fuelLevel: 72,
        engineRunning: true,
        timestamp: '2026-02-11T12:00:00Z',
      },
    ]);
    prisma.vehicle.findFirst.mockResolvedValue({ id: 100 });
    prisma.vehicleTelematics.upsert.mockResolvedValue({});

    await job.syncTelematics();

    expect(prisma.vehicleTelematics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vehicleId: 100 },
        update: expect.objectContaining({
          latitude: 32.77,
          longitude: -96.80,
          speed: 60,
        }),
        create: expect.objectContaining({
          vehicleId: 100,
          tenantId: 10,
          latitude: 32.77,
        }),
      }),
    );
  });

  it('should skip unmatched vehicles', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([
      {
        id: 1,
        integrationId: 'eld-1',
        tenantId: 10,
        vendor: 'SAMSARA_ELD',
        credentials: { apiToken: 'encrypted-token' },
      },
    ]);
    credentials.decrypt.mockReturnValue('real-token');
    adapterFactory.getELDAdapter.mockReturnValue(mockAdapter);
    mockAdapter.getVehicleLocations.mockResolvedValue([
      {
        vehicleId: 'unknown-v',
        latitude: 32.77,
        longitude: -96.80,
        speed: 0,
        heading: 0,
        odometer: 0,
        engineRunning: false,
        timestamp: '2026-02-11T12:00:00Z',
      },
    ]);
    prisma.vehicle.findFirst.mockResolvedValue(null);

    await job.syncTelematics();

    expect(prisma.vehicleTelematics.upsert).not.toHaveBeenCalled();
  });

  it('should continue syncing if one integration fails', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([
      {
        id: 1,
        integrationId: 'eld-1',
        tenantId: 10,
        vendor: 'SAMSARA_ELD',
        credentials: { apiToken: 'token1' },
      },
      {
        id: 2,
        integrationId: 'eld-2',
        tenantId: 20,
        vendor: 'SAMSARA_ELD',
        credentials: { apiToken: 'token2' },
      },
    ]);
    credentials.decrypt.mockReturnValue('real-token');
    adapterFactory.getELDAdapter.mockReturnValue(mockAdapter);
    mockAdapter.getVehicleLocations
      .mockRejectedValueOnce(new Error('API timeout'))
      .mockResolvedValueOnce([]);

    await job.syncTelematics();

    expect(mockAdapter.getVehicleLocations).toHaveBeenCalledTimes(2);
  });

  it('should do nothing when no active ELD integrations exist', async () => {
    prisma.integrationConfig.findMany.mockResolvedValue([]);

    await job.syncTelematics();

    expect(adapterFactory.getELDAdapter).not.toHaveBeenCalled();
  });
});
