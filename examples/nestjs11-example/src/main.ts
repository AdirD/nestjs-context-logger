import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ContextLogger } from 'nestjs-context-logger';

async function bootstrap() {
  const logger = new ContextLogger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: logger,
    bufferLogs: true,
  });
  
  logger.log('Application started');
  
  await app.listen(3000);
  console.log('Application started on: http://localhost:3000');
}
bootstrap(); 