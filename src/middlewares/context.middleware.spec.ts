import { InitContextMiddleware } from './context.middleware';
import * as contextStore from '../store/context-store';

jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid'
}));

describe('InitContextMiddleware', () => {
  let middleware: InitContextMiddleware;
  let mockRequest;
  let mockResponse;
  let mockNext: jest.Mock;
  let runWithCtxSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new InitContextMiddleware();
    
    mockRequest = {
      id: 'request-id',
    };
    
    mockResponse = {};
    mockNext = jest.fn();

    // Spy on runWithCtx instead
    runWithCtxSpy = jest.spyOn(contextStore, 'runWithCtx');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call runWithCtx with correct context and next function', () => {
    middleware.use(mockRequest, mockResponse, mockNext);

    expect(runWithCtxSpy).toHaveBeenCalledWith(
      expect.any(Function),
      {
        correlationId: 'mocked-uuid',
        requestId: 'request-id'
      }
    );
  });

  it('should execute next function within context', () => {
    middleware.use(mockRequest, mockResponse, mockNext);
    
    // Verify that the function passed to runWithCtx calls next
    const runWithCtxCallback = runWithCtxSpy.mock.calls[0][0];
    runWithCtxCallback({});
    
    expect(mockNext).toHaveBeenCalled();
  });
});