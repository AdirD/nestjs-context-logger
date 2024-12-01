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

    jest.spyOn(ContextLogger, 'updateContext');

    const options: ContextLoggerFactoryOptions = {
      debugEndpoints: ['/debug'],
      requestContext: jest.fn().mockResolvedValue({ custom: 'value' }),
    };

    interceptor = new GeneralRequestsInterceptor(options);
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

  it('should execute custom requestContext if provided', async () => {
    const observable = await interceptor.intercept(mockContext, mockCallHandler);
    await lastValueFrom(observable);

    expect(ContextLogger.updateContext).toHaveBeenCalledWith(
      expect.objectContaining({
        custom: 'value'
      })
    );
  });

  it('should handle debug endpoints differently', async () => {
    mockRequest.url = '/debug';
    const debugSpy = jest.spyOn(interceptor['logger'], 'debug');
    const logSpy = jest.spyOn(interceptor['logger'], 'log');

    const observable = await interceptor.intercept(mockContext, mockCallHandler);
    await lastValueFrom(observable);

    expect(debugSpy).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('should add duration to context after request completes', async () => {
    const observable = await interceptor.intercept(mockContext, mockCallHandler);
    await lastValueFrom(observable);

    expect(ContextLogger.updateContext).toHaveBeenCalledWith(
      expect.objectContaining({
        endTime: expect.any(Date),
        durationSec: expect.any(Number)
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