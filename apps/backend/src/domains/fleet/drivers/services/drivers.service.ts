import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { Driver } from '@prisma/client';

/**
 * DriversService handles all driver-related business logic.
 * Extracted from DriversController to separate concerns.
 */
@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all active drivers for a tenant
   */
  async findAll(tenantId: number): Promise<Driver[]> {
    return this.prisma.driver.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { driverId: 'asc' },
    });
  }

  /**
   * Find one driver by ID
   */
  async findOne(driverId: string, tenantId: number): Promise<Driver> {
    const driver = await this.prisma.driver.findUnique({
      where: {
        driverId_tenantId: {
          driverId,
          tenantId,
        },
      },
    });

    if (!driver) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    return driver;
  }

  /**
   * Create a new driver (manual entry, immediately active)
   */
  async create(
    tenantId: number,
    driverId: string,
    name: string,
  ): Promise<Driver> {
    try {
      const driver = await this.prisma.driver.create({
        data: {
          driverId,
          name,
          status: 'ACTIVE',
          isActive: true,
          tenantId,
          syncStatus: 'MANUAL_ENTRY',
        },
      });

      this.logger.log(`Driver created: ${driverId} - ${name}`);
      return driver;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Driver ID already exists');
      }
      throw error;
    }
  }

  /**
   * Update driver basic info
   */
  async update(
    driverId: string,
    tenantId: number,
    name?: string,
  ): Promise<Driver> {
    const driver = await this.prisma.driver.update({
      where: {
        driverId_tenantId: {
          driverId,
          tenantId,
        },
      },
      data: {
        ...(name ? { name } : {}),
      },
    });

    this.logger.log(`Driver updated: ${driverId}`);
    return driver;
  }

  /**
   * Soft delete driver (set isActive=false)
   */
  async remove(driverId: string, tenantId: number): Promise<Driver> {
    const driver = await this.prisma.driver.update({
      where: {
        driverId_tenantId: {
          driverId,
          tenantId,
        },
      },
      data: { isActive: false },
    });

    this.logger.log(`Driver deactivated: ${driverId}`);
    return driver;
  }
}
