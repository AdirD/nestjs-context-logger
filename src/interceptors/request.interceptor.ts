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
export class RequestInterceptor implements NestInterceptor {
  private readonly logger = new ContextLogger(RequestInterceptor.name);

  constructor(
    @Inject('CONTEXT_LOGGER_OPTIONS')
    private readonly options: ContextLoggerFactoryOptions
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    if (this.options.exclude?.some(pattern => request.url.indexOf(pattern) === 0)) {
      return next.handle();
    }
    
    const startTime = new Date();

    // Base context
    let enrichContext = {
      requestMethod: request.method,
      requestUrl: request.url,
    };

    // Get custom context from user's enrichContext if provided
    if (this.options.enrichContext) {
      const customContext = await this.options.enrichContext(context);
      enrichContext = {
        ...enrichContext,
        ...customContext,
      };
    }

    ContextLogger.updateContext(enrichContext);

    return next.handle().pipe(
      tap(() => {
        this.logger.debug('Request completed', {
          duration: new Date().getTime() - startTime.getTime(),
        });
      })
    );
  }
}
