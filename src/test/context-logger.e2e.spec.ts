import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Injectable } from '@nestjs/common';
import { ContextLogger } from '../context-logger';
import { ContextLoggerModule } from '../context-logger.module';
import * as request from 'supertest';

// Test service for chain testing
@Injectable()
class ChainTestService {
  private readonly logger = new ContextLogger(ChainTestService.name);

  async doSomething() {
    this.logger.log('service method called');
    return { success: true };
  }
}

// Test controller for chain testing
@Controller()
class ChainTestController {
  private readonly logger = new ContextLogger(ChainTestController.name);

  constructor(private service: ChainTestService) {}

  @Get('/chain-test')
  async test() {
    this.logger.log('controller hit');
    return this.service.doSomething();
  }
}

// Main test controller
@Controller()
class TestController {
  private readonly logger = new ContextLogger(TestController.name);

  @Get('/test')
  test() {
    this.logger.log('test endpoint hit');
    return { success: true };
  }

  @Get('/health')
  health() {
    this.logger.log('health check');
    return { status: 'ok' };
  }
}

describe('ContextLogger E2E', () => {
  let app: INestApplication;
  let mockUpdateContext: jest.SpyInstance;
  let mockLog: jest.SpyInstance;

  beforeEach(async () => {
    // Spy on the static methods we want to verify
    mockUpdateContext = jest.spyOn(ContextLogger, 'updateContext');
    mockLog = jest.spyOn(ContextLogger.prototype, 'log');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ContextLoggerModule.forRootAsync({
          useFactory: () => ({
            exclude: ['/health'],
            enrichContext: () => ({
              customField: 'test-value'
            })
          })
        })
      ],
      controllers: [TestController]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    mockUpdateContext.mockRestore();
    mockLog.mockRestore();
    await app.close();
  });

  describe('Logging behavior', () => {
    it('should log non-excluded routes with context', async () => {
      const response = await request(app.getHttpServer())
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockUpdateContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestMethod: 'GET',
          requestUrl: '/test',
          customField: 'test-value'
        })
      );
      expect(mockLog).toHaveBeenCalledWith('test endpoint hit');
    });

    it('should not log excluded routes', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
      expect(mockUpdateContext).not.toHaveBeenCalled();
      expect(mockLog).not.toHaveBeenCalled();
    });
  });

  describe('Context enrichment', () => {
    it('should enrich context with custom fields', async () => {
      // Create a new module with more complex enrichContext
      const moduleWithEnrichment: TestingModule = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRootAsync({
            useFactory: () => ({
              enrichContext: () => ({
                userId: 'test-user',
                role: 'admin',
                timestamp: expect.any(String)
              })
            })
          })
        ],
        controllers: [TestController]
      }).compile();

      const enrichApp = moduleWithEnrichment.createNestApplication();
      await enrichApp.init();

      await request(enrichApp.getHttpServer())
        .get('/test')
        .expect(200);

      expect(mockUpdateContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user',
          role: 'admin',
          timestamp: expect.any(String)
        })
      );

      await enrichApp.close();
    });
  });

  describe('Request chain context preservation', () => {
    it('should maintain context through the request chain', async () => {
      const chainModule = await Test.createTestingModule({
        imports: [
          ContextLoggerModule.forRootAsync({
            useFactory: () => ({
              enrichContext: () => ({ requestChain: 'test' })
            })
          })
        ],
        controllers: [ChainTestController],
        providers: [ChainTestService]
      }).compile();

      const chainApp = chainModule.createNestApplication();
      await chainApp.init();

      await request(chainApp.getHttpServer())
        .get('/chain-test')
        .expect(200);

      const logCalls = mockLog.mock.calls;
      expect(logCalls).toHaveLength(2);
      
      // Both logs should have the same context
      expect(ContextLogger.getContext()).toEqual(
        expect.objectContaining({
          requestChain: 'test',
          requestMethod: 'GET',
          requestUrl: '/chain-test'
        })
      );

      await chainApp.close();
    });
  });
});