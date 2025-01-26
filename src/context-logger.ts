import { Logger as NestLogger } from '@nestjs/common';
import { Logger as NestJSPinoLogger } from 'nestjs-pino';
import { ContextStore } from './store/context-store';
import { omitBy, isNil } from 'lodash';

type Bindings = Record<string, any>;

export interface LogEntry {
  message: string;
  logBindings?: Record<string, any>;
  logContext?: Record<string, any>;
  err?: Error | string;
}

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
    let error;
    const adaptedBindings = {};
    if (errorOrBindings instanceof Error) {
      error = errorOrBindings;
      if (bindings) {
        Object.assign(adaptedBindings, bindings);
      }
      // Bootstrapping logs
    } else if (typeof errorOrBindings === 'string') {
      error = errorOrBindings;
    } else if (errorOrBindings) {
      Object.assign(adaptedBindings, errorOrBindings);
    }
    this.callInternalLogger('error', message, adaptedBindings, error);
  }

  private callInternalLogger(level: string, message: string, bindings: Bindings, error?: Error | string) {
    let logObject: Record<string, any>;
    if (typeof bindings === 'string') {
      // Bootstrapping logs
      logObject = { component: bindings };
    } else {
      logObject = this.createLogEntry(message, bindings, error);
    }
    const logger = ContextLogger.internalLogger ?? this.fallbackLogger;
    return logger[level](logObject, ...[message, this.moduleName]);
  }

  private createLogEntry(
    message: string,
    bindings?: Record<string, any>,
    error?: Error | string,
  ): LogEntry {
    const logEntry = omitBy(
      {
        message,
        logContext: ContextStore.getContext(),
        logBindings: bindings,
        err: error,
      },
      isNil,
    );
    return logEntry;
  }
}
