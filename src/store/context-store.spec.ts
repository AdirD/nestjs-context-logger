import { ContextStore, runWithCtx } from './context-store';

describe('ContextStore', () => {
  beforeEach(() => {
    // Clear any context that might exist
    runWithCtx(() => {}, {});
  });

  describe('getContext', () => {
    it('should return empty object when no context exists', () => {
      const context = ContextStore.getContext();
      expect(context).toEqual({});
    });

    it('should return context when it exists', () => {
      const testContext = { test: 'value' };
      
      runWithCtx(() => {
        const context = ContextStore.getContext();
        expect(context).toEqual(testContext);
      }, testContext);
    });

    it('should return copy of context to prevent direct mutations', () => {
      const testContext = { test: 'value' };
      
      runWithCtx(() => {
        const context = ContextStore.getContext();
        context.test = 'modified';
        const newContext = ContextStore.getContext();
        expect(newContext).toEqual(testContext);
      }, testContext);
    });
  });

  describe('updateContext', () => {
    it('should merge new context with existing context', () => {
      const initialContext = { initial: 'value' };
      const updateContext = { updated: 'value' };
      
      runWithCtx(() => {
        ContextStore.updateContext(updateContext);
        const context = ContextStore.getContext();
        expect(context).toEqual({ ...initialContext, ...updateContext });
      }, initialContext);
    });

    it('should not modify context when no store exists', () => {
      ContextStore.updateContext({ test: 'value' });
      const context = ContextStore.getContext();
      expect(context).toEqual({});
    });
  });

  describe('runWithContext', () => {
    beforeEach(() => {
    // Reset any context that might exist
      runWithCtx(() => {}, {});
    });

    describe('runWithCtx', () => {
      it('should run function with provided context', async () => {
        const testContext = { testKey: 'testValue' };
        let contextInFunction;

        await runWithCtx((ctx) => {
          contextInFunction = ctx;
        }, testContext);

        expect(contextInFunction).toEqual(testContext);
      });

      it('should maintain separate contexts for nested calls', async () => {
        const outerContext = { level: 'outer' };
        const innerContext = { level: 'inner' };
        const contexts: any[] = [];

        await runWithCtx(async () => {
          contexts.push(ContextStore.getContext());
        
          await runWithCtx(() => {
            contexts.push(ContextStore.getContext());
          }, innerContext);

          contexts.push(ContextStore.getContext());
        }, outerContext);

        expect(contexts[0]).toEqual(outerContext);
        expect(contexts[1]).toEqual(innerContext);
        expect(contexts[2]).toEqual(outerContext);
      });

      it('should handle async operations', async () => {
        const testContext = { test: 'value' };
        let contextInTimeout;

        await runWithCtx(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          contextInTimeout = ContextStore.getContext();
        }, testContext);

        expect(contextInTimeout).toEqual(testContext);
      });

      it('should handle errors without losing context', async () => {
        const testContext = { test: 'value' };
        let contextAfterError;

        try {
          await runWithCtx(async () => {
            throw new Error('test error');
          }, testContext);
        } catch {
          contextAfterError = await runWithCtx(() => {
            return ContextStore.getContext();
          }, testContext);
        }

        expect(contextAfterError).toEqual(testContext);
      });
    });

    describe('ContextStore', () => {
      it('should return empty object when no context exists', () => {
        const context = ContextStore.getContext();
        expect(context).toEqual({});
      });

      it('should return context when it exists', async () => {
        const testContext = { test: 'value' };
        let retrievedContext;

        await runWithCtx(() => {
          retrievedContext = ContextStore.getContext();
        }, testContext);

        expect(retrievedContext).toEqual(testContext);
      });

      it('should maintain separate contexts for parallel operations', async () => {
        const results: any[] = [];

        await Promise.all([
          runWithCtx(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            ContextStore.updateContext({ method: 1 });
            results.push(ContextStore.getContext());
          }, { id: 1 }),
          runWithCtx(async () => {
            await new Promise(resolve => setTimeout(resolve, 5));
            ContextStore.updateContext({ method: 2 });
            results.push(ContextStore.getContext());
          }, { id: 2 })
        ]);

        expect(results).toContainEqual({ id: 1, method: 1 });
        expect(results).toContainEqual({ id: 2, method: 2 });
      });
    });
  });
});