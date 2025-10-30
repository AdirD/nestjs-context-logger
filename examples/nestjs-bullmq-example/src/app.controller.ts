import { Controller, Get, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ContextLogger } from 'nestjs-context-logger';

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

@Controller()
export class AppController {
  private readonly logger = new ContextLogger(AppController.name);

  constructor(
    @InjectQueue('email-queue') private emailQueue: Queue,
  ) {}

  @Get()
  getHello(): string {
    this.logger.log('Hello endpoint called');
    return 'BullMQ Example - POST to /add-email-job to add a job to the queue';
  }

  @Post('add-email-job')
  async addEmailJob() {
    const jobData: EmailJobData = {
      to: 'user@example.com',
      subject: 'Welcome!',
      body: 'Welcome to our service',
    };

    await this.emailQueue.add('send-email', jobData);

    this.logger.log('Email job added to queue', { jobData });
    return { message: 'Email job added', jobData };
  }
}

