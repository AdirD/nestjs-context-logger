import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Injectable, ExecutionContext } from '@nestjs/common';
import { ContextLogger } from '../context-logger';
import { ContextLoggerModule } from '../context-logger.module';
import { Logger as NestJSPinoLogger } from 'nestjs-pino';
import * as request from 'supertest';

@Injectable()
class ChainTestService {
  constructor(private readonly logger: ContextLogger) {}

  async doSomething() {
    // Add a small delay to ensure requests overlap
    await new Promise(resolve => setTimeout(resolve, 10));
    this.logger.log('service method called');
    return { success: true };
  }
}

@Controller()
class ChainTestController {
  constructor(
    private service: ChainTestService,
    private readonly logger: ContextLogger
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
class TestController {
  constructor(private readonly logger: ContextLogger) {}

  @Get('/test')
  test() {
    this.logger.log('test endpoint hit');
    return { success: true };
  }
}

describe('ContextLogger E2E', () => {
  let app: INestApplication;
  let mockNestJSPinoLogger: jest.Mocked<NestJSPinoLogger>;

  beforeEach(async () => {
    mockNestJSPinoLogger = {
      log: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      fatal: jest.fn(),
      verbose: jest.fn(),
    } as any;

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
      controllers: [TestController, ChainTestController],
      providers: [ChainTestService]
    })
      .overrideProvider(NestJSPinoLogger)
      .useValue(mockNestJSPinoLogger)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await app.close();
  });

  it('should properly log request with enriched context', async () => {
    const response = await request(app.getHttpServer())
      .get('/test')
      .set('X-Trace-ID', 'trace-123')
      .expect(200);

    expect(response.body).toEqual({ success: true });
    
    expect(mockNestJSPinoLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'test',
        requestMethod: 'GET',
        requestUrl: '/test',
        traceId: 'trace-123'
      }),
      'test endpoint hit',
      TestController.name
    );
  });

  it('should preserve and extend context through the request chain', async () => {
    await request(app.getHttpServer())
      .get('/chain-test')
      .set('X-Trace-ID', 'trace-123')
      .expect(200);

    const logCalls = mockNestJSPinoLogger.log.mock.calls;
    expect(logCalls).toHaveLength(3);
    
    // First log from controller (before updateContext)
    expect(logCalls[0][0]).toMatchObject({
      environment: 'test',
      traceId: 'trace-123',
      requestMethod: 'GET',
      requestUrl: '/chain-test'
    });
    
    // Second log from service (after controller's updateContext)
    expect(logCalls[1][0]).toMatchObject({
      environment: 'test',
      traceId: 'trace-123',
      requestMethod: 'GET',
      requestUrl: '/chain-test',
      controllerField: 'controller-value'
    });
    
    // Third log from controller complete
    expect(logCalls[2][0]).toMatchObject({
      environment: 'test',
      traceId: 'trace-123',
      requestMethod: 'GET',
      requestUrl: '/chain-test',
      controllerField: 'controller-value'
    });
  });

  it('should maintain isolated contexts for concurrent requests', async () => {
    await Promise.all([
      request(app.getHttpServer())
        .get('/chain-test')
        .set('X-Trace-ID', 'trace-1')
        .expect(200),
      request(app.getHttpServer())
        .get('/chain-test')
        .set('X-Trace-ID', 'trace-2')
        .expect(200)
    ]);

    const logCalls = mockNestJSPinoLogger.log.mock.calls;
    expect(logCalls).toHaveLength(6); // 3 logs per request

    const trace1Logs = logCalls.filter(call => call[0].traceId === 'trace-1');
    const trace2Logs = logCalls.filter(call => call[0].traceId === 'trace-2');

    expect(trace1Logs).toHaveLength(3);
    expect(trace2Logs).toHaveLength(3);

    trace1Logs.forEach(([context]) => {
      expect(context).toMatchObject({
        environment: 'test',
        traceId: 'trace-1',
        requestMethod: 'GET',
        requestUrl: '/chain-test'
      });
      // Skip first log which won't have controllerField
      if (context.controllerField) {
        expect(context.controllerField).toBe('controller-value');
      }
    });

    trace2Logs.forEach(([context]) => {
      expect(context).toMatchObject({
        environment: 'test',
        traceId: 'trace-2',
        requestMethod: 'GET',
        requestUrl: '/chain-test'
      });
      // Skip first log which won't have controllerField
      if (context.controllerField) {
        expect(context.controllerField).toBe('controller-value');
      }
    });

    // Verify logs are in the expected sequence for each trace
    expect(trace1Logs[0][1]).toBe('controller hit');
    expect(trace1Logs[1][1]).toBe('service method called');
    expect(trace1Logs[2][1]).toBe('controller complete');

    expect(trace2Logs[0][1]).toBe('controller hit');
    expect(trace2Logs[1][1]).toBe('service method called');
    expect(trace2Logs[2][1]).toBe('controller complete');
  });
});