import { Logger as NestLogger } from '@nestjs/common';
import { Logger as NestJSPinoLogger } from 'nestjs-pino';
import { ContextStore } from './store/context-store';

type Bindings = Record<string, any>;

export class ContextLogger {
  private static internalLogger: NestJSPinoLogger;
  private readonly fallbackLogger = new NestLogger();

  constructor(private moduleName: string) {}

  static init(logger: NestJSPinoLogger): void {
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
      // Bootstrapping logs
    } else if (typeof errorOrBindings === 'string') {
      context.err = errorOrBindings;
    } else if (errorOrBindings) {
      Object.assign(context, errorOrBindings);
    }
    this.callInternalLogger('error', message, context);
  }

  private callInternalLogger(level: string, message: string, bindings: Bindings) {
    let logObject: Record<string, any>;
    if (typeof bindings === 'string') {
      // Bootstrapping logs
      logObject = { component: bindings };
    } else {
      // Normal request log
      logObject = { ...bindings, ...ContextStore.getContext() };
    }
    const logger = ContextLogger.internalLogger ?? this.fallbackLogger;
    return logger[level](logObject, ...[message, this.moduleName]);
  }
}