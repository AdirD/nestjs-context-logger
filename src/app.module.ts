import { Module } from '@nestjs/common';
import { ContextLoggerModule } from 'nestjs-context-logger';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ContextLoggerModule.forRoot({
      pinoHttp: {
        // Simplified config without transport
        level: 'info',
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {} 