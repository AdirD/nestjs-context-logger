import { Controller, Get } from '@nestjs/common';
import { ContextLogger } from 'nestjs-context-logger';

@Controller()
export class AppController {
  private readonly logger = new ContextLogger(AppController.name);

  constructor() {}

  @Get('info')
  getHello(): string {
    this.logger.log('Handling GET request', { endpoint: '/' });
    return 'Hello World';
  }

  @Get('error')
  triggerError(): string {
    try {
      throw new Error('Test error');
    } catch (error) {
      this.logger.error('An error occurred', error as Error, { endpoint: '/error' });
      return 'Error logged';
    }
  }
} 