import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { generateId } from '../../../../shared/utils/id-generator';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: number) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, isActive: true },
      orderBy: { companyName: 'asc' },
    });
    return customers.map((c) => ({
      id: c.id,
      customer_id: c.customerId,
      company_name: c.companyName,
      contact_email: c.contactEmail,
      contact_phone: c.contactPhone,
      is_active: c.isActive,
      created_at: c.createdAt.toISOString(),
    }));
  }

  async findOne(customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer not found: ${customerId}`);
    }
    return customer;
  }

  async create(data: {
    tenant_id: number;
    company_name: string;
    contact_email?: string;
    contact_phone?: string;
  }) {
    const customerId = generateId('cust');
    const customer = await this.prisma.customer.create({
      data: {
        customerId,
        companyName: data.company_name,
        contactEmail: data.contact_email || null,
        contactPhone: data.contact_phone || null,
        tenantId: data.tenant_id,
        isActive: true,
      },
    });
    this.logger.log(`Customer created: ${customerId}`);
    return {
      id: customer.id,
      customer_id: customer.customerId,
      company_name: customer.companyName,
      contact_email: customer.contactEmail,
      contact_phone: customer.contactPhone,
    };
  }

  /**
   * Invite a customer contact to the portal.
   * Uses the existing UserInvitation model with CUSTOMER role.
   */
  async inviteContact(
    customerId: string,
    data: {
      email: string;
      first_name: string;
      last_name: string;
      tenant_id: number;
      invited_by: string;
    },
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer not found: ${customerId}`);
    }

    // Check existing user
    const existingUser = await this.prisma.user.findFirst({
      where: { email: data.email, tenantId: data.tenant_id },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check existing invitation
    const existingInvitation = await this.prisma.userInvitation.findFirst({
      where: { email: data.email, tenantId: data.tenant_id, status: 'PENDING' },
    });
    if (existingInvitation) {
      throw new ConflictException('Invitation already sent to this email');
    }

    const invitingUser = await this.prisma.user.findUnique({
      where: { userId: data.invited_by },
      select: { id: true },
    });
    if (!invitingUser) {
      throw new NotFoundException('Inviting user not found');
    }

    const { customAlphabet } = await import('nanoid');
    const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 32);
    const token = nanoid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.userInvitation.create({
      data: {
        invitationId: generateId('inv'),
        tenant: { connect: { id: data.tenant_id } },
        invitedByUser: { connect: { id: invitingUser.id } },
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: 'CUSTOMER',
        token,
        status: 'PENDING',
        expiresAt,
      },
    });

    this.logger.log(`Customer invitation created for ${data.email} -> customer ${customerId}`);

    return {
      invitation_id: invitation.invitationId,
      email: invitation.email,
      status: invitation.status,
      customer_id: customerId,
      expires_at: invitation.expiresAt.toISOString(),
    };
  }
}
