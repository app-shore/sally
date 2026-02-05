import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';

interface Session {
  session_id: string;
  user_type: 'dispatcher' | 'driver';
  user_id: string | null;
  expires_at: string;
  created_at: string;
}

@ApiTags('Session')
@Controller('session')
export class SessionController {
  private readonly logger = new Logger(SessionController.name);
  private readonly sessions = new Map<string, Session>();

  @Post('login')
  @ApiOperation({
    summary: 'Mock login (no authentication, just creates session)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        user_type: { type: 'string', enum: ['dispatcher', 'driver'] },
        user_id: { type: 'string', nullable: true },
      },
      required: ['user_type'],
    },
  })
  async login(
    @Body() body: { user_type: 'dispatcher' | 'driver'; user_id?: string },
  ) {
    this.logger.log(
      `Mock login: user_type=${body.user_type}, user_id=${body.user_id || 'null'}`,
    );

    // Validate user_type
    if (!['dispatcher', 'driver'].includes(body.user_type)) {
      throw new HttpException(
        { detail: 'Invalid user_type. Must be "dispatcher" or "driver"' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // If driver, user_id is required
    if (body.user_type === 'driver' && !body.user_id) {
      throw new HttpException(
        { detail: 'user_id is required when user_type is "driver"' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const session: Session = {
      session_id: sessionId,
      user_type: body.user_type,
      user_id: body.user_type === 'driver' ? body.user_id || null : null,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    };

    // Store session in memory
    this.sessions.set(sessionId, session);

    this.logger.log(`Session created: ${sessionId}`);

    return {
      session_id: sessionId,
      user_type: session.user_type,
      user_id: session.user_id,
      expires_at: session.expires_at,
      message: 'Session created successfully (mock - no authentication)',
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout (delete session)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
      },
      required: ['session_id'],
    },
  })
  async logout(@Body() body: { session_id: string }) {
    this.logger.log(`Logout: session_id=${body.session_id}`);

    const deleted = this.sessions.delete(body.session_id);

    if (!deleted) {
      throw new HttpException(
        { detail: 'Session not found or already expired' },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      message: 'Logged out successfully',
    };
  }
}
