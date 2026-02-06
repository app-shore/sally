import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { generateId } from '../../../shared/utils/id-generator';
import { TenantStatus } from '@prisma/client';
import { NotificationService } from '../../../infrastructure/notification/notification.service';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Check if subdomain is available
   */
  async checkSubdomainAvailability(subdomain: string): Promise<boolean> {
    const reservedSubdomains = [
      'admin',
      'api',
      'www',
      'app',
      'dashboard',
      'mail',
      'support',
      'help',
      'docs',
    ];

    if (reservedSubdomains.includes(subdomain.toLowerCase())) {
      return false;
    }

    const existing = await this.prisma.tenant.findUnique({
      where: { subdomain: subdomain.toLowerCase() },
    });

    return !existing;
  }

  /**
   * Register new tenant with admin user
   */
  async registerTenant(dto: RegisterTenantDto) {
    // Check subdomain availability
    const isAvailable = await this.checkSubdomainAvailability(dto.subdomain);
    if (!isAvailable) {
      throw new ConflictException('Subdomain is already taken or reserved');
    }

    // Check if email already registered (across all tenants)
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { firebaseUid: dto.firebaseUid }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Create tenant and admin user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          tenantId: generateId('tenant'),
          companyName: dto.companyName,
          subdomain: dto.subdomain.toLowerCase(),
          contactEmail: dto.email,
          contactPhone: dto.phone,
          status: 'PENDING_APPROVAL',
          dotNumber: dto.dotNumber,
          fleetSize: dto.fleetSize,
          isActive: false,
        },
      });

      // Create owner user (cannot be deleted)
      const ownerUser = await tx.user.create({
        data: {
          userId: generateId('user'),
          tenantId: tenant.id,
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'OWNER', // Owner role - created during registration, cannot be deleted
          firebaseUid: dto.firebaseUid,
          emailVerified: false,
          isActive: false, // Inactive until tenant approved
        },
      });

      return { tenant, ownerUser };
    });

    // Send registration confirmation email
    await this.notificationService.sendTenantRegistrationConfirmation(
      result.tenant.tenantId,
      dto.email,
      dto.firstName,
      result.tenant.companyName,
    );

    return {
      tenantId: result.tenant.tenantId,
      status: result.tenant.status,
      message: 'Registration successful! Your account is pending approval.',
    };
  }

  /**
   * Get all tenants (SUPER_ADMIN only)
   */
  async getAllTenants(status?: string) {
    return this.prisma.tenant.findMany({
      where: status ? { status: status as TenantStatus } : undefined,
      include: {
        users: {
          where: { role: { in: ['OWNER', 'ADMIN'] } },
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        _count: {
          select: {
            users: true,
            drivers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approve tenant
   */
  async approveTenant(tenantId: string, approvedBy: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
      include: { users: { where: { role: { in: ['OWNER', 'ADMIN'] } } } },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    if (tenant.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Tenant is not pending approval');
    }

    // Update tenant and activate admin user
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { tenantId },
        data: {
          status: 'ACTIVE',
          isActive: true,
          approvedAt: new Date(),
          approvedBy,
        },
      });

      // Activate owner and admin user(s)
      await tx.user.updateMany({
        where: {
          tenantId: tenant.id,
          role: { in: ['OWNER', 'ADMIN'] },
        },
        data: {
          isActive: true,
        },
      });

      // Create default operations settings for the tenant
      await tx.fleetOperationsSettings.upsert({
        where: { tenantId: tenant.id },
        create: { tenantId: tenant.id },
        update: {},
      });

      // Create default user preferences for the owner
      const ownerUser = await tx.user.findFirst({
        where: { tenantId: tenant.id, role: 'OWNER' },
      });
      if (ownerUser) {
        await tx.userPreferences.upsert({
          where: { userId: ownerUser.id },
          create: { userId: ownerUser.id },
          update: {},
        });
      }

      return updatedTenant;
    });

    // Send approval email to owner
    const ownerUser = tenant.users.find((u) => u.role === 'OWNER');
    if (ownerUser) {
      await this.notificationService.sendTenantApprovalNotification(
        tenantId,
        ownerUser.email,
        ownerUser.firstName,
        result.companyName,
        result.subdomain || tenantId,
      );
    }

    return result;
  }

  /**
   * Reject tenant
   */
  async rejectTenant(tenantId: string, reason: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
      include: {
        users: {
          where: { role: 'OWNER' },
        },
      },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const result = await this.prisma.tenant.update({
      where: { tenantId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Send rejection email to owner
    const ownerUser = tenant.users?.find((u) => u.role === 'OWNER');
    if (ownerUser) {
      await this.notificationService.sendTenantRejectionNotification(
        tenantId,
        ownerUser.email,
        ownerUser.firstName,
        tenant.companyName,
        reason,
      );
    }

    return result;
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(tenantId: string, reason: string, suspendedBy: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
      include: { users: { where: { role: 'OWNER' } } },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new BadRequestException('Can only suspend ACTIVE tenants');
    }

    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException(
        'Suspension reason must be at least 10 characters',
      );
    }

    // Update tenant and deactivate all users in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { tenantId },
        data: {
          status: 'SUSPENDED',
          isActive: false,
          suspendedAt: new Date(),
          suspendedBy,
          suspensionReason: reason,
        },
      });

      // Deactivate all tenant users (logs them out)
      await tx.user.updateMany({
        where: { tenantId: tenant.id },
        data: { isActive: false },
      });

      return updatedTenant;
    });

    // Send suspension notification email
    const ownerUser = tenant.users.find((u) => u.role === 'OWNER');
    if (ownerUser) {
      await this.notificationService.sendTenantSuspensionNotification(
        tenantId,
        ownerUser.email,
        ownerUser.firstName,
        result.companyName,
        reason,
      );
    }

    return result;
  }

  /**
   * Reactivate tenant
   */
  async reactivateTenant(tenantId: string, reactivatedBy: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
      include: { users: { where: { role: 'OWNER' } } },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    if (tenant.status !== 'SUSPENDED') {
      throw new BadRequestException('Can only reactivate SUSPENDED tenants');
    }

    // Update tenant and reactivate all users in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { tenantId },
        data: {
          status: 'ACTIVE',
          isActive: true,
          reactivatedAt: new Date(),
          reactivatedBy,
        },
      });

      // Reactivate all tenant users
      await tx.user.updateMany({
        where: { tenantId: tenant.id },
        data: { isActive: true },
      });

      return updatedTenant;
    });

    // Send reactivation notification email
    const ownerUser = tenant.users.find((u) => u.role === 'OWNER');
    if (ownerUser) {
      await this.notificationService.sendTenantReactivationNotification(
        tenantId,
        ownerUser.email,
        ownerUser.firstName,
        result.companyName,
      );
    }

    return result;
  }

  /**
   * Get tenant details with users and metrics
   */
  async getTenantDetails(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
      include: {
        users: {
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
          orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
        },
        _count: {
          select: {
            users: true,
            drivers: true,
            vehicles: true,
            routePlans: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    return {
      tenant: {
        tenantId: tenant.tenantId,
        companyName: tenant.companyName,
        subdomain: tenant.subdomain,
        status: tenant.status,
        dotNumber: tenant.dotNumber,
        fleetSize: tenant.fleetSize,
        contactEmail: tenant.contactEmail,
        contactPhone: tenant.contactPhone,
        createdAt: tenant.createdAt.toISOString(),
        approvedAt: tenant.approvedAt?.toISOString(),
        approvedBy: tenant.approvedBy,
        rejectedAt: tenant.rejectedAt?.toISOString(),
        rejectionReason: tenant.rejectionReason,
        suspendedAt: tenant.suspendedAt?.toISOString(),
        suspendedBy: tenant.suspendedBy,
        suspensionReason: tenant.suspensionReason,
        reactivatedAt: tenant.reactivatedAt?.toISOString(),
        reactivatedBy: tenant.reactivatedBy,
      },
      users: tenant.users,
      metrics: {
        totalUsers: tenant._count.users,
        totalDrivers: tenant._count.drivers,
        totalVehicles: tenant._count.vehicles,
        totalRoutePlans: tenant._count.routePlans,
      },
    };
  }
}
