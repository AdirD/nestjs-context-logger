import { Injectable } from '@nestjs/common';
import { ContextLogger } from 'nestjs-context-logger';

@Injectable()
export class AppService {
  constructor(private readonly logger: ContextLogger) {
    // The ContextLogger is already initialized with the class name
    // You can use it right away
    this.logger.log('AppService initialized');
  }

  getHello(): string {
    this.logger.log('getHello called');
    return 'Hello World!';
  }

  sayHello(name: string): string {
    this.logger.log(`sayHello called with name: ${name}`);
    
    // You can add additional context to log entries
    this.logger.addContext('user', name);
    
    return `Hello ${name}!`;
  }
} 