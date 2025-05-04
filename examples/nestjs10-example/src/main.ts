import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ContextLogger } from 'nestjs-context-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const logger = new ContextLogger('Bootstrap');
  logger.log('Application started');
  
  await app.listen(3001);
  console.log('Application started on: http://localhost:3001');
}
bootstrap(); 