# nestjs-context-logger
<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>
<p align="center">🌟 Request-scoped context logging for NestJS powered by <a href="https://github.com/iamolegga/nestjs-pino">nestjs-pino</a> with <strong>DYNAMIC CONTEXT ENRICHING</strong> 🌟</p>
<p align="center">
  <a href="https://www.npmjs.com/package/nestjs-context-logger" target="_blank"><img src="https://img.shields.io/npm/v/nestjs-context-logger" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/nestjs-context-logger" target="_blank"><img src="https://img.shields.io/npm/l/nestjs-context-logger" alt="Package License" /></a>
  <a href="https://www.npmjs.com/package/nestjs-context-logger" target="_blank"><img src="https://img.shields.io/npm/dm/nestjs-context-logger" alt="NPM Downloads" /></a>
  <a href="https://medium.com/elementor-engineers/implement-contextual-logging-in-nestjs-using-asyncstorage-eb228bf00008" target="_blank"><img src="https://img.shields.io/badge/Medium-Read%20Article-black?logo=medium" alt="Medium Article" /></a>
</p>


> 🔍 Ever tried debugging a production issue with logs like `"Error updating user"` but no context about which user, service, or request caused it? **This logger is your solution.** [nestjs-context-logger](https://github.com/AdirD/nestjs-context-logger) — Is a request scoped contextual logging solution for NestJS applications that automatically enriches your logs with request context, correlation IDs, and custom metadata. Designed for NestJS architecture with zero-overhead.



```bash
npm install nestjs-context-logger
```


## Built with:
- 🚀 [nestjs-pino](https://github.com/iamolegga/nestjs-pino) - Platform agnostic logger for NestJS
- ⚡ [Pino](https://github.com/pinojs/pino) - Ultra-fast Node.js logger
- 🔄 [AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage) - Node.js context propagation


## Table of Contents
<details>
<summary>Sections</summary>

- [The Problem](#the-problem)
- [Why nestjs-context-logger?](#why-nestjs-context-logger)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Advanced](#advanced-configuration)
- [Features in Depth](#features-in-depth)
- [Configuration Options](#configuration-options)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Performance Considerations](#performance-considerations)
- [Contributing](#contributing)
- [Support](#support)

</details>

## The Problem

```typescript
// Traditional logging 😢
logger.error('Failed to update user subscription');
// Output: {"level":"error","message":"Failed to update user subscription"}

// With nestjs-context-logger 🎉
logger.error('Failed to update user subscription');
// Output: {
//   "level":"error",
//   "message":"Failed to update user subscription",
//   "correlationId":"d4c3f2b1-a5e6-4c3d-8b9a-1c2d3e4f5g6h",
//   "userId":"user_456",
//   "subscriptionTier":"premium",
//   "service":"SubscriptionService",
//   "requestPath":"/api/subscriptions/update",
//   "duration": 432,
//   "timestamp":"2024-01-01T12:00:00Z"
// }
```

## Why nestjs-context-logger?
- 🎯 **Zero Code Changes Required**: Keep using the familiar NestJS logger interface
- ⚡ **High Performance**: Built on Pino, one of the fastest loggers in the Node.js ecosystem
- 🔄 **Automatic Request Tracking**: Every log entry automatically includes request context
- 📊 **Default Context**: Enriches each request with `correlationId` and `duration`
- 🔍 **Debug Production Issues Faster**: Full context in every log message
- 🚀 **Platform agnostic**: works with `Express` and `Fastify`

More in depth read:
[![Medium Article](https://img.shields.io/badge/Medium-Read%20Article-black?logo=medium)](https://medium.com/elementor-engineers/implement-contextual-logging-in-nestjs-using-asyncstorage-eb228bf00008)


## Installation

```bash
npm install nestjs-context-logger
```

## Quick Start

```typescript
// app.module.ts
import { ContextLoggerModule } from 'nestjs-context-logger';

@Module({
  imports: [
    ContextLoggerModule
  ],
})
export class AppModule {}
```

That's it! Your logs will automatically include the default context of `correlationId` and `duration`.

## Advanced Configuration

### Want more context?

You can enrich your logs with custom context at the application level:

```typescript
@Module({
  imports: [
    ContextLoggerModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
            logLevel: configService.get('LOG_LEVEL'),
            // enrichContext intercepts requests and allows you to enrich the context
            enrichContext: async (context: ExecutionContext) => ({
                userId: context.switchToHttp().getRequest().user?.id,
                tenantId: context.switchToHttp().getRequest().headers['x-tenant-id'],
                environment: configService.get('NODE_ENV'),
            }),
        }),
    });
  ],
})
export class AppModule {}
```

Now every log will include these additional fields:
```typescript
// Output: {
//   "message": "Some log message",
//   "userId": "user_123",
//   "tenantId": "tenant_456",
//   "environment": "production",
//   ...other default fields
// }
```

### Want more control?
Update context from anywhere in the code 🎉. The context persists throughout the entire request execution, making it available to all services and handlers within that request.

For example, set up user context in a guard:

```typescript
@Injectable()
export class ConnectAuthGuard implements CanActivate {
  private readonly logger = new ContextLogger(ConnectAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const connectedUser = await this.authenticate(request);
    // Magic here 👇
    ContextLogger.updateContext({ userId: connectedUser.userId });
    return true;
  }
}
```

The context flows through your entire request chain:

```typescript
@Injectable()
export class PaymentService {
  private readonly logger = new ContextLogger(PaymentService.name);

  async processPayment(paymentData: PaymentDto) {
    this.logger.updateContext({ tier: 'premium' });
    this.logger.info('Processing payment');
    // Output: {
    //   "message": "Processing payment",
    //   "userId": "user_123",  // From AuthGuard
    //   "tier": "premium",     // Added here
    //   ...other context
    // }

    await this.featureService.checkFeatures();
  }
}

@Injectable()
export class FeatureService {
  private readonly logger = new ContextLogger(FeatureService.name);

  async checkFeatures() {
    this.logger.info('Checking features');
    // Output: {
    //   "message": "Checking features",
    //   "userId": "user_123",  // Still here from AuthGuard
    //   "tier": "premium",     // Still here from PaymentService
    //   ...other context
    // }
  }
}
```

## Features in Depth

### 🔄 Automatic Context Injection
- Correlation ID
- Service Name
- Request Duration
- Name, Host, PID

### 🎯 Developer Experience
- Typed Logger (Finally!)
- Familiar NestJS logger interface (Same as `@nestjs/common` default experience)
- Context Isolation via middleware
- Global Request Interceptor for enriching context 

### ⚡ Performance
- Built on [Pino](https://github.com/pinojs/pino) for high-performance logging
- Efficient context storage with `async_hooks` [AsyncLocalStorage](https://nodejs.org/api/async_hooks.html)
- Minimal overhead compared to standard logging

### 🔌 Integration Support (Platform Agnostic)
- [Fastify](https://fastify.dev/) compatible
- [Express](https://expressjs.com/) compatible

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logLevel` | string | 'info' | Log level (debug, info, warn, error) |
| `enrichContext` | Function | ```{ correlationId, duration }``` | Custom context provider |
| `exclude` | string[] | [] | Endpoints to exclude from logging |

## API Reference

### ContextLogger Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `log()` | `(message: string, bindings?: Record<string, any>)` | Log at info level |
| `info()` | `(message: string, bindings?: Record<string, any>)` | Log at info level |
| `error()` | `(message: string, error?: Error, bindings?: Record<string, any>)` | Log at error level |
| `warn()` | `(message: string, bindings?: Record<string, any>)` | Log at warn level |
| `debug()` | `(message: string, bindings?: Record<string, any>)` | Log at debug level |
| `verbose()` | `(message: string, bindings?: Record<string, any>)` | Log at verbose level |
| `updateContext()` | `(context: Record<string, any>)` | Update the context for current request |

## Best Practices

1. **Use Semantic Log Levels**
   ```typescript
   // Good
   logger.debug('Processing started', { itemCount: 42 });
   logger.error('Failed to connect to database', error);

   // Not so good
   logger.log('Something happened');
   ```

2. **Add Contextual Data**
   ```typescript
   // Good
   logger.log('Order processed', {
     orderId: order.id,
     amount: order.total,
     items: order.items.length
   });

   // Not so good
   logger.log('Order processed');
   ```

3. **Prefer Structured Logging**
   ```typescript
   // Good
   logger.info('Item fetched', { id: '1', time: 2000, source: 'serviceA' });

   // Not so good
   logger.info('Item fetched id: 1, time: 2000, source: serviceA');
   ```

## Performance Considerations

This logger uses `AsyncLocalStorage` to maintain context, which does add an overhead.
It's worth noting that `nestjs-pino` already uses local storage [under the hood](https://github.com/iamolegga/nestjs-pino/blob/01fc6739136bb9c1df0f5669f998bbabd82b2a1a/src/storage.ts#L9) for the "name", "host", "pid" metadata it attaches to every request.

Our benchmarks showed a 20-40% increase compared to raw Pino, such that if Pino average is 114ms, then with ALS it's up to 136.8ms. This is a notable overhead, but still significantly faster than Winston or Bunyan. For reference, see Pino's [benchmarks](https://github.com/pinojs/pino/blob/main/docs/benchmarks.md).

While you should consider this overhead for your own application, do remember that the logging is non-blocking, and should not impact service latency, while the benefits of having context in your logs is a game changer.

## Resources (Coming Soon)

- 📘 Documentation
- 🎓 Best Practices Guide
- 📊 Performance Benchmarks
- 🔧 Configuration Guide

## Contributing

Contributions welcome! Read our [contributing guidelines](CONTRIBUTING.md) to get started.

## Support

- 🐛 [Issue Tracker](https://github.com/AdirD/nestjs-context-logger/issues)
- 💬 [Discussions](https://github.com/AdirD/nestjs-context-logger/discussions)

## License

MIT

---

Keywords: nestjs logger, pino logger, fastify logging, nestjs logging, correlation id, request context, microservices logging, structured logging, context logging, distributed tracing, nodejs logging, typescript logger, async context, request tracking
