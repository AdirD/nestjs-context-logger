import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ContextLoggerModule } from 'nestjs-context-logger';
import { AppController } from './app.controller';
import { VersionMiddleware } from './middleware/version.middleware';

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
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VersionMiddleware)
      .forRoutes('{*path}');
  }
} 