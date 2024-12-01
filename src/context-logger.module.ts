import {
  DynamicModule,
  Module,
  MiddlewareConsumer,
  NestModule,
} from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { GeneralRequestsInterceptor } from "./interceptors/general-requests.interceptor";
import { ContextMiddleware } from "./middlewares/context.middleware";
import { ContextLoggerFactoryOptions } from "./interfaces/context-logger.interface";
import pino from "pino";

@Module({})
export class ContextLoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes("*");
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
              renameContext: "service",
              pinoHttp: {
                autoLogging: false,
                logger: pino({
                  level: factoryOptions.logLevel || "info",
                  formatters: {
                    level: (label) => ({ level: label }),
                  },
                }),
              },
              exclude: factoryOptions.debugEndpoints || [],
            };
          },
          inject: options.inject || [],
        }),
      ],
      providers: [
        {
          provide: "CONTEXT_LOGGER_OPTIONS",
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: GeneralRequestsInterceptor,
        },
        ContextMiddleware,
      ],
      global: true,
    };
  }
}
