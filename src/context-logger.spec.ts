import { ContextLogger } from './context-logger';
import { ContextStore } from './store/context-store';

describe('ContextLogger', () => {
  const spyLog = jest.fn();
  const spyDebug = jest.fn();
  const spyWarn = jest.fn();
  const spyError = jest.fn();
  const MODULE_NAME = 'TestModule';
  const contextLogger = new ContextLogger(MODULE_NAME);
  const CONTEXT = { someContextField: 'someContextValue' };

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

  describe('bootstrap and fallback logger behavior', () => {
    const MODULE_NAME = 'BootstrapTest';
    let contextLogger: ContextLogger;
    let fallbackLoggerSpy: jest.SpyInstance;

    beforeEach(() => {
      // Reset the internal logger to simulate bootstrap phase
      (ContextLogger as any).internalLogger = null;
      contextLogger = new ContextLogger(MODULE_NAME);
      fallbackLoggerSpy = jest.spyOn(contextLogger['fallbackLogger'], 'log');
    });

    afterEach(() => {
      fallbackLoggerSpy.mockRestore();
      ContextLogger.init(mockLogger as any);
    });

    it('should handle bootstrap component logs with string bindings', () => {
      const message = 'Mapped {/api/users, GET} route';
      const component = 'RouterExplorer';
        
      // @ts-expect-error - Simulate bootstrap phase
      contextLogger.log(message, component);

      expect(fallbackLoggerSpy).toHaveBeenCalledWith(
        { component }, 
        message,
        MODULE_NAME
      );
    });

    it('should handle regular bindings after bootstrap', () => {
      const message = 'Regular log';
      const bindings = { someBinding: 'value' };
        
      // Initialize logger to exit bootstrap phase
      ContextLogger.init(mockLogger as any);
        
      contextLogger.log(message, bindings);
        
      expect(mockLogger.log).toHaveBeenCalledWith(
        { ...bindings, ...CONTEXT },
        message,
        MODULE_NAME
      );
    });
  });

  describe('log entry structure', () => {
    it('should group bindings under default bindings key when enabled', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.info('test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test message',
          bindings: { key: 'value' },  // Default key from groupFields
        }),
      );
    });

    it('should spread fields at root level when grouping is disabled', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      logger['options'].groupFields = {
        enabled: false,
      };
      
      const contextData = { user: 'john' };
      jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
      logger.info('test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test message',
          key: 'value',
          user: 'john',
        }),
      );
    });

    it('should use custom key names when grouping is enabled', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const contextData = { user: 'john' };
      
      logger['options'].groupFields = {
        enabled: true,
        bindingsKey: 'params',
        contextKey: 'metadata',
      };
      
      jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
      logger.info('test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test message',
          params: { key: 'value' },
          metadata: contextData,
        }),
      );
    });

    it('should group context under configured context key', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const contextData = { user: 'john' };
      
      jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
      logger.info('test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test message',
          context: contextData,
        }),
      );
    });

    it('should adapt context when contextAdapter is provided', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const contextData = { user: 'john', role: 'admin' };
      const adaptedContext = { user: 'john' };
      
      logger['options'].contextAdapter = (ctx) => ({ user: ctx.user });
      jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
      
      logger.info('test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test message',
          context: adaptedContext,
        }),
      );
    });

    it('should use custom key names for bindings and context', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const contextData = { user: 'john' };
      
      logger['options'].groupFields = {
        enabled: true,
        bindingsKey: 'params',
        contextKey: 'metadata',
      };
      
      jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
      logger.info('test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test message',
          params: { key: 'value' },
          metadata: contextData,
        }),
      );
    });

    it('should include error under err field', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('test error');

      logger.error('error message', error);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'error message',
          err: error,
        }),
      );
    });

    it('should include all fields when available', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('test error');
      const contextData = { user: 'john' };
      
      jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
      logger.error('error message', error, { operation: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'error message',
          bindings: { operation: 'test' },
          context: contextData,
          err: error,
        }),
      );
    });

    it('should omit null or undefined values', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      jest.spyOn(ContextStore, 'getContext').mockReturnValue({});
      logger.info('test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          bindings: undefined,
          context: undefined,
        }),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'test message',
        }),
      );
    });
  });
});