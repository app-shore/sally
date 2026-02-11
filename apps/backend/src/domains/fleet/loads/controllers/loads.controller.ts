import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { BaseTenantController } from '../../../../shared/base/base-tenant.controller';
import { CurrentUser } from '../../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { LoadsService } from '../services/loads.service';
import { CreateLoadDto } from '../dto';

@ApiTags('Loads')
@ApiBearerAuth()
@Controller('loads')
export class LoadsController extends BaseTenantController {
  constructor(
    prisma: PrismaService,
    private readonly loadsService: LoadsService,
  ) {
    super(prisma);
  }

  @Post()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new load with stops' })
  async createLoad(
    @CurrentUser() user: any,
    @Body() createLoadDto: CreateLoadDto,
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.loadsService.create({ ...createLoadDto, tenant_id: tenantDbId });
  }

  @Get()
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'List all loads with optional filtering' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customer_name', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async listLoads(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('customer_name') customerName?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.loadsService.findAll(
      tenantDbId,
      {
        status,
        customer_name: customerName,
      },
      {
        limit: Number(limit),
        offset: Number(offset),
      },
    );
  }

  @Get(':load_id')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get load details with stops' })
  async getLoad(@Param('load_id') loadId: string) {
    return this.loadsService.findOne(loadId);
  }

  @Patch(':load_id/status')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update load status' })
  async updateLoadStatus(
    @Param('load_id') loadId: string,
    @Body() body: { status: string },
  ) {
    return this.loadsService.updateStatus(loadId, body.status);
  }

  @Post(':load_id/assign')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Assign driver and vehicle to load' })
  async assignLoad(
    @Param('load_id') loadId: string,
    @Body() body: { driver_id: string; vehicle_id: string },
  ) {
    return this.loadsService.assignLoad(loadId, body.driver_id, body.vehicle_id);
  }

  @Post(':load_id/tracking-token')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Generate tracking token for load' })
  async generateTrackingToken(@Param('load_id') loadId: string) {
    return this.loadsService.generateTrackingToken(loadId);
  }

  @Post(':load_id/duplicate')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Duplicate an existing load' })
  async duplicateLoad(
    @CurrentUser() user: any,
    @Param('load_id') loadId: string,
  ) {
    const tenantDbId = await this.getTenantDbId(user);
    return this.loadsService.duplicate(loadId, tenantDbId);
  }
}
