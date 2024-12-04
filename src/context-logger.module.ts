import {
  DynamicModule,
  Module,
  MiddlewareConsumer,
  NestModule,
  Inject,
} from '@nestjs/common';
import { LoggerModule, Logger as NestJSPinoLogger } from 'nestjs-pino';
import { RequestInterceptor } from './interceptors/request.interceptor';
import { InitContextMiddleware } from './middlewares/context.middleware';
import { ContextLoggerFactoryOptions } from './interfaces/context-logger.interface';
import { ContextLogger } from './context-logger';
import pino from 'pino';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({})
export class ContextLoggerModule implements NestModule {
  constructor(
    @Inject('CONTEXT_LOGGER_OPTIONS')
    private readonly options: ContextLoggerFactoryOptions,
    private readonly nestJSPinoLogger: NestJSPinoLogger
  ) {}

  onModuleInit() {
    ContextLogger.init(this.nestJSPinoLogger);
  }

  configure(consumer: MiddlewareConsumer) {
    const excludePatterns = this.options.exclude || [];
    consumer
      .apply(InitContextMiddleware)
      .exclude(...excludePatterns)
      .forRoutes('*');
  }

  private static createPinoConfig(options: ContextLoggerFactoryOptions) {
    return {
      renameContext: 'service',
      pinoHttp: {
        autoLogging: false,
        logger: pino({
          level: options.logLevel || 'info',
          formatters: {
            level: (label) => ({ level: label }),
          },
        }),
      },
      exclude: options.exclude || [],
    };
  }

  private static createBaseModuleConfig(
    optionsProvider: any
  ): Pick<DynamicModule, 'providers' | 'exports' | 'global'> {
    return {
      providers: [
        optionsProvider,
        InitContextMiddleware,
        {
          provide: APP_INTERCEPTOR,
          useClass: RequestInterceptor,
        },
        ContextLogger,
      ],
      exports: [ContextLogger],
      global: true,
    };
  }

  static forRoot(options: ContextLoggerFactoryOptions = {}): DynamicModule {
    const optionsProvider = {
      provide: 'CONTEXT_LOGGER_OPTIONS',
      useValue: options,
    };

    return {
      module: ContextLoggerModule,
      imports: [LoggerModule.forRoot(this.createPinoConfig(options))],
      ...this.createBaseModuleConfig(optionsProvider),
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<ContextLoggerFactoryOptions> | ContextLoggerFactoryOptions;
    inject?: any[];
  }): DynamicModule {
    const optionsProvider = {
      provide: 'CONTEXT_LOGGER_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: ContextLoggerModule,
      imports: [
        LoggerModule.forRootAsync({
          imports: options.imports || [],
          useFactory: async (...args: any[]) => {
            const factoryOptions = await options.useFactory(...args);
            return this.createPinoConfig(factoryOptions);
          },
          inject: options.inject || [],
        }),
      ],
      ...this.createBaseModuleConfig(optionsProvider),
    };
  }
}
