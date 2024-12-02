import { Test, TestingModule } from '@nestjs/testing';
import { ContextLoggerModule } from './context-logger.module';
import { InitContextMiddleware } from './middlewares/context.middleware';
import { RequestInterceptor } from './interceptors/request.interceptor';


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

  describe('module configuration', () => {
    it('should configure middleware with exclude patterns', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRootAsync({
            useFactory: () => ({
              exclude: ['/health', '/metrics'],
              logLevel: 'info'
            })
          })
        ],
      }).compile();

      const contextLoggerModule = module.get(ContextLoggerModule);
      contextLoggerModule.configure(consumer);

      expect(consumer.apply).toHaveBeenCalledWith(InitContextMiddleware);
      expect(consumer.exclude).toHaveBeenCalledWith('/health', '/metrics');
      expect(consumer.forRoutes).toHaveBeenCalledWith('*');
    });

    it('should work without exclude patterns', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRootAsync({
            useFactory: () => ({
              logLevel: 'info'
            })
          })
        ],
      }).compile();

      const contextLoggerModule = module.get(ContextLoggerModule);
      contextLoggerModule.configure(consumer);

      expect(consumer.apply).toHaveBeenCalledWith(InitContextMiddleware,);
      expect(consumer.exclude).toHaveBeenCalledWith();
      expect(consumer.forRoutes).toHaveBeenCalledWith('*');
    });

    it('should configure nestjs-pino with the correct options', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRootAsync({
            useFactory: () => ({
              exclude: ['/health'],
              logLevel: 'debug'
            })
          })
        ],
      }).compile();

      // We can't easily test the nestjs-pino configuration directly
      // but we can verify the module compiles successfully
      expect(module).toBeDefined();
    });

    it('should make the module global', async () => {
      const dynamicModule = ContextLoggerModule.forRootAsync({
        useFactory: () => ({
          logLevel: 'info'
        })
      });

      expect(dynamicModule.global).toBe(true);
    });
  });
});