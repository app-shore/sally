import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { Vehicle } from '@prisma/client';

/**
 * VehiclesService handles all vehicle-related business logic.
 * Extracted from VehiclesController to separate concerns.
 */
@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all active vehicles for a tenant
   */
  async findAll(tenantId: number): Promise<Vehicle[]> {
    return this.prisma.vehicle.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { vehicleId: 'asc' },
    });
  }

  /**
   * Find one vehicle by ID
   */
  async findOne(vehicleId: string, tenantId: number): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: {
        vehicleId_tenantId: {
          vehicleId,
          tenantId,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle not found: ${vehicleId}`);
    }

    return vehicle;
  }

  /**
   * Create a new vehicle (auto-generates vehicleId)
   */
  async create(
    tenantId: number,
    data: {
      unit_number: string;
      vin: string;
      equipment_type: string;
      fuel_capacity_gallons: number;
      mpg?: number;
      status?: string;
      make?: string;
      model?: string;
      year?: number;
      license_plate?: string;
      license_plate_state?: string;
      has_sleeper_berth?: boolean;
      gross_weight_lbs?: number;
      current_fuel_gallons?: number;
    },
  ): Promise<Vehicle> {
    const vehicleId = `VEH-${Date.now().toString(36).toUpperCase()}`;

    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          vehicleId,
          unitNumber: data.unit_number,
          vin: data.vin,
          equipmentType: data.equipment_type as any,
          fuelCapacityGallons: data.fuel_capacity_gallons,
          mpg: data.mpg,
          status: (data.status as any) || 'AVAILABLE',
          make: data.make || null,
          model: data.model || null,
          year: data.year || null,
          licensePlate: data.license_plate || null,
          licensePlateState: data.license_plate_state || null,
          hasSleeperBerth: data.has_sleeper_berth ?? true,
          grossWeightLbs: data.gross_weight_lbs || null,
          currentFuelGallons: data.current_fuel_gallons,
          isActive: true,
          tenantId,
        },
      });

      this.logger.log(`Vehicle created: ${vehicleId} - ${data.unit_number}`);
      return vehicle;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Vehicle with this VIN or ID already exists');
      }
      throw error;
    }
  }

  /**
   * TMS-owned identity fields — stripped when vehicle has an externalSource.
   * These fields are managed by the TMS sync and should not be overwritten by dispatchers.
   */
  private static readonly TMS_OWNED_FIELDS = [
    'unit_number',
    'vin',
    'make',
    'model',
    'year',
    'license_plate',
    'license_plate_state',
  ] as const;

  /**
   * Update vehicle info.
   * For TMS-synced vehicles (externalSource is set), identity fields are stripped
   * so dispatchers can only update operational fields.
   */
  async update(
    vehicleId: string,
    tenantId: number,
    data: {
      unit_number?: string;
      vin?: string;
      equipment_type?: string;
      fuel_capacity_gallons?: number;
      mpg?: number;
      status?: string;
      make?: string;
      model?: string;
      year?: number;
      license_plate?: string;
      license_plate_state?: string;
      has_sleeper_berth?: boolean;
      gross_weight_lbs?: number;
      current_fuel_gallons?: number;
    },
  ): Promise<Vehicle> {
    // Look up the vehicle first to check external source ownership
    const existing = await this.findOne(vehicleId, tenantId);

    let filteredData = { ...data };

    // If TMS-synced, strip identity fields so only operational fields are updated
    if (existing.externalSource) {
      const strippedFields: string[] = [];

      for (const field of VehiclesService.TMS_OWNED_FIELDS) {
        if (filteredData[field] !== undefined) {
          strippedFields.push(field);
          delete filteredData[field];
        }
      }

      if (strippedFields.length > 0) {
        this.logger.warn(
          `Vehicle ${vehicleId} is TMS-synced (${existing.externalSource}). ` +
          `Stripped identity fields from update: ${strippedFields.join(', ')}`,
        );
      }
    }

    try {
      const vehicle = await this.prisma.vehicle.update({
        where: {
          vehicleId_tenantId: {
            vehicleId,
            tenantId,
          },
        },
        data: {
          ...(filteredData.unit_number !== undefined ? { unitNumber: filteredData.unit_number } : {}),
          ...(filteredData.vin !== undefined ? { vin: filteredData.vin } : {}),
          ...(filteredData.equipment_type !== undefined ? { equipmentType: filteredData.equipment_type as any } : {}),
          ...(filteredData.fuel_capacity_gallons !== undefined ? { fuelCapacityGallons: filteredData.fuel_capacity_gallons } : {}),
          ...(filteredData.mpg !== undefined ? { mpg: filteredData.mpg } : {}),
          ...(filteredData.status !== undefined ? { status: filteredData.status as any } : {}),
          ...(filteredData.make !== undefined ? { make: filteredData.make } : {}),
          ...(filteredData.model !== undefined ? { model: filteredData.model } : {}),
          ...(filteredData.year !== undefined ? { year: filteredData.year } : {}),
          ...(filteredData.license_plate !== undefined ? { licensePlate: filteredData.license_plate } : {}),
          ...(filteredData.license_plate_state !== undefined ? { licensePlateState: filteredData.license_plate_state } : {}),
          ...(filteredData.has_sleeper_berth !== undefined ? { hasSleeperBerth: filteredData.has_sleeper_berth } : {}),
          ...(filteredData.gross_weight_lbs !== undefined ? { grossWeightLbs: filteredData.gross_weight_lbs } : {}),
          ...(filteredData.current_fuel_gallons !== undefined ? { currentFuelGallons: filteredData.current_fuel_gallons } : {}),
        },
      });

      this.logger.log(`Vehicle updated: ${vehicleId}`);
      return vehicle;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Vehicle with this VIN already exists');
      }
      throw error;
    }
  }

  /**
   * Soft delete vehicle (set isActive=false)
   */
  async remove(vehicleId: string, tenantId: number): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.update({
      where: {
        vehicleId_tenantId: {
          vehicleId,
          tenantId,
        },
      },
      data: { isActive: false },
    });

    this.logger.log(`Vehicle deactivated: ${vehicleId}`);
    return vehicle;
  }
}
