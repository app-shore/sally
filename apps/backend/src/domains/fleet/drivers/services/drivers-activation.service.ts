import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { UserInvitationsService } from '../../../platform/user-invitations/user-invitations.service';

@Injectable()
export class DriversActivationService {
  constructor(
    private prisma: PrismaService,
    private readonly userInvitationsService: UserInvitationsService,
  ) {}

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
      throw new BadRequestException(
        'Driver does not belong to your organization',
      );
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
      throw new BadRequestException(
        'Driver does not belong to your organization',
      );
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
      throw new BadRequestException(
        'Driver does not belong to your organization',
      );
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

  /**
   * Activate a driver AND send SALLY invitation in one step.
   * - If driver is PENDING_ACTIVATION, activates them first
   * - If driver is already ACTIVE, just sends invitation
   * - Creates UserInvitation linked to driver (role=DRIVER)
   */
  async activateAndInvite(
    driverId: string,
    email: string | undefined,
    currentUser: any,
  ) {
    const driver = await this.prisma.driver.findUnique({
      where: { driverId },
      include: { user: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.tenantId !== currentUser.tenant.id) {
      throw new BadRequestException(
        'Driver does not belong to your organization',
      );
    }

    // Check if driver already has a user account
    if (driver.user) {
      throw new BadRequestException('Driver already has a SALLY account');
    }

    // Determine email to use
    const driverEmail = email || driver.email;
    if (!driverEmail) {
      throw new BadRequestException(
        'Driver has no email address. Please provide an email to send the invitation.',
      );
    }

    // If email was provided and differs from current, update driver record
    let updatedDriver: any = driver;
    if (email && email !== driver.email) {
      updatedDriver = await this.prisma.driver.update({
        where: { driverId },
        data: { email },
      });
    }

    // Activate if pending
    if (driver.status === 'PENDING_ACTIVATION') {
      updatedDriver = await this.prisma.driver.update({
        where: { driverId },
        data: {
          status: 'ACTIVE',
          isActive: true,
          activatedAt: new Date(),
          activatedBy: currentUser.id,
        },
      });
    }

    // Parse name into first/last (driver has single "name" field)
    const nameParts = driver.name.trim().split(/\s+/);
    const firstName = nameParts[0] || driver.name;
    const lastName = nameParts.slice(1).join(' ') || driver.name;

    // Create invitation via UserInvitationsService
    const invitation = await this.userInvitationsService.inviteUser(
      {
        email: driverEmail,
        firstName,
        lastName,
        role: 'DRIVER' as any,
        driverId: driver.driverId,
      },
      currentUser,
    );

    return { driver: updatedDriver, invitation };
  }
}
