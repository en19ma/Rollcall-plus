import { LoggerService, LogLevel } from '@nestjs/common';

/**
 * Minimal structured logger: one JSON object per line to stdout/stderr,
 * instead of Nest's default colored/human-formatted console output.
 * This is what production log aggregators (Railway, Render, Datadog, etc.)
 * expect — each line is independently parseable, with a consistent shape.
 *
 * Deliberately dependency-free (no pino/winston) to avoid pulling in and
 * needing to validate a new package inside this environment.
 */
export class StructuredLogger implements LoggerService {
  private write(level: LogLevel, message: unknown, context?: string, extra?: Record<string, unknown>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? 'Application',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      ...extra,
    };
    const line = JSON.stringify(entry);
    if (level === 'error') process.stderr.write(line + '\n');
    else process.stdout.write(line + '\n');
  }

  log(message: unknown, context?: string) {
    this.write('log', message, context);
  }
  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace ? { trace } : undefined);
  }
  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }
  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }
  verbose(message: unknown, context?: string) {
    this.write('verbose', message, context);
  }
}
