import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Tenant } from '@prisma/client';

/**
 * Base controller providing tenant-related utilities.
 * Eliminates duplicate tenant validation code across controllers.
 *
 * Usage:
 * ```typescript
 * @Controller('drivers')
 * export class DriversController extends BaseTenantController {
 *   constructor(
 *     prisma: PrismaService,
 *     private readonly driversService: DriversService,
 *   ) {
 *     super(prisma);
 *   }
 *
 *   @Get()
 *   async listDrivers(@CurrentUser() user: any) {
 *     const tenantDbId = await this.getTenantDbId(user);
 *     return this.driversService.findAll(tenantDbId);
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseTenantController {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Get tenant by tenantId (string).
   * Throws NotFoundException if tenant not found.
   *
   * @param tenantId - The tenant ID (string, not database ID)
   * @returns Promise<Tenant>
   * @throws NotFoundException if tenant not found
   */
  protected async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Get tenant database ID from authenticated user.
   * This is the most common use case - use this in most endpoints.
   *
   * @param user - The authenticated user object (from @CurrentUser() decorator)
   * @returns Promise<number> - The tenant's database ID
   * @throws NotFoundException if tenant not found
   */
  protected async getTenantDbId(user: any): Promise<number> {
    const tenant = await this.getTenant(user.tenantId);
    return tenant.id;
  }

  /**
   * Validate that a resource belongs to the user's tenant.
   * Throws ForbiddenException if tenant doesn't match.
   *
   * @param resourceTenantId - The tenant ID of the resource (database ID)
   * @param userTenantId - The tenant ID from the authenticated user (string)
   * @throws ForbiddenException if tenant access denied
   * @throws NotFoundException if tenant not found
   */
  protected async validateTenantAccess(
    resourceTenantId: number,
    userTenantId: string,
  ): Promise<void> {
    const tenant = await this.getTenant(userTenantId);

    if (resourceTenantId !== tenant.id) {
      throw new ForbiddenException(
        'You do not have access to this resource',
      );
    }
  }
}
