import { Logger as NestLogger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { ContextStore } from './store/context-store';

type Bindings = Record<string, any>;

export class ContextLogger {
  private static internalLogger: PinoLogger;
  private readonly fallbackLogger = new NestLogger();

  constructor(private moduleName: string) {}

  static init(logger: PinoLogger): void {
    if (!ContextLogger.internalLogger) {
      ContextLogger.internalLogger = logger;
    }
  }

  static updateContext(context: Record<string, any>): void {
    ContextStore.updateContext(context);
  }

  static getContext(): Record<string, any> {
    return ContextStore.getContext();
  }

  log(message: string, bindings?: Bindings) {
    this.callInternalLogger('log', message, (bindings ?? {}));
  }

  info(message: string, bindings?: Bindings) {
    this.callInternalLogger('info', message, (bindings ?? {}));
  }

  debug(message: string, bindings?: Bindings) {
    this.callInternalLogger('debug', message, (bindings ?? {}));
  }
  
  verbose(message: string, bindings?: Bindings) {
    this.callInternalLogger('verbose', message, (bindings ?? {}));
  }
  
  warn(message: string, bindings?: Bindings) {
    this.callInternalLogger('warn', message, (bindings ?? {}));
  }
  
  fatal(message: string, bindings?: Bindings) {
    this.callInternalLogger('fatal', message, (bindings ?? {}));
  }

  error(message: string): void;
  error(message: string, error: Error): void;
  error(message: string, bindings: Bindings): void;
  error(message: string, error: Error, bindings: Bindings): void;
  error(message: string, errorOrBindings?: Error | Bindings, bindings?: Bindings): void {
    const context: any = {};
    if (errorOrBindings instanceof Error) {
      context.err = errorOrBindings;
      if (bindings) {
        Object.assign(context, bindings);
      }
    } else if (errorOrBindings) {
      Object.assign(context, errorOrBindings);
    }
    this.callInternalLogger('error', message, context);
  }

  private callInternalLogger(level: string, message: string, bindings: Bindings) {
    const logObject = { ...bindings, ...ContextStore.getContext() };
    // TODO: explain fallback logger, lifecycle of pino is not enough to cover all cases of startup logs
    const logger = ContextLogger.internalLogger ?? this.fallbackLogger;
    return logger[level](logObject, ...[message, this.moduleName]);
  }
}