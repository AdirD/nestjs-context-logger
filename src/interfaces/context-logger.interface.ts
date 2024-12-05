import { ExecutionContext, ModuleMetadata } from '@nestjs/common';

export interface ContextLoggerFactoryOptions {
  /**
   * Array of endpoints that should not be logged, e.g. ['/health', '/metrics']
   */
  exclude?: string[];

  /**
   * Custom context enricher function that can be used to add custom context to the log.
   * This function should return an object that will be merged with the base context.
   *
   * @param context - ExecutionContext
   * @returns Record<string, any> | Promise<Record<string, any>>
   */
  enrichContext?: (
    context: ExecutionContext
  ) => Record<string, any> | Promise<Record<string, any>>;

  /**
   * Log level for the logger, defaults to 'info'
   */
  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

export interface ContextLoggerAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<ContextLoggerFactoryOptions> | ContextLoggerFactoryOptions;
  inject?: any[];
}
