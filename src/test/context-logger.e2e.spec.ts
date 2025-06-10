import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Injectable, ExecutionContext } from '@nestjs/common';
import { ContextLogger } from '../context-logger';
import { ContextLoggerModule } from '../context-logger.module';
import { WithContext } from '../decorators/with-context.decorator';
import * as request from 'supertest';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestExpressApplication } from '@nestjs/platform-express';

jest.mock('nestjs-pino', () => {
  const mockNestJSPinoLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    fatal: jest.fn(),
  };

  class MockLogger {
    log = mockNestJSPinoLogger.log;
    error = mockNestJSPinoLogger.error;
    warn = mockNestJSPinoLogger.warn;
    debug = mockNestJSPinoLogger.debug;
    verbose = mockNestJSPinoLogger.verbose;
    fatal = mockNestJSPinoLogger.fatal;
  }

  return {
    Logger: MockLogger,
    LoggerModule: {
      forRoot: jest.fn().mockReturnValue({
        module: class MockLoggerModule {},
        global: true,
        providers: [
          {
            provide: MockLogger,
            useValue: mockNestJSPinoLogger,
          }
        ],
        exports: [MockLogger]
      }),
      forRootAsync: jest.fn().mockImplementation((options) => {
        return {
          module: class MockLoggerModule {},
          imports: options.imports || [],
          global: true,
          providers: [
            {
              provide: MockLogger,
              useValue: mockNestJSPinoLogger,
            }
          ],
          exports: [MockLogger],
          inject: options.inject || []
        };
      })
    }
  };
});

// Export for test assertions
const mockNestJSPinoLogger = jest.requireMock('nestjs-pino').LoggerModule.forRoot().providers[0].useValue;

@Injectable()
class ChainTestService {
  private readonly logger = new ContextLogger(ChainTestService.name);

  async doSomething() {
    await new Promise(resolve => setTimeout(resolve, 10));
    this.logger.log('service method called');
    ContextLogger.updateContext({ serviceField: 'service-value' });
    return { success: true };
  }
}

@Controller()
class ChainTestController {
  private readonly logger = new ContextLogger(ChainTestController.name);

  constructor(
    private service: ChainTestService,
  ) {}

  @Get('/chain-test')
  async test() {
    this.logger.log('controller hit');
    ContextLogger.updateContext({ controllerField: 'controller-value' });
    const result = await this.service.doSomething();
    this.logger.log('controller complete');
    return result;
  }
}

@Controller()
class SimpleTestController {
  private readonly logger = new ContextLogger(SimpleTestController.name);

  @Get('/simple-test')
  test() {
    this.logger.log('test endpoint hit');
    return { success: true };
  }
}

@Controller()
class IsolationATestController {
  private readonly logger = new ContextLogger(IsolationATestController.name);

  @Get('/isolation-test-a')
  async test() {
    await new Promise(resolve => setTimeout(resolve, 10));
    ContextLogger.updateContext({ IsolationATestController: 'IsolationATestController' });
    this.logger.log('test endpoint a hit');
    return { success: true };
  }
}

@Controller()
class IsolationBTestController {
  private readonly logger = new ContextLogger(IsolationBTestController.name);

  @Get('/isolation-test-b')
  async test() {
    await new Promise(resolve => setTimeout(resolve, 100));
    ContextLogger.updateContext({ IsolationBTestController: 'IsolationBTestController' });
    this.logger.log('test endpoint b hit');
    return { success: true };
  }
}

@Controller()
class IsolationCTestController {
  private readonly logger = new ContextLogger(IsolationCTestController.name);

  @Get('/isolation-test-c')
  async test() {
    await new Promise(resolve => setTimeout(resolve, 500));
    ContextLogger.updateContext({ IsolationCTestController: 'IsolationCTestController' });
    this.logger.log('test endpoint c hit');
    return { success: true };
  }
}

@Controller()
class InfoMethodTestController {
  private readonly logger = new ContextLogger(InfoMethodTestController.name);

  @Get('/info-method-test')
  test() {
    this.logger.info('info method test endpoint hit', { testBinding: 'test-value' });
    return { success: true };
  }
}

@Injectable()
class WithContextTestService {
  private readonly logger = new ContextLogger(WithContextTestService.name);

  @WithContext({ serviceContext: 'with-context-service', operation: 'process-data' })
  async processData(data: any) {
    this.logger.log('Processing data in service with @WithContext', { data });
    await new Promise(resolve => setTimeout(resolve, 10));
    this.logger.log('Data processing completed');
    return { processed: true, data };
  }

