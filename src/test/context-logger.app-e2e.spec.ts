import { INestApplication, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ContextLoggerModule } from '../context-logger.module';
import { ContextLogger } from '../context-logger';

describe("ContextLogger with full nestjs application", () => {
  let processExitSpy: jest.SpyInstance;
  let processAbortSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let app: INestApplication<any>;

  beforeEach(() => {
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with code: ${code}`);
    });
    processAbortSpy = jest.spyOn(process, 'abort').mockImplementation(() => {
      throw new Error('process.abort called');
    });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    processExitSpy.mockRestore();
    processAbortSpy.mockRestore();

    if (app) {
      await app.close();
      app = null;
    }
  });

  it("should log bootstrap error messages", async () => {
    @Injectable()
    class WontBeIncludedInModuleService {
      something() {

      }
    }

    @Injectable()
    class TestService {
      private readonly logger: ContextLogger = new ContextLogger(TestService.name);

      constructor(private readonly wontBeIncludedInModuleService: WontBeIncludedInModuleService) {}

      someFunction() {
        this.wontBeIncludedInModuleService.something();
        this.logger.log("This is a test message");
      }
    }

    @Module({
      imports: [
        ContextLoggerModule.forRoot({})
      ],
      providers: [TestService],
    })
    class AppModule {}

    const bootstrapLogger = new ContextLogger("Bootstrap");

    try {
      app = await NestFactory.create(AppModule, {
        logger: bootstrapLogger,
        bufferLogs: true
      });
    } catch (error) {
      expect(error.message).toContain("process.abort called");
    }
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Nest can't resolve dependencies of the TestService"));
    expect(processExitSpy).toHaveBeenCalledTimes(1);
    expect(processAbortSpy).toHaveBeenCalledTimes(1);
  });
});