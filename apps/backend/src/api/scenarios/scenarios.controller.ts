import { Controller, Get, Post, Param, Query, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Scenarios')
@Controller('scenarios')
export class ScenariosController {
  private readonly logger = new Logger(ScenariosController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all test scenarios' })
  @ApiQuery({ name: 'category', required: false })
  async listScenarios(@Query('category') category?: string) {
    this.logger.log(`List scenarios requested, category: ${category}`);

    try {
      const scenarios = await this.prisma.scenario.findMany({
        where: {
          isActive: true,
          ...(category ? { category } : {}),
        },
        orderBy: { displayOrder: 'asc' },
      });

      return scenarios.map((scenario) => ({
        id: scenario.id,
        scenario_id: scenario.scenarioId,
        name: scenario.name,
        description: scenario.description,
        category: scenario.category,
        expected_rest_stops: scenario.expectedRestStops,
        expected_fuel_stops: scenario.expectedFuelStops,
        display_order: scenario.displayOrder,
      }));
    } catch (error) {
      this.logger.error(`List scenarios failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to fetch scenarios' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':scenario_id')
  @ApiOperation({ summary: 'Get scenario template details' })
  async getScenario(@Param('scenario_id') scenarioId: string) {
    this.logger.log(`Get scenario requested: ${scenarioId}`);

    try {
      const scenario = await this.prisma.scenario.findFirst({
        where: { scenarioId },
      });

      if (!scenario) {
        throw new HttpException({ detail: `Scenario not found: ${scenarioId}` }, HttpStatus.NOT_FOUND);
      }

      return {
        id: scenario.id,
        scenario_id: scenario.scenarioId,
        name: scenario.name,
        description: scenario.description,
        category: scenario.category,
        driver_state_template: scenario.driverStateTemplate,
        vehicle_state_template: scenario.vehicleStateTemplate,
        stops_template: scenario.stopsTemplate,
        expected_rest_stops: scenario.expectedRestStops,
        expected_fuel_stops: scenario.expectedFuelStops,
        expected_violations: scenario.expectedViolations || [],
        is_active: scenario.isActive,
        display_order: scenario.displayOrder,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Get scenario failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to fetch scenario' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(':scenario_id/instantiate')
  @ApiOperation({ summary: 'Load driver and vehicle state from scenario' })
  async instantiateScenario(@Param('scenario_id') scenarioId: string) {
    this.logger.log(`Instantiate scenario requested: ${scenarioId}`);

    try {
      const scenario = await this.prisma.scenario.findFirst({
        where: { scenarioId },
      });

      if (!scenario) {
        throw new HttpException({ detail: `Scenario not found: ${scenarioId}` }, HttpStatus.NOT_FOUND);
      }

      return {
        driver_id: scenario.driverId,
        vehicle_id: scenario.vehicleId,
        driver_state: scenario.driverStateTemplate,
        vehicle_state: scenario.vehicleStateTemplate,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Instantiate scenario failed: ${error.message}`);
      throw new HttpException({ detail: 'Failed to instantiate scenario' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
