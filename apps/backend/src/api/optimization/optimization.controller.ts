import { Controller, Post, Body, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RestOptimizationService } from '../../services/rest-optimization/rest-optimization.service';
import { z } from 'zod';

const OptimizationRequestSchema = z.object({
  driver_id: z.string().min(1),
  hours_driven: z.number().min(0).max(24),
  on_duty_time: z.number().min(0).max(24),
  hours_since_break: z.number().min(0).max(24),
  dock_duration_hours: z.number().min(0).optional(),
  dock_location: z.string().optional(),
  remaining_distance_miles: z.number().min(0).optional(),
  destination: z.string().optional(),
  appointment_time: z.string().optional(),
  upcoming_trips: z.array(z.object({
    drive_time: z.number().min(0).max(24),
    dock_time: z.number().min(0).max(24),
    location: z.string().optional(),
  })).optional(),
  current_location: z.string().optional(),
});
type OptimizationRequest = z.infer<typeof OptimizationRequestSchema>;

@ApiTags('Optimization')
@Controller('optimization')
export class OptimizationController {
  private readonly logger = new Logger(OptimizationController.name);

  constructor(private readonly restOptimization: RestOptimizationService) {}

  @Post('recommend')
  @ApiOperation({ summary: 'Get intelligent rest optimization recommendation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'REST optimization recommendation' })
  async recommendRest(@Body() body: OptimizationRequest) {
    this.logger.log(`Optimization requested for driver ${body.driver_id}`);

    const parsed = OptimizationRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { detail: `Validation error: ${parsed.error.message}` },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      const data = parsed.data;
      const result = this.restOptimization.recommendRest({
        hours_driven: data.hours_driven,
        on_duty_time: data.on_duty_time,
        hours_since_break: data.hours_since_break,
        dock_duration_hours: data.dock_duration_hours,
        post_load_drive_hours: data.remaining_distance_miles ? data.remaining_distance_miles / 55.0 : undefined,
        current_location: data.current_location,
        upcoming_trips: data.upcoming_trips,
      });

      this.logger.log(`Optimization completed: recommendation=${result.recommendation}, confidence=${result.confidence}`);
      return result;
    } catch (error) {
      if (error instanceof TypeError || error.message?.includes('must be')) {
        throw new HttpException(
          { detail: error.message || 'Validation failed' },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      this.logger.error(`Optimization failed: ${error.message}`);
      throw new HttpException(
        { detail: 'Failed to generate optimization recommendation' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
