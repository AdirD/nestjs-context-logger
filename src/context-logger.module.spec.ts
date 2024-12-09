const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

jest.mock('nestjs-pino', () => {
  class MockLogger {
    log = mockLogger.log;
    error = mockLogger.error;
    warn = mockLogger.warn;
    debug = mockLogger.debug;
    verbose = mockLogger.verbose;
    fatal = mockLogger.fatal;
  }

  return {
    LoggerModule: {
      forRoot: jest.fn().mockReturnValue({
        module: class MockLoggerModule {},
        global: true,
        providers: [
          {
            provide: MockLogger,
            useValue: mockLogger,
          },
        ],
        exports: [MockLogger],
      }),
      forRootAsync: jest.fn().mockReturnValue({
        module: class MockLoggerModule {},
        global: true,
        providers: [
          {
            provide: MockLogger,
            useValue: mockLogger,
          },
        ],
        exports: [MockLogger],
      }),
    },
    Logger: MockLogger
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { ContextLoggerModule } from './context-logger.module';
import { InitContextMiddleware } from './middlewares/context.middleware';
import { LoggerModule, Logger as NestJSPinoLogger } from 'nestjs-pino';
import { Injectable, Provider } from '@nestjs/common';
import { ContextLogger } from './context-logger';
import { Module } from '@nestjs/common';

@Injectable()
export class MockService {
  getExcludePaths() {
    return ['/health', '/metrics'];
  }
  
  getLogLevel() {
    return 'debug';
  }
}

@Module({
  providers: [MockService],
  exports: [MockService]
})
export class MockModule {}

@Injectable()
export class CircularService {
  constructor(private readonly mockService: MockService) {}
  
  getLogLevel() {
    return this.mockService.getLogLevel();
  }
}

@Module({
  imports: [MockModule],
  providers: [CircularService],
  exports: [CircularService]
})
export class CircularModule {}


describe('ContextLoggerModule', () => {
  let consumer: any;

  beforeEach(() => {
    consumer = {
      apply: jest.fn().mockReturnThis(),
      exclude: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('forRoot configuration', () => {
    it('should configure with basic options', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRoot({
            exclude: ['/health'],
            pinoHttp: {
              level: 'debug'
            }
          })
        ],
      }).compile();

      const contextLoggerModule = module.get(ContextLoggerModule);
      contextLoggerModule.configure(consumer);

      expect(consumer.apply).toHaveBeenCalledWith(InitContextMiddleware);
      expect(consumer.exclude).toHaveBeenCalledWith('/health');
      expect(LoggerModule.forRoot).toHaveBeenCalledWith(
        expect.objectContaining({
          pinoHttp: expect.objectContaining({
            level: 'debug'
          })
        })
      );
    });

    it('forRoot - should use default values when no options provided', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [ContextLoggerModule.forRoot()]
      }).compile();

      const contextLoggerModule = module.get(ContextLoggerModule);
      contextLoggerModule.configure(consumer);

      expect(consumer.exclude).toHaveBeenCalledWith();
      expect(LoggerModule.forRoot).toHaveBeenCalledWith(
        expect.objectContaining({
          pinoHttp: expect.objectContaining({
            level: 'info',
            autoLogging: false,
          })
        })
      );
    });

    it('forRootAsync - should use default values when no options provided', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRootAsync({
            useFactory: async () => ({})
          })
        ]
      }).compile();
    
      const contextLoggerModule = module.get(ContextLoggerModule);
      contextLoggerModule.configure(consumer);
    
      expect(consumer.exclude).toHaveBeenCalledWith();
      expect(LoggerModule.forRootAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          useFactory: expect.any(Function),
          imports: [],
          inject: [],
        })
      );
    
      // Get and execute the factory to verify its output
      const factory = (LoggerModule.forRootAsync as jest.Mock).mock.calls[0][0].useFactory;
      const config = await factory();
      expect(config).toEqual({
        pinoHttp: {
          level: 'info',
          autoLogging: false,
        }
      });
    });

    describe('createPinoConfig', () => {
      // Access the private function
      type PrivateContextLogger = {
        createPinoConfig: typeof ContextLoggerModule['createPinoConfig']
      };
      const { createPinoConfig } = ContextLoggerModule as unknown as PrivateContextLogger;
    
      it('should return default config when empty options provided', () => {
        const result = createPinoConfig({});
        
        expect(result).toEqual({
          pinoHttp: {
            autoLogging: false,
            level: 'info'
          }
        });
      });
  
      it('should merge pinoHttp options with defaults', () => {
        const options = {
          pinoHttp: {
            level: 'debug',
            customKey: 'value'
          }
        };
  
        const result = createPinoConfig(options);
  
        expect(result).toEqual({
          pinoHttp: {
            autoLogging: false,  // default preserved
            level: 'debug',      // overridden
            customKey: 'value'   // new value added
          }
        });
      });
  
      it('should allow overriding default pinoHttp values', () => {
        const options = {
          pinoHttp: {
            autoLogging: true,
            level: 'error'
          }
        };
  
        const result = createPinoConfig(options);
  
        expect(result).toEqual({
          pinoHttp: {
            autoLogging: true,
            level: 'error'
          }
        });
      });
    });

    it('should override default values when options are provided', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRoot({
            pinoHttp: {
              level: 'debug',
              autoLogging: true,
            },
            useExisting: true,
            renameContext: 'other'
          })
        ]
      }).compile();
    
      const contextLoggerModule = module.get(ContextLoggerModule);
      contextLoggerModule.configure(consumer);
    
      expect(LoggerModule.forRoot).toHaveBeenCalledWith(
        expect.objectContaining({
          pinoHttp: expect.objectContaining({
            level: 'debug',
            autoLogging: true,
          }),
          useExisting: true,
          renameContext: 'other'
        })
      );
    });
  });

  describe('forRootAsync configuration', () => {
    describe('forRootAsync configuration', () => {
      it('should configure module with async factory function', async () => {
        const moduleRef = await Test.createTestingModule({
          imports: [
            ContextLoggerModule.forRootAsync({
              useFactory: () => ({ 
                logLevel: 'debug',
                exclude: ['/health', '/metrics']
              })
            })
          ],
          providers: [
            {
              provide: NestJSPinoLogger,
              useValue: mockLogger
            }
          ]
        }).compile();
      
        const contextLoggerModule = moduleRef.get(ContextLoggerModule);
        contextLoggerModule.configure(consumer);
      
        expect(consumer.exclude).toHaveBeenCalledWith('/health', '/metrics');
        expect(LoggerModule.forRootAsync).toHaveBeenCalled();
      });
    
      it('should handle async factory errors gracefully', async () => {
        const errorFactory = async () => {
          throw new Error('Config error');
        };
    
        await expect(Test.createTestingModule({
          imports: [
            ContextLoggerModule.forRootAsync({
              useFactory: errorFactory
            })
          ],
        })
          .overrideProvider(NestJSPinoLogger)
          .useClass(NestJSPinoLogger)
          .compile()
        ).rejects.toThrow('Config error');
      });
    });

    it('should handle async factory errors gracefully', async () => {
      const errorFactory = async () => {
        throw new Error('Config error');
      };

      await expect(Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRootAsync({
            useFactory: errorFactory
          })
        ],
      })
        .overrideProvider(NestJSPinoLogger)
        .useClass(NestJSPinoLogger)
        .compile()
      ).rejects.toThrow('Config error');
    });
  });

  describe('module behavior', () => {
    it('should make the module global', async () => {
      const syncModule = ContextLoggerModule.forRoot();
      const asyncModule = ContextLoggerModule.forRootAsync({
        useFactory: () => ({})
      });

      expect(syncModule.global).toBe(true);
      expect(asyncModule.global).toBe(true);
    });

    it('should export ContextLogger', async () => {
      const syncModule = ContextLoggerModule.forRoot();
      const asyncModule = ContextLoggerModule.forRootAsync({
        useFactory: () => ({})
      });

      expect(syncModule.exports).toContain(ContextLogger);
      expect(asyncModule.exports).toContain(ContextLogger);
    });

    it('should provide correct providers', async () => {
      const syncModule = ContextLoggerModule.forRoot();
      const asyncModule = ContextLoggerModule.forRootAsync({
        useFactory: () => ({})
      });

      const requiredProviders = ['CONTEXT_LOGGER_OPTIONS', InitContextMiddleware, ContextLogger];
      
      requiredProviders.forEach(provider => {
        expect(syncModule.providers.some((p: Provider) => 
          typeof p === 'function' 
            ? p === provider 
            : p?.provide === provider
        )).toBe(true);
        expect(asyncModule.providers.some((p: Provider) => 
          typeof p === 'function' 
            ? p === provider 
            : p?.provide === provider
        )).toBe(true);
      });

      expect(syncModule.providers.some((p: Provider) => 
        typeof p === 'object' && p?.provide === 'APP_INTERCEPTOR'
      )).toBe(true);
      expect(asyncModule.providers.some((p: Provider) => 
        typeof p === 'object' && p?.provide === 'APP_INTERCEPTOR'
      )).toBe(true);
    });
  });

  describe('Dependency Injection', () => {
    it('should accept service injections in forRootAsync', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRootAsync({
            imports: [MockModule],
            inject: [MockService],
            useFactory: (service: MockService) => ({
              logLevel: 'debug',
              exclude: service.getExcludePaths()
            })
          })
        ]
      }).compile();

      const contextLogger = moduleRef.get(ContextLogger);
      expect(contextLogger).toBeDefined();
      expect(LoggerModule.forRootAsync).toHaveBeenCalled();
    });

    it('should handle circular dependencies', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRootAsync({
            imports: [CircularModule],
            inject: [CircularService],
            useFactory: (service) => ({
              pinoHttp: {
                level: service.getLogLevel()
              }
            })
          })
        ]
      }).compile();

      expect(moduleRef.get(ContextLogger)).toBeDefined();
      expect(LoggerModule.forRootAsync).toHaveBeenCalled();
    });
  });
});