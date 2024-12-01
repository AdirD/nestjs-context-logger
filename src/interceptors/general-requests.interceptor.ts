import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ContextLogger } from '../context-logger';
import { ContextLoggerFactoryOptions } from '../interfaces/context-logger.interface';

@Injectable()
export class GeneralRequestsInterceptor implements NestInterceptor {
  private readonly logger = new ContextLogger(GeneralRequestsInterceptor.name);

  constructor(
    @Inject('CONTEXT_LOGGER_OPTIONS')
    private readonly options: ContextLoggerFactoryOptions
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const startTime = new Date();

    // Base context
    let requestContext = {
      requestMethod: request.method,
      requestUrl: request.url,
    };

    // Get custom context from user's requestContext if provided
    if (this.options.requestContext) {
      const customContext = await this.options.requestContext(context);
      requestContext = {
        ...requestContext,
        ...customContext,
      };
    }

    ContextLogger.updateContext(requestContext);

    return next.handle().pipe(
      tap(() => {
        const endTime = new Date();
        this.logger.debug('Request completed', {
          endTime,
          durationSec: (endTime.getTime() - startTime.getTime()) / 1000,
        });
      })
    );
  }
}
