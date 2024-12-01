import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { runWithCtx } from '../store/context-store';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: FastifyRequest['raw'], _res: FastifyReply['raw'], next: () => void) {
    runWithCtx(async () => next(), {
      correlationId: uuidv4(),
      requestId: req.id as string,
    });
  }
}