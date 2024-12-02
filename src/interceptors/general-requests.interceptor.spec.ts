import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { GeneralRequestsInterceptor } from './general-requests.interceptor';
import { ContextLogger } from '../context-logger';
import { ContextLoggerFactoryOptions } from '../interfaces/context-logger.interface';

describe('GeneralRequestsInterceptor', () => {
  let interceptor: GeneralRequestsInterceptor;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockRequest: any;
  let mockLogger: jest.Mocked<ContextLogger>;

  beforeEach(() => {
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

    jest.spyOn(ContextLogger, 'updateContext');

    const options: ContextLoggerFactoryOptions = {
      exclude: ['/debug'],
      enrichContext: jest.fn().mockResolvedValue({ custom: 'value' }),
    };

    interceptor = new GeneralRequestsInterceptor(options);
    (interceptor as any).logger = mockLogger;
  });

  it('should add base context to all requests', async () => {
    const observable = await interceptor.intercept(mockContext, mockCallHandler);
    await lastValueFrom(observable);

    expect(ContextLogger.updateContext).toHaveBeenCalledWith(
      expect.objectContaining({
        requestMethod: 'GET',
        requestUrl: '/test',
      })
    );
  });

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
    interceptor = new GeneralRequestsInterceptor({});
    (interceptor as any).logger = mockLogger;
    
    const observable = await interceptor.intercept(mockContext, mockCallHandler);
    await lastValueFrom(observable);

    expect(ContextLogger.updateContext).toHaveBeenCalledWith({
      requestMethod: 'GET',
      requestUrl: '/test'
    });
  });

  it('should handle debug endpoints differently', async () => {
    mockRequest.url = '/debug';
    
    const observable = await interceptor.intercept(mockContext, mockCallHandler);
    await lastValueFrom(observable);

    expect(mockLogger.debug).toHaveBeenCalled();
    expect(mockLogger.log).not.toHaveBeenCalled();
  });

  it('should log request completion with duration', async () => {
    const observable = await interceptor.intercept(mockContext, mockCallHandler);
    await lastValueFrom(observable);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({
        duration: expect.any(Number)
      })
    );
  });

  it('should preserve the response from the handler', async () => {
    const response = { data: 'test' };
    mockCallHandler.handle.mockReturnValue(of(response));

    const observable = await interceptor.intercept(mockContext, mockCallHandler);
    const result = await lastValueFrom(observable);

    expect(result).toEqual(response);
  });
});