  // Method without @WithContext for comparison
  async processDataWithoutDecorator(data: any) {
    this.logger.log('Processing data without @WithContext', { data });
    await new Promise(resolve => setTimeout(resolve, 10));
    this.logger.log('Data processing without decorator completed');
    return { processed: true, data };
  }
}

@Controller()
class WithContextTestController {
  private readonly logger = new ContextLogger(WithContextTestController.name);

  constructor(private readonly withContextService: WithContextTestService) {}

  @Get('/with-context-test')
  async test() {
    this.logger.log('Controller hit - context initialized by middleware');
    ContextLogger.updateContext({ controllerContext: 'middleware-initialized' });
    
    const result = await this.withContextService.processData({ value: 'test-data' });
    
    this.logger.log('Controller completed');
    return result;
  }

  @Get('/without-context-test')
  async testWithoutDecorator() {
    this.logger.log('Controller hit - for comparison without decorator');
    ContextLogger.updateContext({ controllerContext: 'middleware-initialized' });
    
    const result = await this.withContextService.processDataWithoutDecorator({ value: 'test-data' });
    
    this.logger.log('Controller completed');
    return result;
  }
}

describe('ContextLogger E2E', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ContextLoggerModule.forRootAsync({
          useFactory: () => ({
            logLevel: 'debug',
            enrichContext: (executionContext: ExecutionContext) => {
              if (!executionContext) return { environment: 'test' };
              const request = executionContext.switchToHttp().getRequest();
              return {
                environment: 'test',
                traceId: request.headers['x-trace-id']
              };
            }
          })
        })
      ],
      controllers: [SimpleTestController, ChainTestController, IsolationATestController, IsolationBTestController, IsolationCTestController, InfoMethodTestController, WithContextTestController],
      providers: [ChainTestService, WithContextTestService]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should properly log request with enriched context', async () => {
    const response = await request(app.getHttpServer())
      .get('/simple-test')
      .set('X-Trace-ID', 'trace-123')
      .expect(200);

    expect(response.body).toEqual({ success: true });
    
    expect(mockNestJSPinoLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'test',
        requestMethod: 'GET',
        requestUrl: '/simple-test',
        traceId: 'trace-123'
      }),
      'test endpoint hit',
      SimpleTestController.name
    );
  });

  it('should preserve and extend context through the request chain', async () => {
    await request(app.getHttpServer())
      .get('/chain-test')
      .set('X-Trace-ID', 'trace-123')
      .expect(200);

    const logCalls = mockNestJSPinoLogger.log.mock.calls;
    const expectedCorrelationId = logCalls[0][0].correlationId;
    expect(logCalls).toHaveLength(3);
    expect(logCalls[0]).toMatchObject([
      {
        correlationId: expectedCorrelationId,
        requestMethod: 'GET',
        requestUrl: '/chain-test',
        environment: 'test',
        traceId: 'trace-123',
      },
      'controller hit',
      ChainTestController.name,
    ]);

    expect(logCalls[1]).toMatchObject([
      {
        correlationId: expectedCorrelationId,
        requestMethod: 'GET',
        requestUrl: '/chain-test',
        environment: 'test',
        traceId: 'trace-123',
        controllerField: 'controller-value',
      },
      'service method called',
      ChainTestService.name,
    ]);

    expect(logCalls[2]).toMatchObject([
      {
        correlationId: expectedCorrelationId,
        requestMethod: 'GET',
        requestUrl: '/chain-test',
        environment: 'test',
        traceId: 'trace-123',
        controllerField: 'controller-value',
        serviceField: 'service-value',
      },
      'controller complete',
      ChainTestController.name,
    ]);
  });

  it('should maintain isolated contexts for concurrent requests', async () => {
    await Promise.all([
      request(app.getHttpServer())
        .get('/isolation-test-a')
        .set('X-Trace-ID', 'trace-a')
        .expect(200),
      request(app.getHttpServer())
        .get('/isolation-test-b')
        .set('X-Trace-ID', 'trace-b')
        .expect(200),
      request(app.getHttpServer())
        .get('/isolation-test-c')
        .set('X-Trace-ID', 'trace-c')
        .expect(200)
    ]);

    // Assert
    const logCalls = mockNestJSPinoLogger.log.mock.calls;
    // Ensure 1 log per request
    expect(logCalls).toHaveLength(3);
    // Ensure all correlationIds are different
    const correlationIds = logCalls.map(call => call[0].correlationId);
    expect(new Set(correlationIds).size).toBe(correlationIds.length);
    // Ensure all logs are isolated
    expect(logCalls[0]).toMatchObject([
      {
        correlationId: expect.any(String),
        requestMethod: 'GET',
        requestUrl: '/isolation-test-a',
        environment: 'test',
        traceId: 'trace-a',
        IsolationATestController: 'IsolationATestController',
      },
      'test endpoint a hit',
      IsolationATestController.name,
    ]);

    expect(logCalls[1]).toMatchObject([
      {
        correlationId: expect.any(String),
        requestMethod: 'GET',
        requestUrl: '/isolation-test-b',
        environment: 'test',
        traceId: 'trace-b',
        IsolationBTestController: 'IsolationBTestController',
      },
      'test endpoint b hit',
      IsolationBTestController.name,
    ]);

    expect(logCalls[2]).toMatchObject([
      {
        correlationId: expect.any(String),
        requestMethod: 'GET',
        requestUrl: '/isolation-test-c',
        environment: 'test',
        traceId: 'trace-c',
        IsolationCTestController: 'IsolationCTestController',
      },
      'test endpoint c hit',
      IsolationCTestController.name,
    ]);
  });

  it('should use log method when info method is called', async () => {
    const response = await request(app.getHttpServer())
      .get('/info-method-test')
      .set('X-Trace-ID', 'trace-info-123')
      .expect(200);

    expect(response.body).toEqual({ success: true });
    
    // Verify that log was called (not info) since info is now deprecated and calls log internally
    expect(mockNestJSPinoLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'test',
        requestMethod: 'GET',
        requestUrl: '/info-method-test',
        traceId: 'trace-info-123',
        testBinding: 'test-value'
      }),
      'info method test endpoint hit',
      InfoMethodTestController.name
    );
    
    // We don't need to check if info was called since our mock doesn't have an info method
    // The important part is that log was called with the correct parameters
  });

  it('should create isolated context when using @WithContext decorator', async () => {
    const response = await request(app.getHttpServer())
      .get('/with-context-test')
      .set('X-Trace-ID', 'trace-with-context-123')
      .expect(200);

    expect(response.body).toEqual({ processed: true, data: { value: 'test-data' } });
    
    const logCalls = mockNestJSPinoLogger.log.mock.calls;
    
    // Verify we have the expected number of log calls
    expect(logCalls).toHaveLength(4);
    
    // First call: Controller hit - should have middleware context
    expect(logCalls[0]).toMatchObject([
      {
        correlationId: expect.any(String),
        requestMethod: 'GET',
        requestUrl: '/with-context-test',
        environment: 'test',
        traceId: 'trace-with-context-123',
      },
      'Controller hit - context initialized by middleware',
      WithContextTestController.name,
    ]);

    // Second call: Service method with @WithContext - should have NEW correlationId and decorator context
    expect(logCalls[1]).toMatchObject([
      {
        correlationId: expect.any(String), // This should be different from the first one
        serviceContext: 'with-context-service',
        operation: 'process-data',
        data: { value: 'test-data' },
      },
      'Processing data in service with @WithContext',
      WithContextTestService.name,
    ]);

    // Third call: Service method completion - should maintain the decorator's context
    expect(logCalls[2]).toMatchObject([
      {
        correlationId: logCalls[1][0].correlationId, // Same as the second call
        serviceContext: 'with-context-service',
        operation: 'process-data',
      },
      'Data processing completed',
      WithContextTestService.name,
    ]);

    // Fourth call: Controller completion - should return to original middleware context
    expect(logCalls[3]).toMatchObject([
      {
        correlationId: logCalls[0][0].correlationId, // Same as the first call
        requestMethod: 'GET',
        requestUrl: '/with-context-test',
        environment: 'test',
        traceId: 'trace-with-context-123',
        controllerContext: 'middleware-initialized',
      },
      'Controller completed',
      WithContextTestController.name,
    ]);

    // Verify that the @WithContext decorator created a different correlationId
    expect(logCalls[1][0].correlationId).not.toBe(logCalls[0][0].correlationId);
    expect(logCalls[2][0].correlationId).toBe(logCalls[1][0].correlationId);
    expect(logCalls[3][0].correlationId).toBe(logCalls[0][0].correlationId);
  });

  it('should maintain middleware context when NOT using @WithContext decorator', async () => {
    const response = await request(app.getHttpServer())
      .get('/without-context-test')
      .set('X-Trace-ID', 'trace-without-context-123')
      .expect(200);

    expect(response.body).toEqual({ processed: true, data: { value: 'test-data' } });
    
    const logCalls = mockNestJSPinoLogger.log.mock.calls;
    
    // Verify we have the expected number of log calls
    expect(logCalls).toHaveLength(4);
    
    // All calls should maintain the same correlationId from middleware
    const expectedCorrelationId = logCalls[0][0].correlationId;
    
    expect(logCalls[0]).toMatchObject([
      {
        correlationId: expectedCorrelationId,
        requestMethod: 'GET',
        requestUrl: '/without-context-test',
        environment: 'test',
        traceId: 'trace-without-context-123',
      },
      'Controller hit - for comparison without decorator',
      WithContextTestController.name,
    ]);

    expect(logCalls[1]).toMatchObject([
      {
        correlationId: expectedCorrelationId, // Same correlationId
        requestMethod: 'GET',
        requestUrl: '/without-context-test',
        environment: 'test',
        traceId: 'trace-without-context-123',
        controllerContext: 'middleware-initialized',
        data: { value: 'test-data' },
      },
      'Processing data without @WithContext',
      WithContextTestService.name,
    ]);

    expect(logCalls[2]).toMatchObject([
      {
        correlationId: expectedCorrelationId, // Same correlationId
        requestMethod: 'GET',
        requestUrl: '/without-context-test',
        environment: 'test',
        traceId: 'trace-without-context-123',
        controllerContext: 'middleware-initialized',
      },
      'Data processing without decorator completed',
      WithContextTestService.name,
    ]);

    expect(logCalls[3]).toMatchObject([
      {
        correlationId: expectedCorrelationId, // Same correlationId
        requestMethod: 'GET',
        requestUrl: '/without-context-test',
        environment: 'test',
        traceId: 'trace-without-context-123',
        controllerContext: 'middleware-initialized',
      },
      'Controller completed',
      WithContextTestController.name,
    ]);

    // Verify all calls have the same correlationId (no isolation)
    logCalls.forEach(call => {
      expect(call[0].correlationId).toBe(expectedCorrelationId);
    });
  });

  describe('ContextLogger Platform Compatibility', () => {
    let moduleFixture: TestingModule;
  
    beforeEach(async () => {
      jest.clearAllMocks();
  
      moduleFixture = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRootAsync({
            useFactory: () => ({
              logLevel: 'debug',
              enrichContext: (executionContext: ExecutionContext) => {
                if (!executionContext) return { environment: 'test' };
                const request = executionContext.switchToHttp().getRequest();
                return {
                  environment: 'test',
                  traceId: request.headers['x-trace-id']
                };
              }
            })
          })
        ],
        controllers: [SimpleTestController, WithContextTestController],
        providers: [WithContextTestService]
      }).compile();
    });
  
    describe('Express Adapter', () => {
      let app: INestApplication;
  
      beforeEach(async () => {
        app = moduleFixture.createNestApplication<NestExpressApplication>();
        await app.init();
        await app.listen(0);
      });
  
      afterEach(async () => {
        if (app) {
          await app.close();
        }
      });
  
      it('should work with Express adapter', async () => {
        const response = await request(app.getHttpServer())
          .get('/simple-test')
          .set('X-Trace-ID', 'express-trace-123')
          .expect(200);
  
        expect(response.body).toEqual({ success: true });
        
        expect(mockNestJSPinoLogger.log.mock.calls[0]).toMatchObject([
          {
            correlationId: expect.any(String),
            requestMethod: 'GET',
            requestUrl: '/simple-test',
            environment: 'test',
            traceId: 'express-trace-123',
          },
          'test endpoint hit',
          SimpleTestController.name
        ]);
      });
    });
  
    describe('Fastify Adapter', () => {
      let app: INestApplication;
  
      beforeEach(async () => {
        const fastifyAdapter = new FastifyAdapter();
        app = moduleFixture.createNestApplication(fastifyAdapter);
        await app.init();
        await app.getHttpAdapter().getInstance().ready(); // Important for Fastify
      });
  
      afterEach(async () => {
        if (app) {
          await app.close();
        }
      });
  
      it('should work with Fastify adapter', async () => {
        const response = await request(app.getHttpServer())
          .get('/simple-test')
          .set('X-Trace-ID', 'fastify-trace-123')
          .expect(200);
  
        expect(response.body).toEqual({ success: true });
        
        expect(mockNestJSPinoLogger.log.mock.calls[0]).toMatchObject([
          {
            correlationId: expect.any(String),
            requestMethod: 'GET',
            requestUrl: '/simple-test',
            environment: 'test',
            traceId: 'fastify-trace-123',
          },
          'test endpoint hit',
          SimpleTestController.name
        ]);
      });
    });
  });
});
