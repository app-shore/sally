import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PredictionEngineService } from '../../services/prediction-engine/prediction-engine.service';
import { z } from 'zod';

const PredictionRequestSchema = z.object({
  remaining_distance_miles: z.number().positive(),
  destination: z.string().min(1),
  appointment_time: z.string().optional(),
  current_location: z.string().optional(),
  average_speed_mph: z.number().positive().max(100).default(55.0),
});
type PredictionRequest = z.infer<typeof PredictionRequestSchema>;

@ApiTags('Prediction')
@Controller('prediction')
export class PredictionController {
  private readonly logger = new Logger(PredictionController.name);

  constructor(private readonly predictionEngine: PredictionEngineService) {}

  @Post('estimate')
  @ApiOperation({ summary: 'Estimate post-load drive demand' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Drive demand prediction',
  })
  async estimateDriveDemand(@Body() body: PredictionRequest) {
    this.logger.log(
      `Prediction requested for destination: ${body.destination}`,
    );

    const parsed = PredictionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { detail: `Validation error: ${parsed.error.message}` },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      const result = this.predictionEngine.predictDriveDemand({
        remaining_distance_miles: parsed.data.remaining_distance_miles,
        destination: parsed.data.destination,
        appointment_time: parsed.data.appointment_time,
        current_location: parsed.data.current_location,
        average_speed_mph: parsed.data.average_speed_mph,
      });

      this.logger.log(
        `Prediction completed: ${result.estimated_drive_hours}h, high_demand=${result.is_high_demand}, low_demand=${result.is_low_demand}`,
      );
      return result;
    } catch (error) {
      if (error.message?.includes('must be positive')) {
        throw new HttpException(
          { detail: error.message },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      this.logger.error(`Prediction failed: ${error.message}`);
      throw new HttpException(
        { detail: 'Failed to estimate drive demand' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
