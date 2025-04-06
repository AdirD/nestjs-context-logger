import { ExecutionContext, ModuleMetadata } from '@nestjs/common';
import { Params } from 'nestjs-pino';
import { Bindings, LoggerHookKeys } from '../types';

export interface ContextLoggerFactoryOptions extends Params {
  /**
   * Configuration for grouping log fields under specific keys.
   * If not provided or empty, all fields will be spread at the root level.
   * Specify keys to group specific fields:
   * - bindingsKey: Groups runtime bindings under this key
   * - contextKey: Groups context data under this key
   *
   * @example
   * // Group both bindings and context
   * groupFields: { bindingsKey: 'params', contextKey: 'metadata' }
   *
   * // Group only bindings, spread context at root
   * groupFields: { bindingsKey: 'params' }
   *
   * // Group only context, spread bindings at root
   * groupFields: { contextKey: 'metadata' }
   */
  groupFields?: {
    /**
     * Key under which runtime bindings will be grouped.
     * If not specified, bindings will be spread at the root level.
     */
    bindingsKey?: string;
    /**
     * Key under which context data will be grouped.
     * If not specified, context will be spread at the root level.
     */
    contextKey?: string;
  };

  /**
   * When true, bootstrap logs will be ignored.
   * This is useful for those who want to suppress NestJS framework logs during bootstrap phase coming from NestJS RouterExplorer and RoutesResolver.
   * like "Nest application successfully started" or "Mapped {/api/users, GET} route", etc.
   * @default false
   */
  ignoreBootstrapLogs?: boolean;

  /**
   * Optional function to transform the context before it is included in the log entry.
   * Useful for filtering, renaming, or restructuring context data.
   *
   * @param context - The current context object
   * @returns The transformed context object
   */
  contextAdapter?: (context: Record<string, any>) => Record<string, any>;

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
   * Optional hooks to execute when a log is created.
   * These callbacks allow you to extend logging behavior, such as reporting to external systems,
   * incrementing metrics, or performing side effects based on log level.
   *
   * ⚠️ Note: All callbacks are executed **synchronously and sequentially**.
   * This means each hook will block the next one, potentially introducing latency
   * to the logging process. Use with caution, especially when performing async-like tasks.
   *
   * @example
   * hooks: {
   *   all: [
   *     (message: string, bindings: Bindings) => {
   *       // do something for all logs
   *     },
   *   ],
   *   error: [
   *     (message: string, bindings: Bindings) => {
   *       // do something specific for error logs
   *     },
   *   ],
   * }
   */
  hooks?: Partial<Record<LoggerHookKeys, Array<(message: string, bindings: Bindings) => void>>>;
}

export interface ContextLoggerAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<ContextLoggerFactoryOptions> | ContextLoggerFactoryOptions;
  inject?: any[];
}
