import { Controller, Get, Post, Delete, Param, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { CommandCenterService } from './command-center.service';
import { CreateShiftNoteDto } from './dto/create-shift-note.dto';

@ApiTags('Command Center')
@Controller('command-center')
export class CommandCenterController {
  private readonly logger = new Logger(CommandCenterController.name);

  constructor(private readonly service: CommandCenterService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get command center overview (KPIs, routes, HOS strip)' })
  async getOverview(@CurrentUser() user: any) {
    return this.service.getOverview(user.tenantDbId);
  }

  @Get('shift-notes')
  @ApiOperation({ summary: 'Get shift notes for current tenant' })
  async getShiftNotes(@CurrentUser() user: any) {
    return this.service.getShiftNotes(user.tenantDbId);
  }

  @Post('shift-notes')
  @ApiOperation({ summary: 'Create a new shift note' })
  async createShiftNote(
    @CurrentUser() user: any,
    @Body() dto: CreateShiftNoteDto,
  ) {
    return this.service.createShiftNote(
      user.tenantDbId,
      user.userId,
      dto.content,
      dto.isPinned,
    );
  }

  @Delete('shift-notes/:noteId')
  @ApiOperation({ summary: 'Delete a shift note' })
  async deleteShiftNote(
    @CurrentUser() user: any,
    @Param('noteId') noteId: string,
  ) {
    await this.service.deleteShiftNote(user.tenantDbId, noteId);
    return { message: 'Note deleted' };
  }
}
