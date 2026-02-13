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
   * Update vehicle info
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
    try {
      const vehicle = await this.prisma.vehicle.update({
        where: {
          vehicleId_tenantId: {
            vehicleId,
            tenantId,
          },
        },
        data: {
          ...(data.unit_number !== undefined ? { unitNumber: data.unit_number } : {}),
          ...(data.vin !== undefined ? { vin: data.vin } : {}),
          ...(data.equipment_type !== undefined ? { equipmentType: data.equipment_type as any } : {}),
          ...(data.fuel_capacity_gallons !== undefined ? { fuelCapacityGallons: data.fuel_capacity_gallons } : {}),
          ...(data.mpg !== undefined ? { mpg: data.mpg } : {}),
          ...(data.status !== undefined ? { status: data.status as any } : {}),
          ...(data.make !== undefined ? { make: data.make } : {}),
          ...(data.model !== undefined ? { model: data.model } : {}),
          ...(data.year !== undefined ? { year: data.year } : {}),
          ...(data.license_plate !== undefined ? { licensePlate: data.license_plate } : {}),
          ...(data.license_plate_state !== undefined ? { licensePlateState: data.license_plate_state } : {}),
          ...(data.has_sleeper_berth !== undefined ? { hasSleeperBerth: data.has_sleeper_berth } : {}),
          ...(data.gross_weight_lbs !== undefined ? { grossWeightLbs: data.gross_weight_lbs } : {}),
          ...(data.current_fuel_gallons !== undefined ? { currentFuelGallons: data.current_fuel_gallons } : {}),
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
