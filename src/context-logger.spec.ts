import { ContextLogger } from './context-logger';
import { ContextStore } from './store/context-store';

describe('ContextLogger', () => {
  const spyLog = jest.fn();
  const spyInfo = jest.fn();
  const spyDebug = jest.fn();
  const spyWarn = jest.fn();
  const spyError = jest.fn();
  const MODULE_NAME = 'TestModule';
  const CONTEXT = { someContextField: 'someContextValue' };

  let contextLogger: ContextLogger;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(ContextStore, 'getContext').mockReturnValue(CONTEXT);

    mockLogger = {
      log: spyLog,
      debug: spyDebug,
      info: spyInfo,
      warn: spyWarn,
      error: spyError,
    };

    // Reset the internal logger for each test to ensure clean state
    (ContextLogger as any).internalLogger = null;
    ContextLogger.init(mockLogger);

    contextLogger = new ContextLogger(MODULE_NAME);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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

    it('should call log method when info is called', () => {
      const message = 'Test message';
      const bindings = { someBinding: 'value' };

      contextLogger.info(message, bindings);

      // Since info method calls log internally
      expect(mockLogger.log).toHaveBeenCalledWith(
        { ...bindings, ...CONTEXT },
        message,
        MODULE_NAME
      );
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
      // Restore the internal logger
      ContextLogger.init(mockLogger);
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
    describe('with no grouping (default)', () => {
      it('should spread bindings at root level', () => {
        const logger = new ContextLogger(MODULE_NAME);
        logger.info('test message', { key: 'value' });

        expect(spyLog).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'value',
          }),
          'test message',
          MODULE_NAME
        );
      });

      it('should spread context at root level', () => {
        const logger = new ContextLogger(MODULE_NAME);
        const contextData = { user: 'john' };

        jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
        logger.info('test message');

        expect(spyLog).toHaveBeenCalledWith(
          expect.objectContaining({
            user: 'john',
          }),
          'test message',
          MODULE_NAME
        );
      });
    });

    describe('with partial grouping', () => {
      beforeEach(() => {
        // Reset the internal logger for each test to ensure clean state
        (ContextLogger as any).internalLogger = null;
      });

      it('should group only bindings when bindingsKey provided', () => {
        const logger = new ContextLogger(MODULE_NAME);
        ContextLogger.init(mockLogger, { groupFields: { bindingsKey: 'params' } });
        const contextData = { user: 'john' };

        jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
        logger.info('test message', { key: 'value' });

        expect(spyLog).toHaveBeenCalledWith(
          expect.objectContaining({
            params: { key: 'value' },
            user: 'john',
          }),
          'test message',
          MODULE_NAME
        );
      });

      it('should not group bindings when bindingsKey provided but bindings object is empty', () => {
        const logger = new ContextLogger(MODULE_NAME);
        ContextLogger.init(mockLogger, { groupFields: { bindingsKey: 'params' } });
        const contextData = { user: 'john' };

        jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
        logger.info('test message');

        expect(spyLog).toHaveBeenCalledWith(
          { user: 'john', },
          'test message',
          MODULE_NAME
        );
      });

      it('should group only context when contextKey provided', () => {
        const logger = new ContextLogger(MODULE_NAME);
        ContextLogger.init(mockLogger, { groupFields: { contextKey: 'metadata' } });
        const contextData = { user: 'john' };

        jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
        logger.info('test message', { key: 'value' });

        expect(spyLog).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: { user: 'john' },
            key: 'value',
          }),
          'test message',
          MODULE_NAME
        );
      });

      it('should not group context when contextKey provided but context object is empty', () => {
        const logger = new ContextLogger(MODULE_NAME);
        ContextLogger.init(mockLogger, { groupFields: { contextKey: 'metadata' } });
        const contextData = {};

        jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
        logger.info('test message', { key: 'value' });

        expect(spyLog).toHaveBeenCalledWith(
          { key: 'value' },
          'test message',
          MODULE_NAME
        );
      });
    });

    describe('with full grouping', () => {
      beforeEach(() => {
        // Reset the internal logger for each test to ensure clean state
        (ContextLogger as any).internalLogger = null;
      });

      it('should group both bindings and context under specified keys', () => {
        const logger = new ContextLogger(MODULE_NAME);
        ContextLogger.init(mockLogger, {
          groupFields: {
            bindingsKey: 'params',
            contextKey: 'metadata'
          }
        });

        const contextData = { user: 'john' };
        jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
        logger.info('test message', { key: 'value' });

        expect(spyLog).toHaveBeenCalledWith(
          expect.objectContaining({
            params: { key: 'value' },
            metadata: { user: 'john' },
          }),
          'test message',
          MODULE_NAME
        );
      });

      it('should not add specified keys when both bindings and context are empty', () => {
        const logger = new ContextLogger(MODULE_NAME);
        ContextLogger.init(mockLogger, {
          groupFields: {
            bindingsKey: 'params',
            contextKey: 'metadata'
          }
        });

        const contextData = {};
        jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);
        logger.info('test message');

        expect(spyLog).toHaveBeenCalledWith(
          {},
          'test message',
          MODULE_NAME
        );
      });
    });
  });

  describe('context adaptation', () => {
    beforeEach(() => {
      // Reset the internal logger for each test to ensure clean state
      (ContextLogger as any).internalLogger = null;
    });

    it('should adapt context when adapter is provided', () => {
      const logger = new ContextLogger(MODULE_NAME);
      ContextLogger.init(mockLogger, {
        contextAdapter: (ctx) => ({ user: ctx.user })
      });
      const contextData = { user: 'john', role: 'admin' };

      jest.spyOn(ContextStore, 'getContext').mockReturnValue(contextData);

      logger.info('test message');

      expect(spyLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'john',  // Spread at root level since groupFields is disabled by default
        }),
        'test message',
        MODULE_NAME
      );
    });
  });

  describe('null/undefined handling', () => {
    it('should omit null or undefined values', () => {
      const logger = new ContextLogger(MODULE_NAME);
      jest.spyOn(ContextStore, 'getContext').mockReturnValue({});
      logger.info('test message');

      expect(spyLog).toHaveBeenCalledWith(
        expect.not.objectContaining({
          bindings: undefined,
          context: undefined,
        }),
        'test message',
        MODULE_NAME
      );
    });
  });

  describe('bootstrap logs handling', () => {
    beforeEach(() => {
      // Reset the internal logger for each test to ensure clean state
      (ContextLogger as any).internalLogger = null;
    });

    it('should ignore bootstrap logs when ignoreBootstrapLogs is true', () => {
      const logger = new ContextLogger(MODULE_NAME);
      ContextLogger.init(mockLogger, { ignoreBootstrapLogs: true });

      // @ts-expect-error - Simulate bootstrap phase
      logger.log('Mapped {/api/users, GET} route', 'RouterExplorer');

      expect(spyLog).not.toHaveBeenCalled();
    });

    it('should handle bootstrap logs when ignoreBootstrapLogs is false', () => {
      const logger = new ContextLogger(MODULE_NAME);
      ContextLogger.init(mockLogger, { ignoreBootstrapLogs: false });

      // @ts-expect-error - Simulate bootstrap phase
      logger.log('Mapped {/api/users, GET} route', 'RouterExplorer');

      expect(spyLog).toHaveBeenCalledWith(
        { component: 'RouterExplorer' },
        'Mapped {/api/users, GET} route',
        MODULE_NAME
      );
    });

    it('should handle bootstrap logs by default (ignoreBootstrapLogs not set)', () => {
      const logger = new ContextLogger(MODULE_NAME);
      ContextLogger.init(mockLogger, {});

      // @ts-expect-error - Simulate bootstrap phase
      logger.log('Mapped {/api/users, GET} route', 'RouterExplorer');

      expect(spyLog).toHaveBeenCalledWith(
        { component: 'RouterExplorer' },
        'Mapped {/api/users, GET} route',
        MODULE_NAME
      );
    });
  });

  describe('hook functions', () => {
    it('should call hook function when provided', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const logMessage = 'Test message';
      const bindings = { someBinding: 'value' };
      const hookSpy = jest.fn();

      ContextLogger.init(mockLogger, {
        hooks: {
          log: [hookSpy],
        },
      });

      logger.log(logMessage, bindings);

      expect(hookSpy).toHaveBeenCalledWith(logMessage, { ...bindings, ...CONTEXT });
    });

    it('should call multiple hook function when provided', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const logMessage = 'Test message';
      const bindings = { someBinding: 'value' };
      const hookSpy1 = jest.fn();
      const hookSpy2 = jest.fn();
      const hookSpy3 = jest.fn();

      ContextLogger.init(mockLogger, {
        hooks: {
          log: [hookSpy1, hookSpy2, hookSpy3],
        },
      });

      logger.log(logMessage, bindings);

      expect(hookSpy1).toHaveBeenCalledWith(logMessage, { ...bindings, ...CONTEXT });
      expect(hookSpy2).toHaveBeenCalledWith(logMessage, { ...bindings, ...CONTEXT });
      expect(hookSpy3).toHaveBeenCalledWith(logMessage, { ...bindings, ...CONTEXT });
    });

    it('should call \'all\' hook function when provided', () => {
      const logger = new ContextLogger(MODULE_NAME);
      const logMessage = 'Test message';
      const bindings = { someBinding: 'value' };
      const hookSpy = jest.fn();
      const allHookSpy = jest.fn();

      ContextLogger.init(mockLogger, {
        hooks: {
          log: [hookSpy],
          all: [allHookSpy],
        },
      });

      logger.log(logMessage, bindings);
      logger.debug(logMessage, bindings);

      expect(hookSpy).toHaveBeenCalledTimes(1);
      expect(allHookSpy).toHaveBeenCalledTimes(2);
    });
  });
});
