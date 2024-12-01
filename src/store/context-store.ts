import { AsyncLocalStorage } from 'async_hooks';

const globalStore = new AsyncLocalStorage<Record<string, any>>();

export const ContextStore = {
  getContext(): Record<string, any> {
    const context = globalStore.getStore();
    if (!context) {
      return {};
    }
    return { ...context };
  },

  updateContext(obj: Record<string, any>): void {
    const context = globalStore.getStore();
    if (context) {
      Object.assign(context, obj);
    }
  },
};

export const runWithCtx = (fx: (ctx: Record<string, any>) => any, context: Record<string, any> = {}) => {
  return globalStore.run(context, () => {
    return fx(context);
  });
};