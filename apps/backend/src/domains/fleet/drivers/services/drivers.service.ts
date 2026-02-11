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
   * Find all active drivers for a tenant, including SALLY access status
   */
  async findAll(tenantId: number): Promise<any[]> {
    return this.prisma.driver.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            userId: true,
            isActive: true,
          },
        },
        invitations: {
          where: { status: 'PENDING' },
          select: {
            invitationId: true,
            status: true,
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
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
    data: {
      name: string;
      license_number?: string;
      phone?: string;
      email?: string;
    },
  ): Promise<Driver> {
    const driverId = `DRV-${Date.now().toString(36).toUpperCase()}`;

    try {
      const driver = await this.prisma.driver.create({
        data: {
          driverId,
          name: data.name,
          licenseNumber: data.license_number || null,
          phone: data.phone || null,
          email: data.email || null,
          status: 'ACTIVE',
          isActive: true,
          tenantId,
          syncStatus: 'MANUAL_ENTRY',
        },
      });

      this.logger.log(`Driver created: ${driverId} - ${data.name}`);
      return driver;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Driver ID already exists');
      }
      throw error;
    }
  }

  /**
   * Update driver info
   */
  async update(
    driverId: string,
    tenantId: number,
    data: {
      name?: string;
      license_number?: string;
      phone?: string;
      email?: string;
    },
  ): Promise<Driver> {
    const driver = await this.prisma.driver.update({
      where: {
        driverId_tenantId: {
          driverId,
          tenantId,
        },
      },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.license_number !== undefined ? { licenseNumber: data.license_number } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
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
