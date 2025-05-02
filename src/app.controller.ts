import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  sayHello(@Body() body: { name: string }): string {
    return this.appService.sayHello(body.name);
  }

  @Get('error')
  triggerError(): string {
    throw new Error('Example error');
  }
} 