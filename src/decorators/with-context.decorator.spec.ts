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

  describe('Nested Context Behavior (Context Property Merging)', () => {
    class NestedTestClass {
      @WithContext({ outerMethod: true, level: 'outer' })
      outerMethod() {
        const outerContext = ContextStore.getContext();
        const innerResult = this.innerMethod();
        const outerContextAfterInner = ContextStore.getContext();
        
        return {
          outerContext,
          innerResult,
          outerContextAfterInner
        };
      }

      @WithContext({ innerMethod: true, level: 'inner' })
      innerMethod() {
        const innerContext = ContextStore.getContext();
        return { innerContext };
      }

      @WithContext({ correlationId: 'custom-outer-id', service: 'OuterService' })
      outerMethodWithCustomId() {
        const outerContext = ContextStore.getContext();
        const innerResult = this.innerMethodWithCustomId();
        const outerContextAfterInner = ContextStore.getContext();
        
        return {
          outerContext,
          innerResult,
          outerContextAfterInner
        };
      }

      @WithContext({ correlationId: 'custom-inner-id', service: 'InnerService' })
      innerMethodWithCustomId() {
        const innerContext = ContextStore.getContext();
        return { innerContext };
      }

      @WithContext({ operation: 'chain-start' })
      chainedMethod() {
        const startContext = ContextStore.getContext();
        
        // Update context in outer method
        ContextStore.updateContext({ step: 'before-nested-call' });
        const updatedContext = ContextStore.getContext();
        
        // Call nested method
        const nestedResult = this.nestedChainedMethod();
        
        // Check context after nested call
        const finalContext = ContextStore.getContext();
        
        return {
          startContext,
          updatedContext,
          nestedResult,
          finalContext
        };
      }

      @WithContext({ operation: 'chain-nested' })
      nestedChainedMethod() {
        const nestedStartContext = ContextStore.getContext();
        
        // Update context in nested method
        ContextStore.updateContext({ nestedStep: 'processing' });
        const nestedUpdatedContext = ContextStore.getContext();
        
        return {
          nestedStartContext,
          nestedUpdatedContext
        };
      }
    }

    let nestedTestClass: NestedTestClass;

    beforeEach(() => {
      nestedTestClass = new NestedTestClass();
    });

    it('should merge contexts for nested WithContext decorators', () => {
      const result = nestedTestClass.outerMethod();

      // Outer context should have its own correlationId and properties
      expect(result.outerContext).toHaveProperty('correlationId');
      expect(result.outerContext).toHaveProperty('outerMethod', true);
      expect(result.outerContext).toHaveProperty('level', 'outer');
      expect(result.outerContext).not.toHaveProperty('innerMethod');

      // Inner context should merge with outer context, inheriting properties
      expect(result.innerResult.innerContext).toHaveProperty('correlationId');
      expect(result.innerResult.innerContext).toHaveProperty('innerMethod', true);
      expect(result.innerResult.innerContext).toHaveProperty('level', 'inner'); // inner overrides outer
      expect(result.innerResult.innerContext).toHaveProperty('outerMethod', true); // inherited from outer

      // CorrelationIds should be different (each decorator generates its own)
      expect(result.outerContext.correlationId).not.toBe(
        result.innerResult.innerContext.correlationId
      );

      // Outer context should be restored after inner method completes
      expect(result.outerContextAfterInner.correlationId).toBe(
        result.outerContext.correlationId
      );
      expect(result.outerContextAfterInner).toEqual(result.outerContext);
    });

    it('should handle custom correlationIds in nested contexts with merging', () => {
      const result = nestedTestClass.outerMethodWithCustomId();

      // Outer context should use custom correlationId
      expect(result.outerContext.correlationId).toBe('custom-outer-id');
      expect(result.outerContext.service).toBe('OuterService');

      // Inner context should get its own correlationId but override service
      expect(result.innerResult.innerContext.correlationId).toBe('custom-inner-id');
      expect(result.innerResult.innerContext.service).toBe('InnerService');

      // Outer context should be restored with its custom correlationId
      expect(result.outerContextAfterInner.correlationId).toBe('custom-outer-id');
      expect(result.outerContextAfterInner.service).toBe('OuterService');
    });

    it('should merge context updates between nested methods', () => {
      const result = nestedTestClass.chainedMethod();

      // Outer method initial context
      expect(result.startContext).toHaveProperty('operation', 'chain-start');
      expect(result.startContext).not.toHaveProperty('step');

      // Outer method updated context
      expect(result.updatedContext).toHaveProperty('operation', 'chain-start');
      expect(result.updatedContext).toHaveProperty('step', 'before-nested-call');

      // Nested method should inherit outer context and merge with its own
      expect(result.nestedResult.nestedStartContext).toHaveProperty('operation', 'chain-nested');
      expect(result.nestedResult.nestedStartContext).toHaveProperty('step', 'before-nested-call'); // inherited from outer
      expect(result.nestedResult.nestedStartContext).not.toHaveProperty('nestedStep');

      // Nested method can update its merged context
      expect(result.nestedResult.nestedUpdatedContext).toHaveProperty('operation', 'chain-nested');
      expect(result.nestedResult.nestedUpdatedContext).toHaveProperty('nestedStep', 'processing');
      expect(result.nestedResult.nestedUpdatedContext).toHaveProperty('step', 'before-nested-call'); // still inherited

      // Outer context should be restored unchanged after nested call
      expect(result.finalContext).toHaveProperty('operation', 'chain-start');
      expect(result.finalContext).toHaveProperty('step', 'before-nested-call');
      expect(result.finalContext).not.toHaveProperty('nestedStep');

      // CorrelationIds should be different (each decorator generates its own)
      expect(result.finalContext.correlationId).not.toBe(
        result.nestedResult.nestedStartContext.correlationId
      );
    });

    it('should demonstrate context merging with no interference between separate executions', () => {
      // Call method multiple times to ensure no context bleeding between separate executions
      const result1 = nestedTestClass.outerMethod();
      const result2 = nestedTestClass.outerMethod();

      // Each execution should have unique correlationIds
      expect(result1.outerContext.correlationId).not.toBe(result2.outerContext.correlationId);
      expect(result1.innerResult.innerContext.correlationId).not.toBe(
        result2.innerResult.innerContext.correlationId
      );

      // But within each execution, nested contexts should have different correlationIds
      expect(result1.outerContext.correlationId).not.toBe(result1.innerResult.innerContext.correlationId);
      expect(result2.outerContext.correlationId).not.toBe(result2.innerResult.innerContext.correlationId);

      // And contexts should have same structure
      expect(result1.outerContext.outerMethod).toBe(result2.outerContext.outerMethod);
      expect(result1.innerResult.innerContext.innerMethod).toBe(
        result2.innerResult.innerContext.innerMethod
      );
    });
  });
});
