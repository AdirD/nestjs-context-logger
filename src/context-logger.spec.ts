import { ContextLogger } from './context-logger';
import { ContextStore } from './store/context-store';

describe('ContextLogger', () => {
  const spyLog = jest.fn();
  const spyDebug = jest.fn();
  const spyWarn = jest.fn();
  const spyError = jest.fn();
  const MODULE_NAME = 'TestModule';
  const contextLogger = new ContextLogger(MODULE_NAME);
  const CONTEXT = { requestId: '123', someContextField: 'someContextValue' };

  jest.spyOn(ContextStore, 'getContext').mockReturnValue(CONTEXT);
  const mockLogger = {
    log: spyLog,
    debug: spyDebug,
    warn: spyWarn,
    error: spyError,
  };

  ContextLogger.init(mockLogger as any);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log, debug, warn methods', () => {
    it.each(['log', 'debug', 'warn'])('should call internal logger with "%s" level', (method) => {
      const message = 'Test message';
      const bindings = { someBinding: 'value' };

      contextLogger[method](message, bindings);

      expect(mockLogger[method]).toHaveBeenCalledWith(
        { ...bindings, ...CONTEXT },
        message,
        MODULE_NAME
      );
    });

    it('should call internal logger with empty bindings if not provided', () => {
      const message = 'Test message';

      contextLogger.log(message);

      expect(mockLogger.log).toHaveBeenCalledWith(CONTEXT, message, MODULE_NAME);
    });
  });

  describe('error method', () => {
    it('should call internal logger with error message only', () => {
      const message = 'Error message';

      contextLogger.error(message);

      expect(mockLogger.error).toHaveBeenCalledWith(CONTEXT, message, MODULE_NAME);
    });

    it('should call internal logger with error message and Error object', () => {
      const message = 'Error message';
      const error = new Error('Test error');

      contextLogger.error(message, error);

      expect(mockLogger.error).toHaveBeenCalledWith({ err: error, ...CONTEXT }, message, MODULE_NAME);
    });

    it('should call internal logger with error message and bindings', () => {
      const message = 'Error message';
      const bindings = { someBinding: 'value' };

      contextLogger.error(message, bindings);

      expect(mockLogger.error).toHaveBeenCalledWith({ ...bindings, ...CONTEXT }, message, MODULE_NAME);
    });

    it('should call internal logger with error message, Error object, and bindings', () => {
      const message = 'Error message';
      const error = new Error('Test error');
      const bindings = { someBinding: 'value' };

      contextLogger.error(message, error, bindings);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { err: error, ...bindings, ...CONTEXT },
        message,
        MODULE_NAME
      );
    });
  });

  describe('static methods', () => {
    it('should initialize the internal logger only once', () => {
      const newLogger = { log: jest.fn() };
      ContextLogger.init(newLogger as any);

      contextLogger.log('Test message');

      expect(mockLogger.log).toHaveBeenCalled();
      expect(newLogger.log).not.toHaveBeenCalled();
    });

    it('should have different module names but still reach the same internal logger', () => {
      const MODULE_NAME_1 = 'TestModule1';
      const MODULE_NAME_2 = 'TestModule2';

      const contextLogger1 = new ContextLogger(MODULE_NAME_1);
      const contextLogger2 = new ContextLogger(MODULE_NAME_2);

      contextLogger1.log('test message 1');
      contextLogger2.log('test message 2');

      expect(spyLog).toHaveBeenCalledWith(CONTEXT, 'test message 1', MODULE_NAME_1);
      expect(spyLog).toHaveBeenCalledWith(CONTEXT, 'test message 2', MODULE_NAME_2);
    });

    it('should get current context', () => {
      const context = ContextLogger.getContext();

      expect(context).toEqual(CONTEXT);
      expect(ContextStore.getContext).toHaveBeenCalled();
    });

    it('should update the context', () => {
      const newContext = { key: 'value' };
      const spyUpdateContext = jest.spyOn(ContextStore, 'updateContext');
  
      ContextLogger.updateContext(newContext);
  
      expect(spyUpdateContext).toHaveBeenCalledWith(newContext);
    });
  });
});