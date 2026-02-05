import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter for consistent error responses.
 * Centralizes error handling and logging across all controllers.
 *
 * Benefits:
 * - Consistent error response format
 * - Automatic error logging with context
 * - Eliminates 65+ duplicate error handling blocks
 * - Handles both HTTP exceptions and unexpected errors
 *
 * Usage:
 * Register in AppModule as global filter:
 * ```typescript
 * {
 *   provide: APP_FILTER,
 *   useClass: HttpExceptionFilter,
 * }
 * ```
 *
 * In controllers, just throw standard NestJS exceptions:
 * ```typescript
 * throw new NotFoundException('Driver not found');
 * throw new ForbiddenException('Access denied');
 * throw new BadRequestException('Invalid input');
 * ```
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error message
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { detail: 'Internal server error' };

    // Build error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(typeof message === 'string' ? { detail: message } : message),
    };

    // Log error with appropriate level
    if (status >= 500) {
      // Server errors - log with stack trace
      this.logger.error(
        `${request.method} ${request.url} - Status: ${status}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else if (status >= 400) {
      // Client errors - log as warning
      this.logger.warn(
        `${request.method} ${request.url} - Status: ${status} - ${JSON.stringify(errorResponse)}`,
      );
    }

    // Send response
    response.status(status).json(errorResponse);
  }
}
