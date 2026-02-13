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
  async findOne(driverId: string, tenantId: number): Promise<any> {
    const driver = await this.prisma.driver.findUnique({
      where: {
        driverId_tenantId: {
          driverId,
          tenantId,
        },
      },
      include: {
        user: {
          select: {
            userId: true,
            isActive: true,
          },
        },
        loads: {
          where: { status: { not: 'DELIVERED' } },
          select: {
            loadId: true,
            referenceNumber: true,
            status: true,
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
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
      phone: string;
      email: string;
      cdl_class: string;
      license_number: string;
      license_state?: string;
    },
  ): Promise<Driver> {
    const driverId = `DRV-${Date.now().toString(36).toUpperCase()}`;

    try {
      const driver = await this.prisma.driver.create({
        data: {
          driverId,
          name: data.name,
          phone: data.phone,
          email: data.email,
          cdlClass: data.cdl_class as any,
          licenseNumber: data.license_number,
          licenseState: data.license_state || null,
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
      phone?: string;
      email?: string;
      cdl_class?: string;
      license_number?: string;
      license_state?: string;
      endorsements?: string[];
      hire_date?: string;
      medical_card_expiry?: string;
      home_terminal_city?: string;
      home_terminal_state?: string;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
      notes?: string;
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
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.cdl_class !== undefined ? { cdlClass: data.cdl_class as any } : {}),
        ...(data.license_number !== undefined ? { licenseNumber: data.license_number } : {}),
        ...(data.license_state !== undefined ? { licenseState: data.license_state } : {}),
        ...(data.endorsements !== undefined ? { endorsements: data.endorsements } : {}),
        ...(data.hire_date !== undefined ? { hireDate: data.hire_date ? new Date(data.hire_date) : null } : {}),
        ...(data.medical_card_expiry !== undefined ? { medicalCardExpiry: data.medical_card_expiry ? new Date(data.medical_card_expiry) : null } : {}),
        ...(data.home_terminal_city !== undefined ? { homeTerminalCity: data.home_terminal_city } : {}),
        ...(data.home_terminal_state !== undefined ? { homeTerminalState: data.home_terminal_state } : {}),
        ...(data.emergency_contact_name !== undefined ? { emergencyContactName: data.emergency_contact_name } : {}),
        ...(data.emergency_contact_phone !== undefined ? { emergencyContactPhone: data.emergency_contact_phone } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
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
