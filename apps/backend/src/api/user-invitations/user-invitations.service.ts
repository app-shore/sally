import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { generateId } from '../../common/utils/id-generator';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 32);

@Injectable()
export class UserInvitationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Invite a new user to the tenant
   */
  async inviteUser(dto: InviteUserDto, currentUser: any) {
    console.log('[InviteUser] Current user:', {
      userId: currentUser.userId,
      email: currentUser.email,
      role: currentUser.role,
      tenantId: currentUser.tenantId,
    });

    // SUPER_ADMIN cannot invite users (they have no tenant)
    if (currentUser.role === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Super admins cannot invite users. User invitations are managed by tenant owners/admins.',
      );
    }

    if (!currentUser.tenantId) {
      throw new BadRequestException(
        'User must belong to a tenant to invite other users',
      );
    }

    // Role-based invitation restrictions
    if (dto.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot invite users with SUPER_ADMIN role');
    }

    if (dto.role === 'OWNER') {
      throw new ForbiddenException(
        'Cannot invite users with OWNER role. Each tenant can only have one owner.',
      );
    }

    // ADMIN cannot invite other ADMINs (only OWNER can)
    if (currentUser.role === 'ADMIN' && dto.role === 'ADMIN') {
      throw new ForbiddenException(
        'Only the tenant owner can invite additional admins',
      );
    }

    // Get tenant database ID from tenantId string
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId: currentUser.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const tenantId = tenant.id;

    // Get current user's database ID
    const invitingUser = await this.prisma.user.findUnique({
      where: { userId: currentUser.userId },
      select: { id: true },
    });

    if (!invitingUser) {
      throw new NotFoundException('Inviting user not found');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        tenantId,
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email already exists in your organization',
      );
    }

    // Check if pending invitation exists
    const existingInvitation = await this.prisma.userInvitation.findFirst({
      where: {
        email: dto.email,
        tenantId,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      throw new ConflictException('Invitation already sent to this email');
    }

    // If driver ID provided, verify driver exists and is not linked
    let driverIdInt: number | null = null;
    if (dto.driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: { driverId: dto.driverId },
        include: { user: true },
      });

      if (!driver) {
        throw new NotFoundException('Driver not found');
      }

      if (driver.user) {
        throw new ConflictException(
          'Driver is already linked to a user account',
        );
      }

      if (driver.tenantId !== tenantId) {
        throw new BadRequestException(
          'Driver does not belong to your organization',
        );
      }

      driverIdInt = driver.id;
    }

    // Create invitation
    const token = nanoid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.userInvitation.create({
      data: {
        invitationId: generateId('inv'),
        tenant: {
          connect: { id: tenantId },
        },
        invitedByUser: {
          connect: { id: invitingUser.id },
        },
        ...(driverIdInt && {
          driver: {
            connect: { id: driverIdInt },
          },
        }),
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        token,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        tenant: true,
        invitedByUser: true,
      },
    });

    // Send invitation email
    const invitedByName = `${invitation.invitedByUser.firstName} ${invitation.invitedByUser.lastName}`;

    await this.emailService.sendUserInvitation(
      invitation.email,
      invitation.firstName,
      invitation.lastName,
      invitedByName,
      invitation.tenant.companyName,
      token,
    );

    return invitation;
  }

  /**
   * Get all invitations for a tenant
   * If tenantIdString is undefined, returns all invitations (for SUPER_ADMIN)
   */
  async getInvitations(tenantIdString?: string, status?: string) {
    let tenantDbId: number | undefined;

    // If tenant ID string provided, look up database ID
    if (tenantIdString) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { tenantId: tenantIdString },
      });
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }
      tenantDbId = tenant.id;
    }

    return this.prisma.userInvitation.findMany({
      where: {
        ...(tenantDbId && { tenantId: tenantDbId }),
        ...(status && { status: status as any }),
      },
      include: {
        invitedByUser: {
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        driver: {
          select: {
            driverId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Accept invitation and create user
   */
  async acceptInvitation(token: string, firebaseUid: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Create user and update invitation in transaction
    return this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          userId: generateId('user'),
          tenantId: invitation.tenantId,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          role: invitation.role,
          firebaseUid,
          emailVerified: true,
          isActive: true,
          driverId: invitation.driverId,
        },
        include: {
          tenant: true,
          driver: true,
        },
      });

      // Update invitation status
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByUserId: user.id,
        },
      });

      return user;
    });
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(
    invitationId: string,
    tenantIdString: string,
    reason?: string,
  ) {
    // Get tenant database ID from tenantId string
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId: tenantIdString },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const invitation = await this.prisma.userInvitation.findUnique({
      where: { invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.tenantId !== tenant.id) {
      throw new BadRequestException(
        'Invitation does not belong to your organization',
      );
    }

    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException('Cannot cancel accepted invitation');
    }

    if (invitation.status === 'CANCELLED') {
      throw new BadRequestException('Invitation is already cancelled');
    }

    return this.prisma.userInvitation.update({
      where: { invitationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }

  /**
   * Get invitation by token (for public acceptance page)
   */
  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            tenantId: true,
            companyName: true,
            subdomain: true,
          },
        },
        invitedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }
}
