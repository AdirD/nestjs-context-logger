import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContextLoggerModule } from 'nestjs-context-logger';
import { AppController } from './app.controller';
import { EmailProcessor } from './processors/email.processor';

@Module({
  imports: [
    ContextLoggerModule.forRoot({
      pinoHttp: {
        level: 'info',
      },
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'email-queue',
    }),
  ],
  controllers: [AppController],
  providers: [EmailProcessor],
})
export class AppModule {}

