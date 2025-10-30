import { WithContext } from './with-context.decorator';
import { ContextStore } from '../store/context-store';
import { v4 as uuid } from 'uuid';

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

    @WithContext({ correlationId: uuid() })
    methodWithCorrelationId() {
      return ContextStore.getContext();
    }

    @WithContext(() => ({ correlationId: uuid(), service: 'DynamicService' }))
    methodWithFunctionContext() {
      return ContextStore.getContext();
    }

    @WithContext(() => ({ timestamp: Date.now(), operation: 'dynamic-op' }))
    methodWithDynamicTimestamp() {
      return ContextStore.getContext();
    }

    @WithContext((job: { id: string; name: string; queue?: { name: string } }) => ({
      jobId: job?.id,
      jobName: job?.name,
      queueName: job?.queue?.name,
    }))
    methodWithArgumentContext(_job: { id: string; name: string; queue?: { name: string } }) {
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
    it('should initialize empty context when no parameters provided', () => {
      const result = testClass.simpleMethod();

      expect(result).toEqual({});
    });

    it('should initialize context with custom properties', () => {
      const result = testClass.methodWithInitialContext();

      expect(result).toHaveProperty('userId', 'user_123');
      expect(result).toHaveProperty('service', 'TestService');
      expect(result).not.toHaveProperty('correlationId');
    });

    it('should initialize context with correlationId when explicitly provided', () => {
      const result = testClass.methodWithCorrelationId();

      expect(result).toHaveProperty('correlationId');
      expect(typeof result.correlationId).toBe('string');
      expect(result.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should work with async methods', async () => {
      const result = await testClass.asyncMethod();

      expect(result).toHaveProperty('asyncProcessing', 'processing');
      expect(result).toHaveProperty('regularProcessing', 'processing');
      expect(result).toHaveProperty('step', 'processing');
      expect(result).not.toHaveProperty('correlationId');
    });

    it('should generate dynamic context when function is provided', () => {
      const result = testClass.methodWithFunctionContext();

      expect(result).toHaveProperty('correlationId');
      expect(result).toHaveProperty('service', 'DynamicService');
      expect(typeof result.correlationId).toBe('string');
      expect(result.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate fresh context on each function call', () => {
      const result1 = testClass.methodWithFunctionContext();
      const result2 = testClass.methodWithFunctionContext();

      expect(result1.correlationId).not.toBe(result2.correlationId);
      expect(result1.service).toBe('DynamicService');
      expect(result2.service).toBe('DynamicService');
    });

    it('should generate dynamic values like timestamps', async () => {
      const result1 = testClass.methodWithDynamicTimestamp();
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const result2 = testClass.methodWithDynamicTimestamp();

      expect(result1).toHaveProperty('timestamp');
      expect(result2).toHaveProperty('timestamp');
      expect(result1).toHaveProperty('operation', 'dynamic-op');
      expect(result2).toHaveProperty('operation', 'dynamic-op');
      expect(result1.timestamp).not.toBe(result2.timestamp);
      expect(result2.timestamp).toBeGreaterThan(result1.timestamp);
    });
  });

  describe('Method Parameters', () => {
    it('should preserve method parameters', () => {
      const result = testClass.methodWithParameters('test', 42);

      expect(result.params).toEqual({ param1: 'test', param2: 42 });
      expect(result.context).toHaveProperty('requestId', 'req_456');
      expect(result.context).not.toHaveProperty('correlationId');
    });

    it('should work with promise-returning methods', async () => {
      const result = await testClass.methodThatReturnsPromise('test-value');

      expect(result.value).toBe('test-value');
      expect(result.context).toHaveProperty('level', 'info');
      expect(result.context).not.toHaveProperty('correlationId');
    });
  });

  describe('Function Context with Method Arguments', () => {
    it('should pass method arguments to context function', () => {
      const job = {
        id: 'job-123',
        name: 'process-data',
        queue: { name: 'data-queue' },
      };
      const result = testClass.methodWithArgumentContext(job);

      expect(result).toHaveProperty('jobId', 'job-123');
      expect(result).toHaveProperty('jobName', 'process-data');
      expect(result).toHaveProperty('queueName', 'data-queue');
    });
  });

  describe('Context Updates', () => {
    it('should allow context updates within the method', () => {
      const result = testClass.methodThatUpdatesContext();

      expect(result.initialContext).toEqual({});
      expect(result.initialContext).not.toHaveProperty('step');

      expect(result.updatedContext).toHaveProperty('step', 'processing');
    });
  });

  describe('Context Isolation', () => {
    it('should isolate context between different method calls', () => {
      // Add some context to first call
      class TestIsolationClass {
        @WithContext({ callId: 'call1' })
        method1() {
          return ContextStore.getContext();
        }

        @WithContext({ callId: 'call2' })
        method2() {
          return ContextStore.getContext();
        }
      }

      const testInstance = new TestIsolationClass();
      const result1 = testInstance.method1();
      const result2 = testInstance.method2();

      expect(result1.callId).toBe('call1');
      expect(result2.callId).toBe('call2');
      expect(result1.callId).not.toBe(result2.callId);
    });

    it('should not have context outside decorated methods', () => {
      // Call decorated method to ensure context is created and cleaned up
      testClass.simpleMethod();

      // Context should be empty outside the decorated method
      const contextOutside = ContextStore.getContext();
      expect(Object.keys(contextOutside)).toHaveLength(0);
    });
  });

  describe('Custom Context Properties', () => {
    it('should merge custom properties with empty context', () => {
      const result = testClass.methodWithInitialContext();

      expect(result).toHaveProperty('userId', 'user_123');
      expect(result).toHaveProperty('service', 'TestService');
    });

    it('should allow custom correlationId when explicitly provided', () => {
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

      // Outer context should have its properties
      expect(result.outerContext).toHaveProperty('outerMethod', true);
      expect(result.outerContext).toHaveProperty('level', 'outer');
      expect(result.outerContext).not.toHaveProperty('innerMethod');
      expect(result.outerContext).not.toHaveProperty('correlationId');

      // Inner context should merge with outer context, inheriting properties
      expect(result.innerResult.innerContext).toHaveProperty('innerMethod', true);
      expect(result.innerResult.innerContext).toHaveProperty('level', 'inner'); // inner overrides outer
      expect(result.innerResult.innerContext).toHaveProperty('outerMethod', true); // inherited from outer
      expect(result.innerResult.innerContext).not.toHaveProperty('correlationId');

      // Outer context should be restored after inner method completes
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
      expect(result.startContext).not.toHaveProperty('correlationId');

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
    });

    it('should demonstrate context isolation between separate executions', () => {
      // Call method multiple times to ensure no context bleeding between separate executions
      const result1 = nestedTestClass.outerMethod();
      const result2 = nestedTestClass.outerMethod();

      // Both executions should have same structure but be independent
      expect(result1.outerContext.outerMethod).toBe(result2.outerContext.outerMethod);
      expect(result1.innerResult.innerContext.innerMethod).toBe(
        result2.innerResult.innerContext.innerMethod
      );

      // Contexts should be equal since they have the same properties
      expect(result1.outerContext).toEqual(result2.outerContext);
      expect(result1.innerResult.innerContext).toEqual(result2.innerResult.innerContext);
    });
  });

});
