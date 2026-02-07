import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../database/prisma.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // socketId → userId

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.connectedUsers.set(client.id, userId);
      client.join(`user:${userId}`);
      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
  }

  @SubscribeMessage('dispatch:message')
  handleDispatchMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string; message: string; priority?: string },
  ) {
    const senderId = this.connectedUsers.get(client.id);
    this.logger.log(`Dispatch message from ${senderId} to driver ${data.driverId}: ${data.message}`);

    // Send to driver's room
    this.server.to(`user:${data.driverId}`).emit('message:received', {
      from: senderId,
      message: data.message,
      priority: data.priority || 'normal',
      timestamp: new Date().toISOString(),
    });

    // Acknowledge to sender
    client.emit('message:sent', {
      to: data.driverId,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('driver:acknowledge')
  handleDriverAcknowledge(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { alertId: string; message?: string },
  ) {
    const driverId = this.connectedUsers.get(client.id);
    this.logger.log(`Driver ${driverId} acknowledged alert ${data.alertId}`);

    // Broadcast to all dispatchers in the tenant
    this.server.emit('driver:acknowledged', {
      driverId,
      alertId: data.alertId,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  }

  // Server-side emit helper (called from other services)
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
