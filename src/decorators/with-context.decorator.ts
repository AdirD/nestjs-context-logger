import { runWithCtx } from '../store/context-store';
import { v4 as uuidv4 } from 'uuid';

/**
 * Decorator that initializes context for NestJS handlers.
 * Works with @MessagePattern, @EventPattern, @Cron, and other method decorators.
 *
 * @example
 * ```typescript
 * @WithContext()
 * @MessagePattern('user.created')
 * async handleUserCreated(data: CreateUserDto) {
 *   this.logger.log('Processing user creation'); // Will include correlationId
 * }
 *
 * @WithContext({ userId: 'user_123' })
 * @Cron('0 0 * * *')
 * async dailyReport() {
 *   this.logger.log('Running daily report'); // Will include correlationId and userId
 * }
 * ```
 */
export function WithContext(initialContext?: Record<string, any>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const context = {
        correlationId: uuidv4(),
        ...initialContext,
      };

      return runWithCtx(() => {
        return originalMethod.apply(this, args);
      }, context);
    };

    return descriptor;
  };
}
