import { Injectable, NestMiddleware } from '@nestjs/common';
import { runWithCtx } from '../store/context-store';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InitContextMiddleware implements NestMiddleware {
  use(_req: unknown, _res: unknown, next: () => void) {
    runWithCtx(async () => next(), {
      correlationId: uuidv4(),
    });
  }
}