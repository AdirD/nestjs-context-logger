import { ExecutionContext } from '@nestjs/common';


export interface ContextLoggerFactoryOptions {
    debugEndpoints?: string[];
    requestContext?: (context: ExecutionContext) => Record<string, any> | Promise<Record<string, any>>;
    logLevel?: string;
  }
  