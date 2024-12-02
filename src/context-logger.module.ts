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

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<ContextLoggerFactoryOptions> | ContextLoggerFactoryOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: ContextLoggerModule,
      imports: [
        LoggerModule.forRootAsync({
          imports: options.imports || [],
          useFactory: async (...args: any[]) => {
            const factoryOptions = await options.useFactory(...args);

            return {
              renameContext: 'service',
              pinoHttp: {
                autoLogging: false,
                logger: pino({
                  level: factoryOptions.logLevel || 'info',
                  formatters: {
                    level: (label) => ({ level: label }),
                  },
                }),
              },
              exclude: factoryOptions.exclude || [],
            };
          },
          inject: options.inject || [],
        }),
      ],
      providers: [
        {
          provide: 'CONTEXT_LOGGER_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
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
}
