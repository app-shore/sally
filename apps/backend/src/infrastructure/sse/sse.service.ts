import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

interface SseClient {
  userId: string;
  tenantId: number;
  subject: Subject<MessageEvent>;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly clients = new Map<string, SseClient>();

  addClient(userId: string, tenantId: number, subject: Subject<MessageEvent>) {
    this.clients.set(userId, { userId, tenantId, subject });
    this.logger.log(`SSE client connected: ${userId} (tenant: ${tenantId}). Total: ${this.clients.size}`);
  }

  removeClient(userId: string) {
    const client = this.clients.get(userId);
    if (client) {
      client.subject.complete();
      this.clients.delete(userId);
      this.logger.log(`SSE client disconnected: ${userId}. Total: ${this.clients.size}`);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  emitToTenant(tenantId: number, eventType: string, data: any) {
    const event = { data: JSON.stringify(data), type: eventType } as MessageEvent;
    for (const client of this.clients.values()) {
      if (client.tenantId === tenantId) {
        client.subject.next(event);
      }
    }
  }

  emitToUser(userId: string, eventType: string, data: any) {
    const client = this.clients.get(userId);
    if (client) {
      client.subject.next({
        data: JSON.stringify(data),
        type: eventType,
      } as MessageEvent);
    }
  }
}
