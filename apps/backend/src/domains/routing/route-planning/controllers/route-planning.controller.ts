import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseTenantController } from '../../../../shared/base/base-tenant.controller';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import {
  RoutePlanningEngineService,
  RoutePlanRequest,
} from '../services/route-planning-engine.service';
import { RoutePlanPersistenceService } from '../services/route-plan-persistence.service';
import {
  CreateRoutePlanSchema,
  CreateRoutePlanDto,
} from '../dto/create-route-plan.dto';

/**
 * RoutePlanningController handles HTTP requests for route planning operations.
 * Provides endpoints for planning, activating, and managing route plans.
 */
@Controller('routes')
export class RoutePlanningController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly routePlanningEngine: RoutePlanningEngineService,
    private readonly persistenceService: RoutePlanPersistenceService,
  ) {
    super(prisma);
  }

  /**
   * Plan a new route.
   * POST /routes/plan
   */
  @Post('plan')
  async planRoute(@Body() body: any, @CurrentUser() user: any) {
    // Validate request body with Zod
    let dto: CreateRoutePlanDto;
    try {
      dto = CreateRoutePlanSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.issues,
        });
      }
      throw error;
    }

    // Get tenant database ID
    const tenantId = await this.getTenantDbId(user);

    // Build request for the engine
    const request: RoutePlanRequest = {
      driverId: dto.driverId,
      vehicleId: dto.vehicleId,
      loadIds: dto.loadIds,
      departureTime: new Date(dto.departureTime),
      tenantId,
      optimizationPriority: dto.optimizationPriority,
      dispatcherParams: dto.dispatcherParams,
    };

    // Call the route planning engine
    return this.routePlanningEngine.planRoute(request);
  }

  /**
   * List routes with optional filters.
   * GET /routes?status=active&limit=50&offset=0
   */
  @Get()
  async listRoutes(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @CurrentUser() user?: any,
  ) {
    const tenantId = await this.getTenantDbId(user);

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : undefined;

    const result = await this.persistenceService.listPlans({
      tenantId,
      status,
      limit:
        parsedLimit && parsedLimit > 0
          ? Math.min(parsedLimit, 200)
          : undefined,
      offset: parsedOffset && parsedOffset >= 0 ? parsedOffset : undefined,
    });

    return result;
  }

  /**
   * Get driver's active route.
   * GET /routes/driver/:driverId/active
   */
  @Get('driver/:driverId/active')
  async getDriverActiveRoute(
    @Param('driverId') driverId: string,
    @CurrentUser() user: any,
  ) {
    const tenantId = await this.getTenantDbId(user);

    // Resolve driver string ID to numeric ID
    const driver = await this.prisma.driver.findFirst({
      where: { driverId, tenantId },
    });

    if (!driver) {
      throw new NotFoundException(`Driver not found: ${driverId}`);
    }

    // Get active plan
    const plan = await this.persistenceService.getActivePlanForDriver(
      driver.id,
    );

    return plan;
  }

  /**
   * Get plan details by planId.
   * GET /routes/:planId
   */
  @Get(':planId')
  async getPlan(@Param('planId') planId: string, @CurrentUser() user: any) {
    const plan = await this.persistenceService.getPlanById(planId);

    // Validate tenant access
    await this.validateTenantAccess(plan.tenantId, user.tenantId);

    return plan;
  }

  /**
   * Activate a route plan.
   * POST /routes/:planId/activate
   */
  @Post(':planId/activate')
  async activateRoute(
    @Param('planId') planId: string,
    @CurrentUser() user: any,
  ) {
    // First get the plan to validate tenant access
    const plan = await this.persistenceService.getPlanById(planId);
    await this.validateTenantAccess(plan.tenantId, user.tenantId);

    // Activate the plan
    const activated = await this.persistenceService.activatePlan(planId);

    return activated;
  }

  /**
   * Cancel a route plan.
   * POST /routes/:planId/cancel
   */
  @Post(':planId/cancel')
  async cancelRoute(@Param('planId') planId: string, @CurrentUser() user: any) {
    // First get the plan to validate tenant access
    const plan = await this.persistenceService.getPlanById(planId);
    await this.validateTenantAccess(plan.tenantId, user.tenantId);

    // Cancel the plan
    const cancelled = await this.persistenceService.cancelPlan(planId);

    return cancelled;
  }
}
