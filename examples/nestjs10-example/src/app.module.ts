import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ContextLoggerModule } from 'nestjs-context-logger';
import { AppController } from './app.controller';
import { VersionMiddleware } from './middleware/version.middleware';

@Module({
  controllers: [AppController],
  providers: [],
})
export class ExampleModule implements NestModule {
  configure(consumer: MiddlewareConsumer) { 
    consumer
      .apply(VersionMiddleware)
      .forRoutes('*');
  }
}


@Module({
  imports: [
    ContextLoggerModule.forRoot({
      pinoHttp: {
        // Simplified config without transport
        level: 'info',
      },
    }),
    ExampleModule,
  ],
  providers: [],
})
export class AppModule {} 