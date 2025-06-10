import { WithContext } from './with-context.decorator';
import { ContextStore } from '../store/context-store';

describe('WithContext Decorator', () => {
  let testClass: TestClass;

  const aFunctionThatUpdatesContext = async () => {
    await new Promise((resolve) => {
      ContextStore.updateContext({ asyncProcessing: 'processing' });
      resolve(true);
    });
    ContextStore.updateContext({ regularProcessing: 'processing' });
  };

  class TestClass {
    @WithContext()
    simpleMethod() {
      return ContextStore.getContext();
    }

    @WithContext({ userId: 'user_123', service: 'TestService' })
    methodWithInitialContext() {
      return ContextStore.getContext();
    }

    @WithContext()
    async asyncMethod() {
      await new Promise((resolve) => {
        ContextStore.updateContext({ step: 'processing' });
        resolve(true);
      });
      await aFunctionThatUpdatesContext();
      return ContextStore.getContext();
    }

    @WithContext({ requestId: 'req_456' })
    methodWithParameters(param1: string, param2: number) {
      return {
        context: ContextStore.getContext(),
        params: { param1, param2 },
      };
    }

    @WithContext()
    methodThatUpdatesContext() {
      const initialContext = ContextStore.getContext();
      ContextStore.updateContext({ step: 'processing' });
      const updatedContext = ContextStore.getContext();
      return { initialContext, updatedContext };
    }

    @WithContext({ level: 'info' })
    async methodThatReturnsPromise(value: any) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        context: ContextStore.getContext(),
        value,
      };
    }
  }

  beforeEach(() => {
    testClass = new TestClass();
  });

  describe('Context Initialization', () => {
    it('should initialize context with correlationId', () => {
      const result = testClass.simpleMethod();

      expect(result).toHaveProperty('correlationId');
      expect(typeof result.correlationId).toBe('string');
      expect(result.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should initialize context with custom initial context', () => {
      const result = testClass.methodWithInitialContext();

      expect(result).toHaveProperty('correlationId');
      expect(result).toHaveProperty('userId', 'user_123');
      expect(result).toHaveProperty('service', 'TestService');
    });

    it('should work with async methods', async () => {
      const result = await testClass.asyncMethod();

      expect(result).toHaveProperty('correlationId');
      expect(typeof result.correlationId).toBe('string');

      expect(result).toHaveProperty('asyncProcessing', 'processing');
      expect(result).toHaveProperty('regularProcessing', 'processing');
      expect(result).toHaveProperty('step', 'processing');
    });
  });

  describe('Method Parameters', () => {
    it('should preserve method parameters', () => {
      const result = testClass.methodWithParameters('test', 42);

      expect(result.params).toEqual({ param1: 'test', param2: 42 });
      expect(result.context).toHaveProperty('correlationId');
      expect(result.context).toHaveProperty('requestId', 'req_456');
    });

    it('should work with promise-returning methods', async () => {
      const result = await testClass.methodThatReturnsPromise('test-value');

      expect(result.value).toBe('test-value');
      expect(result.context).toHaveProperty('correlationId');
      expect(result.context).toHaveProperty('level', 'info');
    });
  });

  describe('Context Updates', () => {
    it('should allow context updates within the method', () => {
      const result = testClass.methodThatUpdatesContext();

      expect(result.initialContext).toHaveProperty('correlationId');
      expect(result.initialContext).not.toHaveProperty('step');

      expect(result.updatedContext).toHaveProperty('correlationId');
      expect(result.updatedContext).toHaveProperty('step', 'processing');

      // Should be the same correlationId
      expect(result.initialContext.correlationId).toBe(
        result.updatedContext.correlationId
      );
    });
  });

  describe('Context Isolation', () => {
    it('should isolate context between different method calls', () => {
      const result1 = testClass.simpleMethod();
      const result2 = testClass.simpleMethod();

      expect(result1.correlationId).not.toBe(result2.correlationId);
    });

    it('should not have context outside decorated methods', () => {
      // Call decorated method to ensure context is created and cleaned up
      testClass.simpleMethod();

      // Context should be empty outside the decorated method
      const contextOutside = ContextStore.getContext();
      expect(Object.keys(contextOutside)).toHaveLength(0);
    });
  });

  describe('Initial Context Override', () => {
    it('should merge initial context with default correlationId', () => {
      const result = testClass.methodWithInitialContext();

      expect(result).toHaveProperty('correlationId');
      expect(result).toHaveProperty('userId', 'user_123');
      expect(result).toHaveProperty('service', 'TestService');
    });

    it('should allow overriding correlationId in initial context', () => {
      class TestOverrideClass {
        @WithContext({ correlationId: 'custom-id', type: 'override' })
        methodWithCorrelationIdOverride() {
          return ContextStore.getContext();
        }
      }

      const testInstance = new TestOverrideClass();
      const result = testInstance.methodWithCorrelationIdOverride();

      expect(result.correlationId).toBe('custom-id');
      expect(result.type).toBe('override');
    });
  });

  describe('Error Handling', () => {
    it('should maintain context when method throws error', () => {
      class ErrorTestClass {
        @WithContext({ errorTest: true })
        methodThatThrows() {
          const context = ContextStore.getContext();
          throw new Error(`Error with context: ${JSON.stringify(context)}`);
        }
      }

      const errorTestInstance = new ErrorTestClass();

      expect(() => {
        errorTestInstance.methodThatThrows();
      }).toThrow(/Error with context:.*errorTest.*true/);
    });
  });
});
