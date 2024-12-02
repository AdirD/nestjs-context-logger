import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { RequestInterceptor } from './request.interceptor';
import { ContextLogger } from '../context-logger';
import { ContextLoggerFactoryOptions } from '../interfaces/context-logger.interface';

jest.mock('../context-logger');

describe('RequestInterceptor', () => {
  let interceptor: RequestInterceptor;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockRequest: any;
  let mockLogger: jest.Mocked<ContextLogger>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    mockRequest = {
      method: 'GET',
      url: '/test',
    };

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      getHandler: jest.fn().mockReturnValue({ name: 'testMethod' }),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({})),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
    } as any;

    // Mock the static updateContext method
    (ContextLogger.updateContext as jest.Mock) = jest.fn();

    const options: ContextLoggerFactoryOptions = {
      exclude: ['/health'],
      enrichContext: jest.fn().mockResolvedValue({ custom: 'value' }),
    };

    interceptor = new RequestInterceptor(options);
    (interceptor as any).logger = mockLogger;
  });

  describe('request handling', () => {
    it('should add base context to non-excluded requests', async () => {
      const observable = await interceptor.intercept(mockContext, mockCallHandler);
      await lastValueFrom(observable);

      expect(ContextLogger.updateContext).toHaveBeenCalledWith(
        expect.objectContaining({
          requestMethod: 'GET',
          requestUrl: '/test',
        })
      );
    });

    it('should skip context and logging for excluded routes', async () => {
      mockRequest.url = '/health';
      
      const observable = await interceptor.intercept(mockContext, mockCallHandler);
      await lastValueFrom(observable);

      expect(ContextLogger.updateContext).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should match exclude patterns at the start of URL', async () => {
      mockRequest.url = '/health/check';
      
      const observable = await interceptor.intercept(mockContext, mockCallHandler);
      await lastValueFrom(observable);

      expect(ContextLogger.updateContext).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should not match exclude patterns in middle of URL', async () => {
      mockRequest.url = '/api/health';
      
      const observable = await interceptor.intercept(mockContext, mockCallHandler);
      await lastValueFrom(observable);

      expect(ContextLogger.updateContext).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });

  describe('context enrichment', () => {
    it('should execute custom enrichContext if provided', async () => {
      const observable = await interceptor.intercept(mockContext, mockCallHandler);
      await lastValueFrom(observable);

      expect(ContextLogger.updateContext).toHaveBeenCalledWith(
        expect.objectContaining({
          custom: 'value'
        })
      );
    });

    it('should work without enrichContext option', async () => {
      interceptor = new RequestInterceptor({});
      (interceptor as any).logger = mockLogger;
      
      const observable = await interceptor.intercept(mockContext, mockCallHandler);
      await lastValueFrom(observable);

      expect(ContextLogger.updateContext).toHaveBeenCalledWith({
        requestMethod: 'GET',
        requestUrl: '/test'
      });
    });

    it('should log request completion with duration for non-excluded routes', async () => {
      const observable = await interceptor.intercept(mockContext, mockCallHandler);
      await lastValueFrom(observable);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          duration: expect.any(Number)
        })
      );
    });
  });

  describe('response handling', () => {
    it('should preserve the response from the handler for all routes', async () => {
      const response = { data: 'test' };
      mockCallHandler.handle.mockReturnValue(of(response));

      // Test both excluded and non-excluded routes
      for (const url of ['/test', '/health']) {
        mockRequest.url = url;
        const observable = await interceptor.intercept(mockContext, mockCallHandler);
        const result = await lastValueFrom(observable);

        expect(result).toEqual(response);
      }
    });
  });
});