import { LogLevel } from '@nestjs/common';

export type Bindings = Record<string, any>;

export interface LogEntry {
  [key: string]: any;
  err?: Error | string;
}

export type LoggerHookKeys = LogLevel | 'all';
