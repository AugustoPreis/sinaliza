import { Injectable, LoggerService } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Injectable()
export class AppLoggerService implements LoggerService {
  constructor(private readonly pinoLogger: Logger) {}

  log(message: string, context?: string): void {
    this.pinoLogger.log(message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.pinoLogger.error(message, trace, context);
  }

  warn(message: string, context?: string): void {
    this.pinoLogger.warn(message, context);
  }

  debug(message: string, context?: string): void {
    this.pinoLogger.debug?.(message, context);
  }

  verbose(message: string, context?: string): void {
    this.pinoLogger.verbose?.(message, context);
  }
}
