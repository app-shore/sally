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
      make?: string;
      model?: string;
      year?: number;
      vin?: string;
      fuel_capacity_gallons?: number;
      current_fuel_gallons?: number;
      mpg?: number;
    },
  ): Promise<Vehicle> {
    const vehicleId = `VEH-${Date.now().toString(36).toUpperCase()}`;

    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          vehicleId,
          unitNumber: data.unit_number,
          make: data.make || null,
          model: data.model || null,
          year: data.year || null,
          vin: data.vin || null,
          fuelCapacityGallons: data.fuel_capacity_gallons,
          currentFuelGallons: data.current_fuel_gallons,
          mpg: data.mpg,
          isActive: true,
          tenantId,
        },
      });

      this.logger.log(`Vehicle created: ${vehicleId} - ${data.unit_number}`);
      return vehicle;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Vehicle ID already exists');
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
      make?: string;
      model?: string;
      year?: number;
      vin?: string;
      fuel_capacity_gallons?: number;
      current_fuel_gallons?: number;
      mpg?: number;
    },
  ): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.update({
      where: {
        vehicleId_tenantId: {
          vehicleId,
          tenantId,
        },
      },
      data: {
        ...(data.unit_number !== undefined ? { unitNumber: data.unit_number } : {}),
        ...(data.make !== undefined ? { make: data.make } : {}),
        ...(data.model !== undefined ? { model: data.model } : {}),
        ...(data.year !== undefined ? { year: data.year } : {}),
        ...(data.vin !== undefined ? { vin: data.vin } : {}),
        ...(data.fuel_capacity_gallons !== undefined
          ? { fuelCapacityGallons: data.fuel_capacity_gallons }
          : {}),
        ...(data.current_fuel_gallons !== undefined
          ? { currentFuelGallons: data.current_fuel_gallons }
          : {}),
        ...(data.mpg !== undefined ? { mpg: data.mpg } : {}),
      },
    });

    this.logger.log(`Vehicle updated: ${vehicleId}`);
    return vehicle;
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
