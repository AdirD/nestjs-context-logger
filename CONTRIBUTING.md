# Contributing to nestjs-context-logger

Thank you for considering contributing to nestjs-context-logger! Whether it's fixing a bug, adding a feature, or improving documentation - all contributions are welcome.

## Quick Start

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Create a branch for your changes
4. Make your changes
5. Run tests: `npm test`
6. Push your changes
7. Open a pull request

## Development Guide

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/nestjs-context-logger.git

# Install dependencies
npm install

# Run tests to verify setup
npm test
```

### Running Tests

```bash
# Run full test suite
npm test

# Run tests in watch mode
npm run test:watch
```

### Testing Your Changes

The best way to test your changes is to use the logger in a real NestJS application. Here's a quick way to do that:

1. Create a new NestJS app:
```bash
nest new test-app
```

2. Link your local nestjs-context-logger:
```bash
# In nestjs-context-logger directory
npm link

# In your test app directory
npm link nestjs-context-logger
```

3. Use it in your test app:
```typescript
import { ContextLoggerModule } from 'nestjs-context-logger';

@Module({
  imports: [ContextLoggerModule],
})
export class AppModule {}
```

### Project Structure

```
src/
├── interfaces/      # TypeScript interfaces
├── interceptors/    # NestJS interceptors
├── store/          # Context storage implementation
└── tests/          # Test files
```

## Guidelines

### When submitting a PR:
- Make sure tests pass
- Add tests if you're adding a feature
- Update README if needed
- Update types if you're changing interfaces

### Commit Messages
We follow basic conventional commits. Start your commit message with one of these:
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `test:` add/modify tests
- `refactor:` code changes that don't fix bugs or add features

Example: `feat: add support for custom serializers`

## Need Help?

- 🐛 [Open an issue](https://github.com/AdirD/nestjs-context-logger/issues)
- 💬 [Start a discussion](https://github.com/AdirD/nestjs-context-logger/discussions)
- 🤝 Ask questions in PRs

Don't worry too much about getting everything perfect. We're happy to help guide you through the process and fix any issues along the way.