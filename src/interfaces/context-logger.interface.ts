import { ExecutionContext, ModuleMetadata } from '@nestjs/common';
import { Params } from 'nestjs-pino';

export interface ContextLoggerFactoryOptions extends Params {

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

}

export interface ContextLoggerAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<ContextLoggerFactoryOptions> | ContextLoggerFactoryOptions;
  inject?: any[];
}
