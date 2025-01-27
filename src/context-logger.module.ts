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
import { ContextLogger } from './context-logger';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ContextLoggerAsyncOptions, ContextLoggerFactoryOptions } from './interfaces/context-logger.interface';

@Module({})
export class ContextLoggerModule implements NestModule {
  constructor(
    @Inject('CONTEXT_LOGGER_OPTIONS')
    private readonly options: ContextLoggerFactoryOptions,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    const excludePatterns = this.options.exclude || [];
    consumer
      .apply(InitContextMiddleware)
      .exclude(...excludePatterns)
      .forRoutes('*');
  }

  private static createPinoConfig(options: ContextLoggerFactoryOptions): ContextLoggerFactoryOptions {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { enrichContext, pinoHttp = {}, ...restOptions } = options;
    
    return {
      ...restOptions,
      pinoHttp: {
        autoLogging: false,
        level: 'info',
        ...pinoHttp
      }
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
        {
          provide: 'CONTEXT_LOGGER_INIT',
          useFactory: async (logger: NestJSPinoLogger, options: ContextLoggerFactoryOptions) => {
            await ContextLogger.init(logger, options);
            return true;
          },
          inject: [NestJSPinoLogger, 'CONTEXT_LOGGER_OPTIONS']
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

  static forRootAsync(options: ContextLoggerAsyncOptions): DynamicModule {
    const optionsProvider = {
      provide: 'CONTEXT_LOGGER_OPTIONS',
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);
        return config;
      },
      inject: options.inject || [],
    };

    return {
      module: ContextLoggerModule,
      imports: [
        ...(options.imports || []),
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
