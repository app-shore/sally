import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriversActivationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Activate a driver (ADMIN only)
   */
  async activateDriver(driverId: string, currentUser: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.tenantId !== currentUser.tenant.id) {
      throw new BadRequestException('Driver does not belong to your organization');
    }

    if (driver.status === 'ACTIVE') {
      throw new BadRequestException('Driver is already active');
    }

    if (driver.status === 'INACTIVE' || driver.status === 'SUSPENDED') {
      throw new BadRequestException(
        `Cannot activate driver with status ${driver.status}. Use reactivate instead.`,
      );
    }

    return this.prisma.driver.update({
      where: { driverId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        activatedAt: new Date(),
        activatedBy: currentUser.id,
      },
    });
  }

  /**
   * Deactivate a driver (ADMIN only)
   */
  async deactivateDriver(driverId: string, currentUser: any, reason: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.tenantId !== currentUser.tenant.id) {
      throw new BadRequestException('Driver does not belong to your organization');
    }

    if (driver.status !== 'ACTIVE') {
      throw new BadRequestException('Only active drivers can be deactivated');
    }

    return this.prisma.driver.update({
      where: { driverId },
      data: {
        status: 'INACTIVE',
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: currentUser.id,
        deactivationReason: reason,
      },
    });
  }

  /**
   * Reactivate an inactive driver (ADMIN only)
   */
  async reactivateDriver(driverId: string, currentUser: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.tenantId !== currentUser.tenant.id) {
      throw new BadRequestException('Driver does not belong to your organization');
    }

    if (driver.status !== 'INACTIVE') {
      throw new BadRequestException('Only inactive drivers can be reactivated');
    }

    return this.prisma.driver.update({
      where: { driverId },
      data: {
        status: 'ACTIVE',
        isActive: true,
        reactivatedAt: new Date(),
        reactivatedBy: currentUser.id,
        // Clear deactivation fields
        deactivatedAt: null,
        deactivatedBy: null,
        deactivationReason: null,
      },
    });
  }

  /**
   * Get all pending drivers (ADMIN only)
   */
  async getPendingDrivers(tenantId: number) {
    return this.prisma.driver.findMany({
      where: {
        tenantId,
        status: 'PENDING_ACTIVATION',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all inactive drivers (ADMIN only)
   */
  async getInactiveDrivers(tenantId: number) {
    return this.prisma.driver.findMany({
      where: {
        tenantId,
        status: 'INACTIVE',
      },
      include: {
        deactivatedByUser: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { deactivatedAt: 'desc' },
    });
  }
}
