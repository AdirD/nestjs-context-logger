import { runWithCtx } from '../store/context-store';
import { ContextStore } from '../store/context-store';

/**
 * Decorator that initializes context for NestJS handlers.
 * Works with @MessagePattern, @EventPattern, @Cron, and other method decorators.
 *
 * @example
 * ```typescript
 * @WithContext()
 * @MessagePattern('user.created')
 * async handleUserCreated(data: CreateUserDto) {
 *   this.logger.log('Processing user creation');
 * }
 *
 * @WithContext({ userId: 'user_123' })
 * @Cron('0 0 * * *')
 * async dailyReport() {
 *   this.logger.log('Running daily report');
 * }
 *
 * @WithContext(() => ({ correlationId: uuid(), service: 'UserService' }))
 * @MessagePattern('user.validate')
 * async validateUser(data: ValidateUserDto) {
 *   this.logger.log('Validating user'); // Fresh correlationId each call
 * }
 * ```
 */
export function WithContext(decoratorContext?: Record<string, any> | (() => Record<string, any>)) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const currentContext = ContextStore.getContext();
      
      // Resolve context - call function if provided, otherwise use static object
      const resolvedContext = typeof decoratorContext === 'function' 
        ? decoratorContext() 
        : decoratorContext || {};
      
      const context = {
        ...currentContext,
        ...resolvedContext,
      };

      return runWithCtx(() => {
        return originalMethod.apply(this, args);
      }, context);
    };

    return descriptor;
  };
}
