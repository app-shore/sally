import { Controller, Get, Param, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagDto, FeatureFlagsResponse } from './dto/feature-flag.dto';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Feature Flags')
@Controller('feature-flags')
@Public()
export class FeatureFlagsController {
  private readonly logger = new Logger(FeatureFlagsController.name);

  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feature flags retrieved successfully',
    type: FeatureFlagsResponse,
  })
  async getAllFlags(): Promise<FeatureFlagsResponse> {
    const flags = await this.featureFlagsService.getAllFlags();
    return { flags };
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get specific feature flag by key' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feature flag retrieved successfully',
    type: FeatureFlagDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feature flag not found',
  })
  async getFlagByKey(@Param('key') key: string): Promise<FeatureFlagDto> {
    const flag = await this.featureFlagsService.getFlagByKey(key);

    if (!flag) {
      throw new Error(`Feature flag '${key}' not found`);
    }

    return flag;
  }

  @Get(':key/enabled')
  @ApiOperation({ summary: 'Check if feature is enabled' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feature enabled status',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        enabled: { type: 'boolean' },
      },
    },
  })
  async isEnabled(@Param('key') key: string): Promise<{ key: string; enabled: boolean }> {
    const enabled = await this.featureFlagsService.isEnabled(key);
    return { key, enabled };
  }
}
