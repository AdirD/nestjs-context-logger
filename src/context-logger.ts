import { Logger as NestLogger } from '@nestjs/common';
import { Logger as NestJSPinoLogger } from 'nestjs-pino';
import { ContextStore } from './store/context-store';
import { omitBy, isNil, isEmpty } from 'lodash';
import { ContextLoggerFactoryOptions } from './interfaces/context-logger.interface';

type Bindings = Record<string, any>;

export interface LogEntry {
  [key: string]: any;
  err?: Error | string;
}

export class ContextLogger {
  private static internalLogger: NestJSPinoLogger;
  private static options: ContextLoggerFactoryOptions;
  private readonly fallbackLogger = new NestLogger();

  constructor(private moduleName: string) { }

  static init(logger: NestJSPinoLogger, options: ContextLoggerFactoryOptions = {}): void {
    if (!ContextLogger.internalLogger) {
      ContextLogger.internalLogger = logger;
    }

    ContextLogger.options = options;
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

  /**
   * @deprecated This method is deprecated and will be removed in a future version.
   * It currently calls the 'log' method internally.
   * Please use the 'log' method directly instead.
   * https://github.com/AdirD/nestjs-context-logger/issues/5
   */
  info(message: string, bindings?: Bindings) {
    this.callInternalLogger('log', message, (bindings ?? {}));
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
    // If it's a bootstrap log and ignoreBootstrapLogs is true, do nothing
    if (typeof bindings === 'string' && ContextLogger.options?.ignoreBootstrapLogs) {
      return;
    }

    let logObject: Record<string, any>;
    if (typeof bindings === 'string') {
      // Bootstrapping logs
      logObject = { component: bindings };
    } else {
      logObject = this.createLogEntry(bindings, error);
    }
    const logger = ContextLogger.internalLogger ?? this.fallbackLogger;
    return logger[level](logObject, ...[message, this.moduleName]);
  }

  private createLogEntry(
    bindings?: Bindings,
    error?: Error | string,
  ): LogEntry {
    const storeContext = ContextStore.getContext();
    const adaptedContext = ContextLogger.options?.contextAdapter
      ? ContextLogger.options?.contextAdapter(storeContext)
      : storeContext;

    const { bindingsKey, contextKey } = ContextLogger.options?.groupFields ?? {};

    const logEntry: LogEntry = {
      ...this.parseObject(contextKey, adaptedContext),
      ...this.parseObject(bindingsKey, bindings),
      ...(error && { err: error }),
    };

    return omitBy(logEntry, isNil);
  }

  private parseObject(key: string, obj: Bindings): Bindings {
    if (!key) {
      return obj;
    }

    if (isEmpty(obj)) {
      return {};
    }

    return { [key]: obj };
  }
}
