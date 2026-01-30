import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get()
  async listIntegrations(@Request() req) {
    return this.integrationsService.listIntegrations(req.user.tenantId);
  }

  @Get(':integrationId')
  async getIntegration(@Param('integrationId') integrationId: string) {
    return this.integrationsService.getIntegration(integrationId);
  }

  @Post()
  async createIntegration(@Body() dto: CreateIntegrationDto, @Request() req) {
    return this.integrationsService.createIntegration(req.user.tenantId, dto);
  }

  @Patch(':integrationId')
  async updateIntegration(
    @Param('integrationId') integrationId: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    return this.integrationsService.updateIntegration(integrationId, dto);
  }

  @Delete(':integrationId')
  async deleteIntegration(@Param('integrationId') integrationId: string) {
    return this.integrationsService.deleteIntegration(integrationId);
  }

  @Post(':integrationId/test')
  async testConnection(@Param('integrationId') integrationId: string) {
    return this.integrationsService.testConnection(integrationId);
  }

  @Post(':integrationId/sync')
  async triggerSync(@Param('integrationId') integrationId: string) {
    return this.integrationsService.triggerSync(integrationId);
  }
}
