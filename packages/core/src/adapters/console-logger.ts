import type { Logger } from '../ports/logger.js';

export class ConsoleLogger implements Logger {
  constructor(private readonly prefix = 'mind-pet') {}

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(this.format(message), context ?? '');
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(this.format(message), context ?? '');
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.format(message), context ?? '');
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(this.format(message), context ?? '');
  }

  private format(message: string): string {
    return `[${this.prefix}] ${message}`;
  }
}
