const mockConfigService = {
  get: jest.fn()
};

jest.mock('@nestjs/config', () => ({
  ConfigModule: {
    forRoot: jest.fn().mockReturnValue({
      module: class MockConfigModule {},
      global: true
    }),
  },
  ConfigService: jest.fn()
}));


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
import { Provider } from '@nestjs/common';
import { ContextLogger } from './context-logger';


describe('ContextLoggerModule', () => {
  let consumer: any;

  beforeEach(() => {
    consumer = {
      apply: jest.fn().mockReturnThis(),
      exclude: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    };
    mockConfigService.get.mockReset();
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
            logLevel: 'debug'
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
            logger: expect.objectContaining({
              level: 'debug'
            })
          })
        })
      );
    });

    it('should use default values when no options provided', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [ContextLoggerModule.forRoot()]
      }).compile();

      const contextLoggerModule = module.get(ContextLoggerModule);
      contextLoggerModule.configure(consumer);

      expect(consumer.exclude).toHaveBeenCalledWith();
      expect(LoggerModule.forRoot).toHaveBeenCalledWith(
        expect.objectContaining({
          pinoHttp: expect.objectContaining({
            logger: expect.objectContaining({
              level: 'info'
            })
          })
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
    it('should work with direct module import', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [ContextLoggerModule]
      }).compile();
  
      const contextLoggerModule = module.get(ContextLoggerModule);
      contextLoggerModule.configure(consumer);
  
      expect(consumer.apply).toHaveBeenCalledWith(InitContextMiddleware);
      expect(consumer.exclude).toHaveBeenCalledWith();
      expect(contextLoggerModule).toBeDefined();
    });
  
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
});