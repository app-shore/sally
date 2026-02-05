import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HOSRuleEngineService } from '../services/hos-rule-engine.service';
import { z } from 'zod';

const HOSCheckRequestSchema = z.object({
  driver_id: z.string().min(1),
  hours_driven: z.number().min(0).max(24),
  on_duty_time: z.number().min(0).max(24),
  hours_since_break: z.number().min(0).max(24),
  last_rest_period: z.number().min(0).optional(),
});
type HOSCheckRequest = z.infer<typeof HOSCheckRequestSchema>;

@ApiTags('HOS Rules')
@Controller('hos-rules')
export class HOSRulesController {
  private readonly logger = new Logger(HOSRulesController.name);

  constructor(private readonly hosEngine: HOSRuleEngineService) {}

  @Post('check')
  @ApiOperation({ summary: 'Check HOS compliance for a driver' })
  @ApiResponse({ status: HttpStatus.OK, description: 'HOS compliance result' })
  async checkHOSCompliance(@Body() body: HOSCheckRequest) {
    this.logger.log(`HOS check requested for driver ${body.driver_id}`);

    // Validate request
    const parsed = HOSCheckRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { detail: `Validation error: ${parsed.error.message}` },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const result = this.hosEngine.validateCompliance(
      parsed.data.hours_driven,
      parsed.data.on_duty_time,
      parsed.data.hours_since_break,
      parsed.data.last_rest_period,
    );

    this.logger.log(
      `HOS check completed: status=${result.status}, compliant=${result.is_compliant}`,
    );
    return result;
  }
}
