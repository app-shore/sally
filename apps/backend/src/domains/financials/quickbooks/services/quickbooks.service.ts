import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class QuickBooksService {
  private readonly logger = new Logger(QuickBooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /** Get OAuth authorization URL */
  getAuthUrl(tenantId: number): string {
    const clientId = this.configService.get('QUICKBOOKS_CLIENT_ID') || 'qb_client_placeholder';
    const redirectUri = this.configService.get('QUICKBOOKS_REDIRECT_URI') || 'http://localhost:8000/quickbooks/callback';
    const scope = 'com.intuit.quickbooks.accounting';
    const state = Buffer.from(JSON.stringify({ tenantId })).toString('base64');

    return `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
  }

  /** Handle OAuth callback — exchange code for tokens and store */
  async handleCallback(code: string, realmId: string, tenantId: number) {
    // In production, exchange code for access_token + refresh_token via QB API
    // For POC, we store the code and realm ID as a placeholder
    const tokenData = {
      access_token: `mock_access_${code}`,
      refresh_token: `mock_refresh_${code}`,
      realm_id: realmId,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    };

    await this.prisma.integrationConfig.upsert({
      where: {
        tenantId_provider: { tenantId, provider: 'quickbooks' },
      },
      update: {
        config: tokenData as any,
        enabled: true,
      },
      create: {
        tenantId,
        provider: 'quickbooks',
        config: tokenData as any,
        enabled: true,
      },
    });

    this.logger.log(`QuickBooks connected for tenant ${tenantId}, realm ${realmId}`);
    return { connected: true, realm_id: realmId };
  }

  /** Disconnect QuickBooks */
  async disconnect(tenantId: number) {
    await this.prisma.integrationConfig.updateMany({
      where: { tenantId, provider: 'quickbooks' },
      data: { enabled: false },
    });
    this.logger.log(`QuickBooks disconnected for tenant ${tenantId}`);
    return { connected: false };
  }

  /** Get connection status */
  async getStatus(tenantId: number) {
    const config = await this.prisma.integrationConfig.findFirst({
      where: { tenantId, provider: 'quickbooks', enabled: true },
    });

    if (!config) return { connected: false };

    const configData = config.config as any;
    return {
      connected: true,
      realm_id: configData?.realm_id,
      last_synced: configData?.last_synced || null,
    };
  }

  /** Sync invoice to QuickBooks (creates QB Invoice) */
  async syncInvoice(tenantId: number, invoiceId: string) {
    const status = await this.getStatus(tenantId);
    if (!status.connected) throw new BadRequestException('QuickBooks is not connected');

    const invoice = await this.prisma.invoice.findFirst({
      where: { invoiceId, tenantId },
      include: { customer: true, lineItems: true },
    });
    if (!invoice) throw new BadRequestException('Invoice not found');

    // POC: simulate QB API call
    const qbInvoiceId = `QB-INV-${Date.now()}`;

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        qbInvoiceId,
        qbSyncedAt: new Date(),
        qbSyncError: null,
      },
    });

    this.logger.log(`Synced invoice ${invoice.invoiceNumber} to QuickBooks as ${qbInvoiceId}`);
    return { qb_invoice_id: qbInvoiceId, synced: true };
  }

  /** Sync settlement to QuickBooks (creates QB Bill) */
  async syncSettlement(tenantId: number, settlementId: string) {
    const status = await this.getStatus(tenantId);
    if (!status.connected) throw new BadRequestException('QuickBooks is not connected');

    const settlement = await this.prisma.settlement.findFirst({
      where: { settlementId, tenantId },
      include: { driver: true, lineItems: true, deductions: true },
    });
    if (!settlement) throw new BadRequestException('Settlement not found');

    // POC: simulate QB API call
    const qbBillId = `QB-BILL-${Date.now()}`;

    await this.prisma.settlement.update({
      where: { id: settlement.id },
      data: {
        qbBillId,
        qbSyncedAt: new Date(),
        qbSyncError: null,
      },
    });

    this.logger.log(`Synced settlement ${settlement.settlementNumber} to QuickBooks as ${qbBillId}`);
    return { qb_bill_id: qbBillId, synced: true };
  }
}
