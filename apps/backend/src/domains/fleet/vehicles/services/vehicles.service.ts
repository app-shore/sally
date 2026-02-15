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
   * Update vehicle info.
   * For TMS-synced vehicles (externalSource is set), identity fields are stripped
   * so dispatchers can only update operational fields (status, equipment, fuel, etc.).
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
    // Check if vehicle exists and whether it's TMS-synced
    const existing = await this.prisma.vehicle.findUnique({
      where: { vehicleId_tenantId: { vehicleId, tenantId } },
      select: { externalSource: true },
    });

    if (!existing) {
      throw new NotFoundException(`Vehicle not found: ${vehicleId}`);
    }

    // For TMS-synced vehicles, destructure out identity fields (only operational fields pass through)
    let filteredData = data;
    if (existing.externalSource) {
      const {
        unit_number,
        vin,
        make,
        model,
        year,
        license_plate,
        license_plate_state,
        ...operationalFields
      } = data;
      filteredData = operationalFields;

      const attemptedTmsFields = [unit_number, vin, make, model, year, license_plate, license_plate_state]
        .map((v, i) => v !== undefined ? ['unit_number', 'vin', 'make', 'model', 'year', 'license_plate', 'license_plate_state'][i] : null)
        .filter(Boolean);

      if (attemptedTmsFields.length > 0) {
        this.logger.log(
          `Vehicle ${vehicleId} is TMS-synced (${existing.externalSource}). ` +
          `Filtered TMS-owned fields: ${attemptedTmsFields.join(', ')}`,
        );
      }
    }

    try {
      const vehicle = await this.prisma.vehicle.update({
        where: { vehicleId_tenantId: { vehicleId, tenantId } },
        data: {
          // Operational fields (always allowed)
          ...(filteredData.equipment_type !== undefined ? { equipmentType: filteredData.equipment_type as any } : {}),
          ...(filteredData.fuel_capacity_gallons !== undefined ? { fuelCapacityGallons: filteredData.fuel_capacity_gallons } : {}),
          ...(filteredData.mpg !== undefined ? { mpg: filteredData.mpg } : {}),
          ...(filteredData.status !== undefined ? { status: filteredData.status as any } : {}),
          ...(filteredData.has_sleeper_berth !== undefined ? { hasSleeperBerth: filteredData.has_sleeper_berth } : {}),
          ...(filteredData.gross_weight_lbs !== undefined ? { grossWeightLbs: filteredData.gross_weight_lbs } : {}),
          ...(filteredData.current_fuel_gallons !== undefined ? { currentFuelGallons: filteredData.current_fuel_gallons } : {}),
          // Identity fields (only for manual vehicles — defensive double-check)
          ...(!existing.externalSource && filteredData.unit_number !== undefined ? { unitNumber: filteredData.unit_number } : {}),
          ...(!existing.externalSource && filteredData.vin !== undefined ? { vin: filteredData.vin } : {}),
          ...(!existing.externalSource && filteredData.make !== undefined ? { make: filteredData.make } : {}),
          ...(!existing.externalSource && filteredData.model !== undefined ? { model: filteredData.model } : {}),
          ...(!existing.externalSource && filteredData.year !== undefined ? { year: filteredData.year } : {}),
          ...(!existing.externalSource && filteredData.license_plate !== undefined ? { licensePlate: filteredData.license_plate } : {}),
          ...(!existing.externalSource && filteredData.license_plate_state !== undefined ? { licensePlateState: filteredData.license_plate_state } : {}),
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
