import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    tenant_id: number;
    company_name: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  }) {
    const customerId = `cust_${randomUUID().slice(0, 8)}`;
    const customer = await this.prisma.customer.create({
      data: {
        customerId,
        companyName: data.company_name,
        contactName: data.contact_name || null,
        contactEmail: data.contact_email || null,
        contactPhone: data.contact_phone || null,
        tenantId: data.tenant_id,
      },
    });
    this.logger.log(`Customer created: ${customerId}`);
    return this.formatResponse(customer);
  }

  async findAll(tenantId: number) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, isActive: true },
      orderBy: { companyName: 'asc' },
    });
    return customers.map((c) => this.formatResponse(c));
  }

  async findOne(customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { customerId },
    });
    if (!customer) throw new NotFoundException(`Customer not found: ${customerId}`);
    return this.formatResponse(customer);
  }

  async update(
    customerId: string,
    data: Partial<{
      company_name: string;
      contact_name: string;
      contact_email: string;
      contact_phone: string;
    }>,
  ) {
    const existing = await this.prisma.customer.findFirst({ where: { customerId } });
    if (!existing) throw new NotFoundException(`Customer not found: ${customerId}`);

    const updated = await this.prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...(data.company_name !== undefined ? { companyName: data.company_name } : {}),
        ...(data.contact_name !== undefined ? { contactName: data.contact_name } : {}),
        ...(data.contact_email !== undefined ? { contactEmail: data.contact_email } : {}),
        ...(data.contact_phone !== undefined ? { contactPhone: data.contact_phone } : {}),
      },
    });
    return this.formatResponse(updated);
  }

  private formatResponse(customer: any) {
    return {
      id: customer.id,
      customer_id: customer.customerId,
      company_name: customer.companyName,
      contact_name: customer.contactName,
      contact_email: customer.contactEmail,
      contact_phone: customer.contactPhone,
      is_active: customer.isActive,
      created_at: customer.createdAt?.toISOString(),
    };
  }
}
