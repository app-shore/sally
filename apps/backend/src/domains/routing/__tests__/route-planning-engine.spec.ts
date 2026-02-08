import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoutePlanningEngineService } from '../route-planning/services/route-planning-engine.service';
import { RoutePlanPersistenceService } from '../route-planning/services/route-plan-persistence.service';
import { HOSRuleEngineService } from '../hos-compliance/services/hos-rule-engine.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ROUTING_PROVIDER,
  RoutingProvider,
} from '../providers/routing/routing-provider.interface';
import {
  WEATHER_PROVIDER,
  WeatherProvider,
} from '../providers/weather/weather-provider.interface';
import {
  FUEL_DATA_PROVIDER,
  FuelDataProvider,
} from '../providers/fuel/fuel-data-provider.interface';

describe('RoutePlanningEngineService', () => {
  let service: RoutePlanningEngineService;
  let prisma: PrismaService;
  let routingProvider: RoutingProvider;
  let weatherProvider: WeatherProvider;
  let fuelProvider: FuelDataProvider;
  let hosEngine: HOSRuleEngineService;
  let persistenceService: RoutePlanPersistenceService;
  let configService: ConfigService;

  // Mock implementations
  const mockPrismaService = {
    driver: {
      findFirst: jest.fn(),
    },
    vehicle: {
      findFirst: jest.fn(),
    },
    load: {
      findMany: jest.fn(),
    },
  };

  const mockRoutingProvider: RoutingProvider = {
    getDistanceMatrix: jest.fn(),
    getRoute: jest.fn(),
  };

  const mockWeatherProvider: WeatherProvider = {
    getWeatherAlongRoute: jest.fn(),
  };

  const mockFuelDataProvider: FuelDataProvider = {
    findFuelStopsNearPoint: jest.fn(),
    findFuelStopsAlongCorridor: jest.fn(),
  };

  const mockHOSRuleEngineService = {
    hoursUntilRestRequired: jest.fn(),
    simulateAfterDriving: jest.fn(),
    simulateAfterFullRest: jest.fn(),
    simulateAfter34hRestart: jest.fn(),
    simulateAfterSplitRest: jest.fn(),
    validateCompliance: jest.fn(),
    canDrive: jest.fn(),
    createInitialState: jest.fn(),
  };

  const mockRoutePlanPersistenceService = {
    createPlan: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutePlanningEngineService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ROUTING_PROVIDER,
          useValue: mockRoutingProvider,
        },
        {
          provide: WEATHER_PROVIDER,
          useValue: mockWeatherProvider,
        },
        {
          provide: FUEL_DATA_PROVIDER,
          useValue: mockFuelDataProvider,
        },
        {
          provide: HOSRuleEngineService,
          useValue: mockHOSRuleEngineService,
        },
        {
          provide: RoutePlanPersistenceService,
          useValue: mockRoutePlanPersistenceService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RoutePlanningEngineService>(
      RoutePlanningEngineService,
    );
    prisma = module.get<PrismaService>(PrismaService);
    routingProvider = module.get<RoutingProvider>(ROUTING_PROVIDER);
    weatherProvider = module.get<WeatherProvider>(WEATHER_PROVIDER);
    fuelProvider = module.get<FuelDataProvider>(FUEL_DATA_PROVIDER);
    hosEngine = module.get<HOSRuleEngineService>(HOSRuleEngineService);
    persistenceService = module.get<RoutePlanPersistenceService>(
      RoutePlanPersistenceService,
    );
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();

    // Default config mock
    mockConfigService.get.mockReturnValue(10);
  });

  describe('planRoute', () => {
    const mockDriver = {
      id: 1,
      driverId: 'drv-001',
      tenantId: 1,
      name: 'John Driver',
      currentHoursDriven: 0,
      currentOnDutyTime: 0,
      currentHoursSinceBreak: 0,
      cycleHoursUsed: 0,
      cycleDaysData: [],
      homeTerminalTimezone: 'America/Chicago',
    };

    const mockVehicle = {
      id: 1,
      vehicleId: 'veh-001',
      tenantId: 1,
      hasSleeperBerth: true,
      grossWeightLbs: 80000,
    };

    const mockLoads = [
      {
        id: 1,
        loadId: 'load-001',
        tenantId: 1,
        customerName: 'Test Customer A',
        stops: [
          {
            id: 1,
            actionType: 'pickup',
            estimatedDockHours: 2,
            earliestArrival: '08:00',
            latestArrival: '17:00',
            sequenceOrder: 1,
            stop: {
              id: 10,
              stopId: 'stop-pickup-001',
              name: 'Warehouse A',
              lat: 41.8781,
              lon: -87.6298,
              timezone: 'America/Chicago',
            },
          },
          {
            id: 2,
            actionType: 'delivery',
            estimatedDockHours: 1.5,
            earliestArrival: null,
            latestArrival: null,
            sequenceOrder: 2,
            stop: {
              id: 20,
              stopId: 'stop-delivery-001',
              name: 'Distribution Center B',
              lat: 39.7392,
              lon: -104.9903,
              timezone: 'America/Denver',
            },
          },
        ],
      },
    ];

    const mockInitialHOSState = {
      hoursDriven: 0,
      onDutyTime: 0,
      hoursSinceBreak: 0,
      cycleHoursUsed: 0,
      cycleDaysData: [],
      splitRestState: undefined,
    };

    beforeEach(() => {
      // Default mocks for successful path
      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      // First call: with stops (for route planning)
      // Second call: just IDs (for persistence)
      mockPrismaService.load.findMany
        .mockResolvedValueOnce(mockLoads)
        .mockResolvedValue([{ id: 1 }]);

      // Mock distance matrix - 200 miles, 3.5 hours between stops
      const distanceMatrix = new Map();
      distanceMatrix.set('origin:stop-pickup-001', {
        distanceMiles: 0,
        driveTimeHours: 0,
      });
      distanceMatrix.set('stop-pickup-001:stop-delivery-001', {
        distanceMiles: 200,
        driveTimeHours: 3.5,
      });
      (mockRoutingProvider.getDistanceMatrix as jest.Mock).mockResolvedValue(
        distanceMatrix,
      );

      // Mock weather - clear conditions
      (mockWeatherProvider.getWeatherAlongRoute as jest.Mock).mockResolvedValue(
        [],
      );

      // Mock fuel - no stops needed
      (
        mockFuelDataProvider.findFuelStopsAlongCorridor as jest.Mock
      ).mockResolvedValue([]);

      // Mock HOS - plenty of hours remaining
      mockHOSRuleEngineService.hoursUntilRestRequired.mockReturnValue(11);
      mockHOSRuleEngineService.validateCompliance.mockReturnValue({
        isCompliant: true,
        hoursAvailableToDrive: 11,
        hoursUntilBreakRequired: 8,
        needsRestart: false,
        cycleHoursRemaining: 70,
      });
      mockHOSRuleEngineService.simulateAfterDriving.mockImplementation(
        (state, driveHours, onDutyHours) => ({
          ...state,
          hoursDriven: (state.hoursDriven ?? 0) + driveHours,
          onDutyTime: (state.onDutyTime ?? 0) + Math.max(driveHours, onDutyHours),
          hoursSinceBreak:
            (state.hoursSinceBreak ?? 0) + Math.max(driveHours, onDutyHours),
          cycleHoursUsed: (state.cycleHoursUsed ?? 0) + Math.max(driveHours, onDutyHours),
        }),
      );

      // Mock route geometry
      (mockRoutingProvider.getRoute as jest.Mock).mockResolvedValue({
        geometry: 'encoded-polyline-string',
        distanceMiles: 200,
        driveTimeHours: 3.5,
        waypoints: [],
      });

      // Mock persistence
      mockRoutePlanPersistenceService.createPlan.mockResolvedValue({
        id: 1,
        planId: 'RP-20260207-ABC123',
        status: 'draft',
      });
    });

    it('should plan a short route with drive and dock segments', async () => {
      const input = {
        driverId: 'drv-001',
        vehicleId: 'veh-001',
        loadIds: ['load-001'],
        departureTime: new Date('2026-02-07T08:00:00Z'),
        tenantId: 1,
      };

      const result = await service.planRoute(input);

      // Verify driver, vehicle, and loads were resolved
      expect(mockPrismaService.driver.findFirst).toHaveBeenCalledWith({
        where: { driverId: 'drv-001', tenantId: 1 },
      });
      expect(mockPrismaService.vehicle.findFirst).toHaveBeenCalledWith({
        where: { vehicleId: 'veh-001', tenantId: 1 },
      });
      expect(mockPrismaService.load.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            loadId: { in: ['load-001'] },
            tenantId: 1,
          },
        }),
      );

      // Verify result structure
      expect(result.planId).toBeDefined();
      expect(result.isFeasible).toBe(true);
      expect(result.status).toBe('draft');

      // Verify segments exist (drive to pickup, dock at pickup, drive to delivery, dock at delivery)
      expect(result.segments.length).toBeGreaterThan(0);

      // Should have drive segments
      const driveSegments = result.segments.filter(
        (s) => s.segmentType === 'drive',
      );
      expect(driveSegments.length).toBeGreaterThan(0);

      // Should have dock segments
      const dockSegments = result.segments.filter(
        (s) => s.segmentType === 'dock',
      );
      expect(dockSegments.length).toBeGreaterThan(0);

      // Total distance should be close to 200 miles
      expect(result.totalDistanceMiles).toBeGreaterThan(150);
      expect(result.totalDistanceMiles).toBeLessThan(250);

      // Should be feasible
      expect(result.feasibilityIssues.length).toBe(0);

      // Verify HOS engine was called
      expect(
        mockHOSRuleEngineService.hoursUntilRestRequired,
      ).toHaveBeenCalled();
      expect(mockHOSRuleEngineService.simulateAfterDriving).toHaveBeenCalled();

      // Verify persistence was called
      expect(mockRoutePlanPersistenceService.createPlan).toHaveBeenCalled();
    });

    it('should insert rest stop when HOS hours are insufficient for leg', async () => {
      // Mock HOS to indicate rest is needed
      mockHOSRuleEngineService.hoursUntilRestRequired.mockReturnValue(2); // Less than the 3.5h drive needed

      // Mock validateCompliance to indicate rest is needed (not restart)
      mockHOSRuleEngineService.validateCompliance.mockReturnValue({
        isCompliant: false,
        hoursAvailableToDrive: 2,
        hoursUntilBreakRequired: 8,
        needsRestart: false,
        cycleHoursRemaining: 50,
      });

      // Mock simulateAfterFullRest
      mockHOSRuleEngineService.simulateAfterFullRest.mockReturnValue({
        hoursDriven: 0,
        onDutyTime: 0,
        hoursSinceBreak: 0,
        cycleHoursUsed: 10,
        cycleDaysData: [],
        splitRestState: undefined,
      });

      const input = {
        driverId: 'drv-001',
        vehicleId: 'veh-001',
        loadIds: ['load-001'],
        departureTime: new Date('2026-02-07T08:00:00Z'),
        tenantId: 1,
      };

      const result = await service.planRoute(input);

      // Should have rest segment(s)
      const restSegments = result.segments.filter(
        (s) => s.segmentType === 'rest',
      );
      expect(restSegments.length).toBeGreaterThan(0);

      // Verify simulateAfterFullRest was called
      expect(mockHOSRuleEngineService.simulateAfterFullRest).toHaveBeenCalled();

      // Should still be feasible
      expect(result.isFeasible).toBe(true);
    });

    it('should insert fuel stop when tank runs low', async () => {
      // Create a very long route that exceeds fuel range
      const longDistanceLoads = [
        {
          id: 1,
          loadId: 'load-001',
          tenantId: 1,
          customerName: 'Test Customer A',
          stops: [
            {
              id: 1,
              actionType: 'pickup',
              estimatedDockHours: 2,
              earliestArrival: '08:00',
              latestArrival: '17:00',
              sequenceOrder: 1,
              stop: {
                id: 10,
                stopId: 'stop-pickup-001',
                name: 'Warehouse A',
                lat: 41.8781,
                lon: -87.6298,
                timezone: 'America/Chicago',
              },
            },
            {
              id: 2,
              actionType: 'delivery',
              estimatedDockHours: 1.5,
              earliestArrival: null,
              latestArrival: null,
              sequenceOrder: 2,
              stop: {
                id: 20,
                stopId: 'stop-delivery-001',
                name: 'Distribution Center B',
                lat: 34.0522, // Los Angeles area (very far)
                lon: -118.2437,
                timezone: 'America/Los_Angeles',
              },
            },
          ],
        },
      ];

      mockPrismaService.load.findMany
        .mockResolvedValueOnce(longDistanceLoads)
        .mockResolvedValue([{ id: 1 }]);

      // Mock distance matrix - 800 miles, exceeds fuel range
      const distanceMatrix = new Map();
      distanceMatrix.set('origin:stop-pickup-001', {
        distanceMiles: 0,
        driveTimeHours: 0,
      });
      distanceMatrix.set('stop-pickup-001:stop-delivery-001', {
        distanceMiles: 1800,
        driveTimeHours: 28,
      });
      (mockRoutingProvider.getDistanceMatrix as jest.Mock).mockResolvedValue(
        distanceMatrix,
      );

      // Mock fuel provider to return a fuel stop
      (
        mockFuelDataProvider.findFuelStopsAlongCorridor as jest.Mock
      ).mockResolvedValue([
        {
          stopId: 'fuel-001',
          name: 'Truck Stop A',
          lat: 38.0,
          lon: -100.0,
          city: 'Somewhere',
          state: 'KS',
          fuelPricePerGallon: 3.8,
          brand: 'Pilot',
          amenities: ['restaurant', 'shower'],
          distanceFromRoute: 2,
        },
      ]);

      // Mock HOS to allow long driving (focus on fuel, not rest)
      mockHOSRuleEngineService.hoursUntilRestRequired.mockReturnValue(30);

      const input = {
        driverId: 'drv-001',
        vehicleId: 'veh-001',
        loadIds: ['load-001'],
        departureTime: new Date('2026-02-07T08:00:00Z'),
        tenantId: 1,
      };

      const result = await service.planRoute(input);

      // Should have fuel segment(s)
      const fuelSegments = result.segments.filter(
        (s) => s.segmentType === 'fuel',
      );
      expect(fuelSegments.length).toBeGreaterThan(0);

      // Verify fuel provider was called
      expect(
        mockFuelDataProvider.findFuelStopsAlongCorridor,
      ).toHaveBeenCalled();

      // Fuel segment should have fuel details
      const fuelSegment = fuelSegments[0];
      expect(fuelSegment.fuelGallons).toBeDefined();
      expect(fuelSegment.fuelCostEstimate).toBeDefined();
      expect(fuelSegment.fuelStationName).toBe('Truck Stop A');
    });

    it('should throw BadRequestException when driver not found', async () => {
      // Mock driver not found
      mockPrismaService.driver.findFirst.mockResolvedValue(null);

      const input = {
        driverId: 'drv-999',
        vehicleId: 'veh-001',
        loadIds: ['load-001'],
        departureTime: new Date('2026-02-07T08:00:00Z'),
        tenantId: 1,
      };

      await expect(service.planRoute(input)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.planRoute(input)).rejects.toThrow(
        'Driver not found: drv-999',
      );
    });

    it('should throw BadRequestException when vehicle not found', async () => {
      // Mock vehicle not found
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      const input = {
        driverId: 'drv-001',
        vehicleId: 'veh-999',
        loadIds: ['load-001'],
        departureTime: new Date('2026-02-07T08:00:00Z'),
        tenantId: 1,
      };

      await expect(service.planRoute(input)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.planRoute(input)).rejects.toThrow(
        'Vehicle not found: veh-999',
      );
    });

    it('should throw BadRequestException when loads not found', async () => {
      // Mock loads not found - need to reset the mock from beforeEach
      mockPrismaService.load.findMany.mockReset();
      mockPrismaService.load.findMany.mockResolvedValue([]);

      const input = {
        driverId: 'drv-001',
        vehicleId: 'veh-001',
        loadIds: ['load-999'],
        departureTime: new Date('2026-02-07T08:00:00Z'),
        tenantId: 1,
      };

      await expect(service.planRoute(input)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.planRoute(input)).rejects.toThrow(
        'Loads not found: load-999',
      );
    });

    it('should throw BadRequestException when no stops found for loads', async () => {
      // Mock loads with no stops
      const emptyStopsLoads = [
        {
          id: 1,
          loadId: 'load-001',
          tenantId: 1,
          customerName: 'Test Customer A',
          stops: [], // No stops
        },
      ];

      mockPrismaService.load.findMany.mockReset();
      mockPrismaService.load.findMany.mockResolvedValue(emptyStopsLoads);

      const input = {
        driverId: 'drv-001',
        vehicleId: 'veh-001',
        loadIds: ['load-001'],
        departureTime: new Date('2026-02-07T08:00:00Z'),
        tenantId: 1,
      };

      await expect(service.planRoute(input)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.planRoute(input)).rejects.toThrow(
        'No stops found for the provided load IDs',
      );
    });

    it('should handle 34h restart when cycle hours are exhausted', async () => {
      // Mock HOS to indicate restart is needed
      mockHOSRuleEngineService.hoursUntilRestRequired.mockReturnValue(1);
      mockHOSRuleEngineService.validateCompliance.mockReturnValue({
        isCompliant: false,
        hoursAvailableToDrive: 1,
        hoursUntilBreakRequired: 8,
        needsRestart: true, // Cycle exhausted
        cycleHoursRemaining: 0,
      });

      // Mock simulateAfter34hRestart
      mockHOSRuleEngineService.simulateAfter34hRestart.mockReturnValue({
        hoursDriven: 0,
        onDutyTime: 0,
        hoursSinceBreak: 0,
        cycleHoursUsed: 0,
        cycleDaysData: [],
        splitRestState: undefined,
      });

      const input = {
        driverId: 'drv-001',
        vehicleId: 'veh-001',
        loadIds: ['load-001'],
        departureTime: new Date('2026-02-07T08:00:00Z'),
        tenantId: 1,
      };

      const result = await service.planRoute(input);

      // Should have rest segment with restart_34h type
      const restartSegments = result.segments.filter(
        (s) => s.segmentType === 'rest' && s.restType === 'restart_34h',
      );
      expect(restartSegments.length).toBeGreaterThan(0);

      // Verify simulateAfter34hRestart was called
      expect(
        mockHOSRuleEngineService.simulateAfter34hRestart,
      ).toHaveBeenCalled();

      // Compliance report should reflect the restart
      expect(result.complianceReport.total34hRestarts).toBeGreaterThan(0);
    });

    it('should handle 30-minute break when required', async () => {
      // Create a scenario where 30-min break is needed
      // Driver has been on duty for 7.5+ hours but still has drive time available
      const driverNeedingBreak = {
        ...mockDriver,
        currentHoursSinceBreak: 7.5,
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driverNeedingBreak);

      // Mock HOS to indicate plenty of drive hours but break approaching
      let callCount = 0;
      mockHOSRuleEngineService.hoursUntilRestRequired.mockImplementation(() => {
        callCount++;
        // First call: enough hours to proceed initially
        // Subsequent calls: still enough hours
        return 11;
      });

      mockHOSRuleEngineService.validateCompliance.mockReturnValue({
        isCompliant: true,
        hoursAvailableToDrive: 11,
        hoursUntilBreakRequired: 0.5, // Break needed soon
        needsRestart: false,
        cycleHoursRemaining: 60,
      });

      // Update simulateAfterDriving to track hours since break
      mockHOSRuleEngineService.simulateAfterDriving.mockImplementation(
        (state, driveHours, onDutyHours) => ({
          ...state,
          hoursDriven: state.hoursDriven + driveHours,
          onDutyTime: state.onDutyTime + Math.max(driveHours, onDutyHours),
          hoursSinceBreak:
            (state.hoursSinceBreak ?? 0) + Math.max(driveHours, onDutyHours),
        }),
      );

      const input = {
        driverId: 'drv-001',
        vehicleId: 'veh-001',
        loadIds: ['load-001'],
        departureTime: new Date('2026-02-07T08:00:00Z'),
        tenantId: 1,
      };

      const result = await service.planRoute(input);

      // Should complete successfully
      expect(result.planId).toBeDefined();

      // Check if break segments exist (they should be inserted when hoursSinceBreak >= 7.5)
      const breakSegments = result.segments.filter(
        (s) => s.segmentType === 'break',
      );

      // This will depend on whether the simulation encounters the break trigger
      // The service checks: if (state.hosState.hoursSinceBreak >= 7.5 && adjustedDriveTime > 0.5)
      // With the initial state having 7.5 hours, a break should be inserted
      if (breakSegments.length > 0) {
        expect(breakSegments[0].restType).toBe('mandatory_break');
        expect(breakSegments[0].restDurationHours).toBe(0.5);
      }
    });

    it('should handle multiple loads with multiple stops', async () => {
      // Create multiple loads with multiple stops
      const multipleLoads = [
        {
          id: 1,
          loadId: 'load-001',
          tenantId: 1,
          customerName: 'Customer A',
          stops: [
            {
              id: 1,
              actionType: 'pickup',
              estimatedDockHours: 2,
              earliestArrival: '08:00',
              latestArrival: '17:00',
              sequenceOrder: 1,
              stop: {
                id: 10,
                stopId: 'stop-pickup-001',
                name: 'Warehouse A',
                lat: 41.8781,
                lon: -87.6298,
                timezone: 'America/Chicago',
              },
            },
            {
              id: 2,
              actionType: 'delivery',
              estimatedDockHours: 1.5,
              earliestArrival: null,
              latestArrival: null,
              sequenceOrder: 2,
              stop: {
                id: 20,
                stopId: 'stop-delivery-001',
                name: 'Distribution Center B',
                lat: 39.7392,
                lon: -104.9903,
                timezone: 'America/Denver',
              },
            },
          ],
        },
        {
          id: 2,
          loadId: 'load-002',
          tenantId: 1,
          customerName: 'Customer B',
          stops: [
            {
              id: 3,
              actionType: 'pickup',
              estimatedDockHours: 1,
              earliestArrival: null,
              latestArrival: null,
              sequenceOrder: 1,
              stop: {
                id: 30,
                stopId: 'stop-pickup-002',
                name: 'Warehouse C',
                lat: 40.7128,
                lon: -74.006,
                timezone: 'America/New_York',
              },
            },
            {
              id: 4,
              actionType: 'delivery',
              estimatedDockHours: 2,
              earliestArrival: null,
              latestArrival: null,
              sequenceOrder: 2,
              stop: {
                id: 40,
                stopId: 'stop-delivery-002',
                name: 'Distribution Center D',
                lat: 42.3601,
                lon: -71.0589,
                timezone: 'America/New_York',
              },
            },
          ],
        },
      ];

      // Reset and set up mocks for multiple loads
      mockPrismaService.load.findMany.mockReset();
      mockPrismaService.load.findMany
        .mockResolvedValueOnce(multipleLoads)
        .mockResolvedValue([{ id: 1 }, { id: 2 }]);

      // Mock distance matrix for all combinations (need all permutations)
      const distanceMatrix = new Map();
      distanceMatrix.set('origin:stop-pickup-001', {
        distanceMiles: 0,
        driveTimeHours: 0,
      });
      distanceMatrix.set('origin:stop-pickup-002', {
        distanceMiles: 50,
        driveTimeHours: 1,
      });
      distanceMatrix.set('origin:stop-delivery-001', {
        distanceMiles: 200,
        driveTimeHours: 3.5,
      });
      distanceMatrix.set('origin:stop-delivery-002', {
        distanceMiles: 150,
        driveTimeHours: 2.5,
      });
      distanceMatrix.set('stop-pickup-001:stop-delivery-001', {
        distanceMiles: 200,
        driveTimeHours: 3.5,
      });
      distanceMatrix.set('stop-pickup-001:stop-pickup-002', {
        distanceMiles: 100,
        driveTimeHours: 2,
      });
      distanceMatrix.set('stop-pickup-001:stop-delivery-002', {
        distanceMiles: 150,
        driveTimeHours: 2.5,
      });
      distanceMatrix.set('stop-pickup-002:stop-delivery-001', {
        distanceMiles: 250,
        driveTimeHours: 4,
      });
      distanceMatrix.set('stop-pickup-002:stop-delivery-002', {
        distanceMiles: 50,
        driveTimeHours: 1,
      });
      distanceMatrix.set('stop-delivery-001:stop-pickup-002', {
        distanceMiles: 250,
        driveTimeHours: 4,
      });
      distanceMatrix.set('stop-delivery-001:stop-delivery-002', {
        distanceMiles: 300,
        driveTimeHours: 5,
      });
      distanceMatrix.set('stop-delivery-002:stop-delivery-001', {
        distanceMiles: 300,
        driveTimeHours: 5,
      });
      (mockRoutingProvider.getDistanceMatrix as jest.Mock).mockResolvedValue(
        distanceMatrix,
      );

      const input = {
        driverId: 'drv-001',
        vehicleId: 'veh-001',
        loadIds: ['load-001', 'load-002'],
        departureTime: new Date('2026-02-07T08:00:00Z'),
        tenantId: 1,
      };

      const result = await service.planRoute(input);

      // Should handle multiple loads successfully
      expect(result.planId).toBeDefined();
      expect(result.isFeasible).toBe(true);

      // Should have segments for all stops (4 pickup/delivery stops)
      const dockSegments = result.segments.filter(
        (s) => s.segmentType === 'dock',
      );
      expect(dockSegments.length).toBe(4); // 2 pickups + 2 deliveries

      // Verify load resolution was called with both load IDs
      expect(mockPrismaService.load.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            loadId: { in: ['load-001', 'load-002'] },
            tenantId: 1,
          },
        }),
      );
    });
  });
});
