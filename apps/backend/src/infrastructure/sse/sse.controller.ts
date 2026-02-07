import { Controller, Sse, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Observable, Subject } from 'rxjs';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SseService } from './sse.service';

@ApiTags('SSE')
@Controller('sse')
export class SseController {
  private readonly logger = new Logger(SseController.name);

  constructor(private readonly sseService: SseService) {}

  @Sse('stream')
  @ApiOperation({ summary: 'Subscribe to real-time events via SSE' })
  stream(@CurrentUser() user: any, @Req() req: Request): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.sseService.addClient(user.userId, user.tenantDbId, subject);

    // Send initial heartbeat
    subject.next({ data: JSON.stringify({ connected: true, timestamp: new Date().toISOString() }), type: 'heartbeat' } as MessageEvent);

    // Cleanup on disconnect
    req.on('close', () => {
      this.sseService.removeClient(user.userId);
    });

    return subject.asObservable();
  }
}
