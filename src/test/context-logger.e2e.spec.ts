import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Injectable, ExecutionContext, DynamicModule } from '@nestjs/common';
import { ContextLogger } from '../context-logger';
import { ContextLoggerModule } from '../context-logger.module';
import { Logger as NestJSPinoLogger } from 'nestjs-pino';
import * as request from 'supertest';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';

// We need to declare the mock implementation before using jest.mock()
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

// Mock needs to be before any imports that might use it
jest.mock('nestjs-pino', () => ({
  LoggerModule: {
    forRootAsync: jest.fn().mockImplementation((): DynamicModule => ({
      module: class MockLoggerModule {},
      providers: [
        {
          provide: NestJSPinoLogger,
          useValue: mockLogger,
        },
      ],
      exports: [NestJSPinoLogger],
      global: true,
    })),
  },
  Logger: jest.fn().mockImplementation(() => mockLogger),
}));

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
      controllers: [SimpleTestController, ChainTestController, IsolationATestController, IsolationBTestController, IsolationCTestController ],
      providers: [ChainTestService]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should properly log request with enriched context', async () => {
    const response = await request(app.getHttpServer())
      .get('/simple-test')
      .set('X-Trace-ID', 'trace-123')
      .expect(200);

    expect(response.body).toEqual({ success: true });
    
    expect(mockLogger.log).toHaveBeenCalledWith(
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

    const logCalls = mockLogger.log.mock.calls;
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
    const logCalls = mockLogger.log.mock.calls;
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
        controllers: [SimpleTestController],
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
        
        expect(mockLogger.log.mock.calls[0]).toMatchObject([
          {
            correlationId: expect.any(String),
            requestMethod: "GET",
            requestUrl: "/simple-test",
            environment: "test",
            traceId: "express-trace-123",
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
        
        expect(mockLogger.log.mock.calls[0]).toMatchObject([
          {
            correlationId: expect.any(String),
            requestMethod: "GET",
            requestUrl: "/simple-test",
            environment: "test",
            traceId: "fastify-trace-123",
          },
          'test endpoint hit',
          SimpleTestController.name
        ]);
      });
    });
  });
});

