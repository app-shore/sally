import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyDto } from './dto/api-key.dto';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully', type: ApiKeyDto })
  async create(
    @Request() req,
    @Body() createApiKeyDto: CreateApiKeyDto
  ): Promise<ApiKeyDto> {
    return this.apiKeysService.create(req.user.id, createApiKeyDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for current user' })
  @ApiResponse({ status: 200, description: 'List of API keys', type: [ApiKeyDto] })
  async findAll(@Request() req): Promise<ApiKeyDto[]> {
    return this.apiKeysService.findAll(req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 204, description: 'API key revoked successfully' })
  async revoke(
    @Request() req,
    @Param('id') id: string
  ): Promise<void> {
    return this.apiKeysService.revoke(id, req.user.id);
  }
}
